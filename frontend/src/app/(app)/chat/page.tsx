"use client";

import { Suspense, useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useAppContext } from "@/contexts/AppContext";
import { FileBrowser } from "@/components/workspace";

type RunnerType = "codex" | "claude";

type ChatMessage = {
  message_id: string;
  session_id: string;
  run_id: string | null;
  role: "user" | "assistant" | "tool" | "system";
  content: string;
  metadata: {
    tool_name?: string;
    tool_input?: any;
    tool_output?: any;
    tool_id?: string;
    is_blocked?: boolean;
    block_reason?: string;
    skill_name?: string;
    skill_scope?: string;
    skill_description?: string;
  } | null;
  created_at: string;
  isStreaming?: boolean;
};

function ChatPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const {
    workspaces,
    selectedWorkspaceId,
    setSelectedWorkspaceId,
    sessions,
    sessionId,
    setSessionId,
    runnerType,
    setRunnerType,
    chatMessages: messages,
    setChatMessages: setMessages,
    chatStatus: status,
    setChatStatus: setStatus,
    fetchWorkspaces,
    fetchSessions,
    fetchMessages,
  } = useAppContext();
  
  const [inputValue, setInputValue] = useState("");
  const [streamingContent, setStreamingContent] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [showFilesPanel, setShowFilesPanel] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Initialize from URL params (only on first load)
  useEffect(() => {
    const wsParam = searchParams.get("workspace");
    const sessParam = searchParams.get("session");
    if (wsParam && !selectedWorkspaceId) setSelectedWorkspaceId(wsParam);
    if (sessParam && !sessionId) setSessionId(sessParam);
    setInitialized(true);
  }, [searchParams, selectedWorkspaceId, sessionId, setSelectedWorkspaceId, setSessionId]);

  // Update URL when workspace/session changes
  useEffect(() => {
    if (!initialized) return;
    const params = new URLSearchParams();
    if (selectedWorkspaceId) params.set("workspace", selectedWorkspaceId);
    if (sessionId) params.set("session", sessionId);
    const newUrl = params.toString() ? `?${params.toString()}` : "/chat";
    router.replace(newUrl, { scroll: false });
  }, [selectedWorkspaceId, sessionId, initialized, router]);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  useEffect(() => {
    if (selectedWorkspaceId) {
      fetchSessions(selectedWorkspaceId);
      setSessionId(null);
      setMessages([]);
    }
  }, [selectedWorkspaceId, fetchSessions]);

  useEffect(() => {
    if (sessionId) {
      fetchMessages(sessionId);
    }
  }, [sessionId, fetchMessages]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  // Create new session
  async function onCreateSession() {
    if (!selectedWorkspaceId) return;
    setStatus("creating-session");
    try {
      const r = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: selectedWorkspaceId,
          runner_type: runnerType
        })
      });
      if (r.ok) {
        const data = await r.json();
        setSessionId(data.session_id);
        await fetchSessions(selectedWorkspaceId);
        setMessages([]);
      }
    } catch (e) {
      console.error("Failed to create session:", e);
    }
    setStatus("idle");
  }

  // Send message
  async function onSendMessage() {
    if (!sessionId || !inputValue.trim() || status === "running") return;

    const userMessage = inputValue.trim();
    setInputValue("");
    setStatus("running");

    // Optimistically add user message to UI
    const tempUserMsg: ChatMessage = {
      message_id: `temp-${Date.now()}`,
      session_id: sessionId,
      run_id: null,
      role: "user",
      content: userMessage,
      metadata: null,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      // Persist user message
      await fetch(`/api/sessions/${sessionId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "user", content: userMessage })
      });

      // Start the run
      const runRes = await fetch(`/api/sessions/${sessionId}/prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: userMessage })
      });

      if (!runRes.ok) {
        throw new Error("Failed to start run");
      }

      const { run_id } = await runRes.json();

      // Stream events
      setStreamingContent("");
      const eventsRes = await fetch(`/api/runs/${run_id}/events`);
      if (!eventsRes.body) throw new Error("No response body");

      const reader = eventsRes.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantContent = "";
      const toolMessages: ChatMessage[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            const eventType = event.type;

            // Handle different event types
            // === CODEX RUNNER EVENTS ===
            if (eventType === "item.completed" && event.item) {
              const item = event.item;
              // Codex agent_message (final assistant response)
              if (item.type === "agent_message" && item.text) {
                assistantContent = item.text;
                setStreamingContent(assistantContent);
              }
              // Codex command_execution (tool call)
              else if (item.type === "command_execution") {
                toolMessages.push({
                  message_id: `tool-${Date.now()}-${Math.random()}`,
                  session_id: sessionId,
                  run_id: run_id,
                  role: "tool",
                  content: "",
                  metadata: {
                    tool_name: "shell",
                    tool_input: item.command,
                    tool_output: item.aggregated_output || `Exit code: ${item.exit_code}`
                  },
                  created_at: new Date().toISOString()
                });
              }
              // Generic message type
              else if (item.type === "message" && item.content?.[0]?.text) {
                assistantContent = item.content[0].text;
                setStreamingContent(assistantContent);
              }
              // Function call output
              else if (item.type === "function_call_output" || item.type === "tool_result") {
                toolMessages.push({
                  message_id: `tool-${Date.now()}-${Math.random()}`,
                  session_id: sessionId,
                  run_id: run_id,
                  role: "tool",
                  content: "",
                  metadata: {
                    tool_name: item.call_id || "tool",
                    tool_output: item.output
                  },
                  created_at: new Date().toISOString()
                });
              }
            }
            // === CLAUDE RUNNER EVENTS (ui.* format) ===
            else if (eventType === "ui.message.assistant.delta") {
              assistantContent += event.payload?.textDelta || "";
              setStreamingContent(assistantContent);
            }
            else if (eventType === "ui.message.assistant.final") {
              assistantContent = event.payload?.text || assistantContent;
              setStreamingContent(assistantContent);
            }
            else if (eventType === "ui.tool.call" || eventType === "ui.tool.call.start") {
              toolMessages.push({
                message_id: `tool-${Date.now()}-${Math.random()}`,
                session_id: sessionId,
                run_id: run_id,
                role: "tool",
                content: "",
                metadata: {
                  tool_name: event.payload?.toolName || "tool",
                  tool_input: event.payload?.input,
                  tool_id: event.payload?.toolId
                },
                created_at: new Date().toISOString()
              });
            }
            else if (eventType === "ui.tool.result") {
              if (toolMessages.length > 0) {
                const lastTool = toolMessages[toolMessages.length - 1];
                if (lastTool.metadata) {
                  lastTool.metadata.tool_output = event.payload?.output;
                }
              }
            }
            else if (eventType === "ui.tool.blocked") {
              toolMessages.push({
                message_id: `tool-blocked-${Date.now()}-${Math.random()}`,
                session_id: sessionId,
                run_id: run_id,
                role: "tool",
                content: `Blocked: ${event.payload?.reason}`,
                metadata: {
                  tool_name: event.payload?.toolName || "tool",
                  tool_id: event.payload?.toolId,
                  is_blocked: true,
                  block_reason: event.payload?.reason
                },
                created_at: new Date().toISOString()
              });
            }
            else if (eventType === "ui.skill.activated") {
              toolMessages.push({
                message_id: `skill-${Date.now()}-${Math.random()}`,
                session_id: sessionId,
                run_id: run_id,
                role: "system",
                content: `Skill activated: ${event.payload?.skillName}`,
                metadata: {
                  skill_name: event.payload?.skillName,
                  skill_scope: event.payload?.scope,
                  skill_description: event.payload?.description
                },
                created_at: new Date().toISOString()
              });
            }
            else if (eventType === "ui.iteration") {
              // Iteration events are informational, don't add to messages
              // Could be used for progress indicator in UI
            }
            // === GENERIC STREAMING EVENTS ===
            else if (eventType === "response.output_text.delta" || eventType === "message.delta") {
              const delta = event.delta?.text || event.delta?.content || "";
              assistantContent += delta;
              setStreamingContent(assistantContent);
            }
            else if (eventType === "content_block_delta" && event.delta?.type === "text_delta") {
              assistantContent += event.delta.text || "";
              setStreamingContent(assistantContent);
            }
            else if (eventType === "message" && event.role === "assistant") {
              assistantContent = event.content || assistantContent;
              setStreamingContent(assistantContent);
            }
            else if (eventType === "response.output_item.done") {
              const item = event.item;
              if (item?.type === "message" && item?.content?.[0]?.text) {
                assistantContent = item.content[0].text;
              }
            }
            // === STANDALONE TOOL EVENTS ===
            else if (eventType === "command_execution") {
              toolMessages.push({
                message_id: `tool-${Date.now()}-${Math.random()}`,
                session_id: sessionId,
                run_id: run_id,
                role: "tool",
                content: "",
                metadata: {
                  tool_name: "shell",
                  tool_input: event.command,
                  tool_output: event.output
                },
                created_at: new Date().toISOString()
              });
            }
            else if (eventType === "tool_use" || eventType === "tool_call") {
              toolMessages.push({
                message_id: `tool-${Date.now()}-${Math.random()}`,
                session_id: sessionId,
                run_id: run_id,
                role: "tool",
                content: "",
                metadata: {
                  tool_name: event.name || event.tool?.name || "tool",
                  tool_input: event.input || event.tool?.input
                },
                created_at: new Date().toISOString()
              });
            }
            else if (eventType === "tool_result") {
              if (toolMessages.length > 0) {
                const lastTool = toolMessages[toolMessages.length - 1];
                if (lastTool.metadata) {
                  lastTool.metadata.tool_output = event.content || event.output;
                }
              }
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }

      // Finalize assistant message
      setStreamingContent("");
      if (assistantContent) {
        const assistantMsg: ChatMessage = {
          message_id: `assistant-${Date.now()}`,
          session_id: sessionId,
          run_id: run_id,
          role: "assistant",
          content: assistantContent,
          metadata: null,
          created_at: new Date().toISOString()
        };

        // Add tool messages and assistant message
        setMessages(prev => [...prev, ...toolMessages, assistantMsg]);

        // Persist assistant message
        await fetch(`/api/sessions/${sessionId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role: "assistant",
            content: assistantContent,
            run_id: run_id
          })
        });

        // Persist tool messages
        for (const toolMsg of toolMessages) {
          await fetch(`/api/sessions/${sessionId}/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              role: "tool",
              content: toolMsg.metadata?.tool_name || "tool",
              run_id: run_id,
              metadata: toolMsg.metadata
            })
          });
        }
      }
    } catch (e) {
      console.error("Failed to send message:", e);
      setMessages(prev => [...prev, {
        message_id: `error-${Date.now()}`,
        session_id: sessionId,
        run_id: null,
        role: "system",
        content: `Error: ${e instanceof Error ? e.message : "Unknown error"}`,
        metadata: null,
        created_at: new Date().toISOString()
      }]);
    }

    setStatus("idle");
    inputRef.current?.focus();
  }

  // Handle Enter key
  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  }

  const selectedWorkspace = workspaces.find(w => w.workspace_id === selectedWorkspaceId);
  const selectedSession = sessions.find(s => s.session_id === sessionId);

  return (
    <div className="flex h-screen bg-zinc-50">
      {/* Left Sidebar */}
      <div className="w-72 border-r border-zinc-200 bg-white flex flex-col">
        {/* Workspace Selector */}
        <div className="p-4 border-b border-zinc-200">
          <label className="block text-xs font-medium text-zinc-500 mb-1">Workspace</label>
          <select
            value={selectedWorkspaceId || ""}
            onChange={(e) => setSelectedWorkspaceId(e.target.value || null)}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm bg-white"
          >
            <option value="">Select workspace...</option>
            {workspaces.map((w) => (
              <option key={w.workspace_id} value={w.workspace_id}>
                {w.display_name}
              </option>
            ))}
          </select>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-zinc-500">Sessions</span>
            {selectedWorkspaceId && (
              <button
                onClick={onCreateSession}
                disabled={status === "creating-session"}
                className="text-xs px-2 py-1 rounded bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                + New
              </button>
            )}
          </div>

          {!selectedWorkspaceId ? (
            <p className="text-xs text-zinc-400">Select a workspace first</p>
          ) : sessions.length === 0 ? (
            <p className="text-xs text-zinc-400">No sessions yet</p>
          ) : (
            <div className="space-y-1">
              {sessions.map((s) => (
                <button
                  key={s.session_id}
                  onClick={() => setSessionId(s.session_id)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    sessionId === s.session_id
                      ? "bg-blue-100 text-blue-800 border border-blue-200"
                      : "bg-zinc-50 hover:bg-zinc-100 text-zinc-700"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      s.runner_type === "claude" ? "bg-orange-400" : "bg-green-400"
                    }`} />
                    <span className="font-medium capitalize">{s.runner_type}</span>
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5">
                    {s.run_count} runs • {new Date(s.created_at).toLocaleDateString()}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Runner Selector */}
        {selectedWorkspaceId && !sessionId && (
          <div className="p-4 border-t border-zinc-200">
            <label className="block text-xs font-medium text-zinc-500 mb-1">Runner</label>
            <select
              value={runnerType}
              onChange={(e) => setRunnerType(e.target.value as RunnerType)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm bg-white"
            >
              <option value="codex">Codex (OpenAI)</option>
              <option value="claude">Claude (Anthropic)</option>
            </select>
          </div>
        )}

        {/* Files Panel Toggle */}
        {selectedWorkspaceId && (
          <div className="border-t border-zinc-200">
            <button
              onClick={() => setShowFilesPanel(!showFilesPanel)}
              className="w-full p-3 flex items-center justify-between text-sm text-zinc-600 hover:bg-zinc-50"
            >
              <span className="flex items-center gap-2">
                📁 Files
              </span>
              <span>{showFilesPanel ? "▼" : "▶"}</span>
            </button>
            {showFilesPanel && (
              <div className="p-3 pt-0 max-h-64 overflow-y-auto">
                <FileBrowser workspaceId={selectedWorkspaceId} compact={true} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-14 border-b border-zinc-200 bg-white px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-zinc-900">Chat</h1>
            {selectedWorkspace && (
              <span className="text-sm text-zinc-500">
                {selectedWorkspace.display_name}
              </span>
            )}
            {selectedSession && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                selectedSession.runner_type === "claude"
                  ? "bg-orange-100 text-orange-700"
                  : "bg-green-100 text-green-700"
              }`}>
                {selectedSession.runner_type}
              </span>
            )}
          </div>
          {status === "running" && (
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
              </div>
              <span className="text-xs text-blue-700">Agent is thinking...</span>
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6">
          {!sessionId ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-4">💬</div>
                <h2 className="text-xl font-semibold text-zinc-700 mb-2">
                  Start a Conversation
                </h2>
                <p className="text-sm text-zinc-500 max-w-md">
                  Select a workspace and create a new session to begin chatting with the AI agent.
                </p>
              </div>
            </div>
          ) : messages.length === 0 && !streamingContent && status !== "running" ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl mb-4">🚀</div>
                <h2 className="text-lg font-semibold text-zinc-700 mb-2">
                  Ready to assist
                </h2>
                <p className="text-sm text-zinc-500">
                  Type a message below to start the conversation.
                </p>
              </div>
            </div>
          ) : messages.length === 0 && status === "running" ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-3xl mb-4">
                  <span className="animate-bounce" style={{ animationDelay: "0ms" }}>🤖</span>
                  <span className="animate-bounce" style={{ animationDelay: "150ms" }}>💭</span>
                  <span className="animate-bounce" style={{ animationDelay: "300ms" }}>⚡</span>
                </div>
                <h2 className="text-lg font-semibold text-zinc-700 mb-2">
                  Agent is thinking...
                </h2>
                <p className="text-sm text-zinc-500">
                  Processing your request. This may take a moment.
                </p>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-4">
              {messages.map((msg) => (
                <MessageBubble key={msg.message_id} message={msg} />
              ))}
              {streamingContent && (
                <MessageBubble
                  message={{
                    message_id: "streaming",
                    session_id: sessionId,
                    run_id: null,
                    role: "assistant",
                    content: streamingContent,
                    metadata: null,
                    created_at: new Date().toISOString(),
                    isStreaming: true
                  }}
                />
              )}
              {status === "running" && !streamingContent && (
                <div className="flex items-center gap-3 p-4 bg-zinc-50 rounded-lg border border-zinc-200">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                  </div>
                  <span className="text-sm text-zinc-600">Agent is working on your request...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        {sessionId && (
          <div className="border-t border-zinc-200 bg-white p-4">
            <div className="max-w-3xl mx-auto">
              <div className="flex gap-3">
                <textarea
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setInputValue(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
                  className="flex-1 resize-none rounded-lg border border-zinc-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                  disabled={status === "running"}
                />
                <button
                  onClick={onSendMessage}
                  disabled={!inputValue.trim() || status === "running"}
                  className="px-6 py-3 rounded-lg bg-zinc-900 text-white font-medium hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {status === "running" ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    </span>
                  ) : (
                    "Send"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Message Bubble Component
function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const isTool = message.role === "tool";
  const isSystem = message.role === "system";

  if (isTool) {
    return (
      <div className="mx-8 my-2">
        <details className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
          <summary className="cursor-pointer font-medium text-amber-800 flex items-center gap-2">
            <span className="text-amber-600">🔧</span>
            {message.metadata?.tool_name || "Tool"}
          </summary>
          <div className="mt-2 space-y-2">
            {message.metadata?.tool_input && (
              <div>
                <div className="text-xs font-medium text-amber-700 mb-1">Input:</div>
                <pre className="bg-amber-100 rounded p-2 text-xs overflow-x-auto font-mono">
                  {typeof message.metadata.tool_input === "string"
                    ? message.metadata.tool_input
                    : JSON.stringify(message.metadata.tool_input, null, 2)}
                </pre>
              </div>
            )}
            {message.metadata?.tool_output && (
              <div>
                <div className="text-xs font-medium text-amber-700 mb-1">Output:</div>
                <pre className="bg-amber-100 rounded p-2 text-xs overflow-x-auto font-mono max-h-40">
                  {typeof message.metadata.tool_output === "string"
                    ? message.metadata.tool_output
                    : JSON.stringify(message.metadata.tool_output, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </details>
      </div>
    );
  }

  if (isSystem) {
    return (
      <div className="mx-8 my-2 text-center">
        <span className="inline-block px-3 py-1 bg-red-50 border border-red-200 rounded-full text-xs text-red-700">
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-blue-600 text-white"
            : "bg-white border border-zinc-200 text-zinc-900"
        }`}
      >
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="prose prose-sm max-w-none prose-zinc">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ node, inline, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || "");
                  return !inline && match ? (
                    <SyntaxHighlighter
                      style={oneDark}
                      language={match[1]}
                      PreTag="div"
                      className="rounded-lg text-sm"
                      {...props}
                    >
                      {String(children).replace(/\n$/, "")}
                    </SyntaxHighlighter>
                  ) : (
                    <code className="bg-zinc-100 px-1 py-0.5 rounded text-sm" {...props}>
                      {children}
                    </code>
                  );
                }
              }}
            >
              {message.content}
            </ReactMarkdown>
            {message.isStreaming && (
              <span className="inline-block w-2 h-4 bg-zinc-400 animate-pulse ml-1" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="text-zinc-500">Loading...</div></div>}>
      <ChatPageContent />
    </Suspense>
  );
}
