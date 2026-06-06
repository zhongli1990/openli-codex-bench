"""
Agent loop using Claude Agent SDK.

v0.6.0: Migrated from basic anthropic SDK to claude-agent-sdk.
Supports skills, hooks, and improved streaming.
"""

import json
import os
from typing import Any, AsyncIterator

from .config import WORKSPACES_ROOT, MAX_AGENT_TURNS
from .events import make_event, format_sse
from .skills import load_all_skills, build_system_prompt
from .hooks import pre_tool_use_hook, BLOCKED_BASH_PATTERNS, PATH_ESCAPE_PATTERNS
from .tools import TOOLS, execute_tool

# Try to import claude-agent-sdk, fall back to anthropic if not available
try:
    from claude_agent_sdk import query, ClaudeAgentOptions
    from claude_agent_sdk.types import AssistantMessage, UserMessage, ResultMessage, TextBlock, ToolUseBlock, ToolResultBlock
    USE_AGENT_SDK = True
except ImportError:
    # Fallback to basic anthropic SDK
    import anthropic
    USE_AGENT_SDK = False
    from .config import ANTHROPIC_API_KEY, CLAUDE_MODEL


async def run_agent_loop(
    thread_id: str,
    run_id: str,
    prompt: str,
    working_directory: str
) -> AsyncIterator[str]:
    """Run the agent loop and yield SSE events."""
    seq = 0
    
    # Load skills for this workspace
    skills = load_all_skills(working_directory)
    skill_names = [s["name"] for s in skills]
    
    yield format_sse(make_event(run_id, "run.started", {"threadId": thread_id, "skills": skill_names}, seq))
    seq += 1
    
    # Emit skill activation events
    for skill in skills:
        yield format_sse(make_event(
            run_id,
            "ui.skill.activated",
            {"skillName": skill["name"], "description": skill["description"], "scope": skill["scope"]},
            seq
        ))
        seq += 1
    
    yield format_sse(make_event(run_id, "ui.message.user", {"text": prompt}, seq))
    seq += 1
    
    if USE_AGENT_SDK:
        async for event_str in _run_with_agent_sdk(thread_id, run_id, prompt, working_directory, skills, seq):
            yield event_str
    else:
        async for event_str in _run_with_anthropic_sdk(thread_id, run_id, prompt, working_directory, skills, seq):
            yield event_str


async def _run_with_agent_sdk(
    thread_id: str,
    run_id: str,
    prompt: str,
    working_directory: str,
    skills: list[dict[str, Any]],
    seq: int
) -> AsyncIterator[str]:
    """Run agent loop using Claude Agent SDK."""
    system_prompt = build_system_prompt(skills)
    
    try:
        options = ClaudeAgentOptions(
            cwd=working_directory,
            system_prompt=system_prompt,
            allowed_tools=["Read", "Write", "Bash", "Grep", "Glob", "Edit"],
            permission_mode="acceptEdits",
            max_turns=MAX_AGENT_TURNS,
        )
        
        accumulated_text = ""
        
        async for message in query(prompt=prompt, options=options):
            if isinstance(message, AssistantMessage):
                for block in message.content:
                    if isinstance(block, TextBlock):
                        # Stream text delta
                        text_delta = block.text
                        accumulated_text += text_delta
                        yield format_sse(make_event(
                            run_id,
                            "ui.message.assistant.delta",
                            {"textDelta": text_delta},
                            seq
                        ))
                        seq += 1
                    
                    elif isinstance(block, ToolUseBlock):
                        # Tool call
                        yield format_sse(make_event(
                            run_id,
                            "ui.tool.call",
                            {"toolName": block.name, "toolId": block.id, "input": block.input},
                            seq
                        ))
                        seq += 1
                    
                    elif isinstance(block, ToolResultBlock):
                        # Tool result
                        yield format_sse(make_event(
                            run_id,
                            "ui.tool.result",
                            {"toolName": block.tool_use_id, "output": block.content},
                            seq
                        ))
                        seq += 1
            
            elif isinstance(message, ResultMessage):
                # Final result
                if accumulated_text:
                    yield format_sse(make_event(
                        run_id,
                        "ui.message.assistant.final",
                        {"text": accumulated_text, "format": "markdown"},
                        seq
                    ))
                    seq += 1
        
        yield format_sse(make_event(run_id, "run.completed", {"threadId": thread_id}, seq))
    
    except Exception as e:
        yield format_sse(make_event(run_id, "error", {"message": str(e)}, seq))


async def _run_with_anthropic_sdk(
    thread_id: str,
    run_id: str,
    prompt: str,
    working_directory: str,
    skills: list[dict[str, Any]],
    seq: int
) -> AsyncIterator[str]:
    """Fallback: Run agent loop using basic Anthropic SDK."""
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    system_prompt = build_system_prompt(skills)
    
    messages: list[dict[str, Any]] = [
        {"role": "user", "content": prompt}
    ]
    
    iteration = 0
    
    while iteration < MAX_AGENT_TURNS:
        iteration += 1
        
        # Emit iteration event
        yield format_sse(make_event(
            run_id,
            "ui.iteration",
            {"current": iteration, "max": MAX_AGENT_TURNS},
            seq
        ))
        seq += 1
        
        try:
            with client.messages.stream(
                model=CLAUDE_MODEL,
                max_tokens=4096,
                system=system_prompt,
                messages=messages,
                tools=TOOLS
            ) as stream:
                accumulated_text = ""
                tool_use_blocks: list[dict[str, Any]] = []
                current_tool_input = ""
                current_tool_id = ""
                current_tool_name = ""
                
                for event in stream:
                    if event.type == "content_block_start":
                        if hasattr(event.content_block, "type"):
                            if event.content_block.type == "tool_use":
                                current_tool_id = event.content_block.id
                                current_tool_name = event.content_block.name
                                current_tool_input = ""
                                
                                # Emit tool call start event
                                yield format_sse(make_event(
                                    run_id,
                                    "ui.tool.call.start",
                                    {"toolId": current_tool_id, "toolName": current_tool_name},
                                    seq
                                ))
                                seq += 1
                    
                    elif event.type == "content_block_delta":
                        if hasattr(event.delta, "text"):
                            text_delta = event.delta.text
                            accumulated_text += text_delta
                            yield format_sse(make_event(
                                run_id,
                                "ui.message.assistant.delta",
                                {"textDelta": text_delta},
                                seq
                            ))
                            seq += 1
                        
                        elif hasattr(event.delta, "partial_json"):
                            current_tool_input += event.delta.partial_json
                    
                    elif event.type == "content_block_stop":
                        if current_tool_id and current_tool_name:
                            try:
                                tool_input = json.loads(current_tool_input) if current_tool_input else {}
                            except json.JSONDecodeError:
                                tool_input = {}
                            
                            tool_use_blocks.append({
                                "id": current_tool_id,
                                "name": current_tool_name,
                                "input": tool_input
                            })
                            
                            yield format_sse(make_event(
                                run_id,
                                "ui.tool.call",
                                {"toolId": current_tool_id, "toolName": current_tool_name, "input": tool_input},
                                seq
                            ))
                            seq += 1
                            
                            current_tool_id = ""
                            current_tool_name = ""
                            current_tool_input = ""
                
                final_message = stream.get_final_message()
                stop_reason = final_message.stop_reason
                
                if accumulated_text:
                    yield format_sse(make_event(
                        run_id,
                        "ui.message.assistant.final",
                        {"text": accumulated_text, "format": "markdown"},
                        seq
                    ))
                    seq += 1
                
                if stop_reason == "end_turn" and not tool_use_blocks:
                    yield format_sse(make_event(run_id, "run.completed", {"threadId": thread_id}, seq))
                    return
                
                if stop_reason == "tool_use" or tool_use_blocks:
                    assistant_content: list[dict[str, Any]] = []
                    
                    if accumulated_text:
                        assistant_content.append({"type": "text", "text": accumulated_text})
                    
                    for tool_block in tool_use_blocks:
                        assistant_content.append({
                            "type": "tool_use",
                            "id": tool_block["id"],
                            "name": tool_block["name"],
                            "input": tool_block["input"]
                        })
                    
                    messages.append({"role": "assistant", "content": assistant_content})
                    
                    tool_results: list[dict[str, Any]] = []
                    for tool_block in tool_use_blocks:
                        # Apply pre-tool-use hook
                        hook_result = await pre_tool_use_hook(
                            {"tool_name": tool_block["name"], "tool_input": tool_block["input"]},
                            tool_block["id"],
                            None
                        )
                        
                        if hook_result.get("hookSpecificOutput", {}).get("permissionDecision") == "deny":
                            reason = hook_result["hookSpecificOutput"].get("permissionDecisionReason", "Blocked by hook")
                            result = {"success": False, "error": f"Tool blocked: {reason}"}
                            
                            yield format_sse(make_event(
                                run_id,
                                "ui.tool.blocked",
                                {"toolId": tool_block["id"], "toolName": tool_block["name"], "reason": reason},
                                seq
                            ))
                            seq += 1
                        else:
                            result = execute_tool(
                                tool_block["name"],
                                tool_block["input"],
                                working_directory,
                                WORKSPACES_ROOT
                            )
                        
                        yield format_sse(make_event(
                            run_id,
                            "ui.tool.result",
                            {"toolId": tool_block["id"], "toolName": tool_block["name"], "output": result},
                            seq
                        ))
                        seq += 1
                        
                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": tool_block["id"],
                            "content": json.dumps(result)
                        })
                    
                    messages.append({"role": "user", "content": tool_results})
                else:
                    yield format_sse(make_event(run_id, "run.completed", {"threadId": thread_id}, seq))
                    return
        
        except anthropic.APIError as e:
            yield format_sse(make_event(run_id, "error", {"message": str(e)}, seq))
            return
    
    yield format_sse(make_event(run_id, "error", {"message": "Max iterations reached"}, seq))
