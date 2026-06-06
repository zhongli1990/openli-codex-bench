"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAppContext } from "@/contexts/AppContext";
import { FileBrowser, UploadModal } from "@/components/workspace";
import { getToken } from "@/lib/auth";

type RunnerType = "codex" | "claude" | "gemini" | "azure" | "bedrock" | "openli" | "custom";

// Runner configuration with availability status
const RUNNERS = [
  { value: "claude", label: "Claude Agent", available: true },
  { value: "codex", label: "OpenAI Agent", available: true },
  { value: "gemini", label: "Gemini Agent", available: false },
  { value: "azure", label: "Azure OpenAI", available: false },
  { value: "bedrock", label: "AWS Bedrock", available: false },
  { value: "openli", label: "OpenLI Agent", available: false },
  { value: "custom", label: "Custom Agent", available: false },
] as const;

type EventLine = {
  at: number;
  data: any;
};

type TranscriptMessage = {
  role: "user" | "assistant" | "tool" | "system";
  content: string;
  toolName?: string;
  toolInput?: any;
  toolOutput?: any;
  toolId?: string;
  isBlocked?: boolean;
  skillName?: string;
  skillScope?: string;
  iteration?: { current: number; max: number };
};

type Run = {
  run_id: string;
  session_id: string;
  prompt: string;
  status: string;
  created_at: string;
  completed_at: string | null;
};

type Session = {
  session_id: string;
  workspace_id: string;
  runner_type: RunnerType;
  thread_id: string;
  created_at: string;
  run_count: number;
};

type DiscoveredFolder = {
  folder_name: string;
  path: string;
  has_git: boolean;
  git_remote: string | null;
  suggested_name: string;
};

function CodexPageContent() {
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
    codexEvents: events,
    setCodexEvents: setEvents,
    codexStatus: status,
    setCodexStatus: setStatus,
    codexRunId: runId,
    setCodexRunId: setRunId,
    fetchWorkspaces,
    fetchSessions,
  } = useAppContext();
  
  const [runs, setRuns] = useState<Run[]>([]);
  const [showImportForm, setShowImportForm] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [discoveredFolders, setDiscoveredFolders] = useState<DiscoveredFolder[]>([]);
  const [selectedFolders, setSelectedFolders] = useState<Set<string>>(new Set());
  const [folderNames, setFolderNames] = useState<Record<string, string>>({});
  const [repoUrl, setRepoUrl] = useState("");
  const [prompt, setPrompt] = useState("");
  const [viewMode, setViewMode] = useState<"transcript" | "raw" | "files">("transcript");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [controlsCollapsed, setControlsCollapsed] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const [streamingText, setStreamingText] = useState("");
  const [activeToolCall, setActiveToolCall] = useState<{name: string; input?: any} | null>(null);

  // Template picker state
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [availableTemplates, setAvailableTemplates] = useState<{id: string; name: string; category: string; variables: any[]; template_body: string; sample_values: Record<string, string>}[]>([]);
  const [showTemplateVarModal, setShowTemplateVarModal] = useState<{id: string; name: string; variables: any[]; template_body: string; sample_values: Record<string, string>} | null>(null);
  const [templateVarValues, setTemplateVarValues] = useState<Record<string, string>>({});

  // Initialize from URL params (only on first load)
  useEffect(() => {
    const wsParam = searchParams.get("workspace");
    const sessParam = searchParams.get("session");
    if (wsParam && !selectedWorkspaceId) setSelectedWorkspaceId(wsParam);
    if (sessParam && !sessionId) setSessionId(sessParam);
    // Pick up prefilled prompt from Prompts page
    const prefill = sessionStorage.getItem("prefill-prompt");
    if (prefill) {
      setPrompt(prefill);
      sessionStorage.removeItem("prefill-prompt");
    }
    setInitialized(true);
  }, [searchParams, selectedWorkspaceId, sessionId, setSelectedWorkspaceId, setSessionId]);

  // Update URL when workspace/session changes
  useEffect(() => {
    if (!initialized) return;
    const params = new URLSearchParams();
    if (selectedWorkspaceId) params.set("workspace", selectedWorkspaceId);
    if (sessionId) params.set("session", sessionId);
    const newUrl = params.toString() ? `?${params.toString()}` : "/codex";
    router.replace(newUrl, { scroll: false });
  }, [selectedWorkspaceId, sessionId, initialized, router]);

  // Fetch available prompt templates for the picker
  const fetchTemplates = useCallback(async () => {
    try {
      const token = getToken();
      const res = await fetch("/api/prompt-manager/templates?status=published&limit=50", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setAvailableTemplates(data.items || []);
      }
    } catch (e) {
      // Silently fail - template picker is optional
      console.debug("Template picker: service unavailable");
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleSelectTemplate = (t: typeof availableTemplates[0]) => {
    setTemplatePickerOpen(false);
    if (t.variables && t.variables.length > 0) {
      // Has variables - show fill modal
      const initial: Record<string, string> = {};
      for (const v of t.variables) {
        initial[v.name] = t.sample_values?.[v.name] || v.default || "";
      }
      setTemplateVarValues(initial);
      setShowTemplateVarModal(t);
    } else {
      // No variables - insert directly
      setPrompt(t.template_body);
    }
  };

  const handleApplyTemplateVars = () => {
    if (!showTemplateVarModal) return;
    let rendered = showTemplateVarModal.template_body;
    for (const [k, v] of Object.entries(templateVarValues)) {
      rendered = rendered.replaceAll(`{{${k}}}`, v);
    }
    setPrompt(rendered);
    setShowTemplateVarModal(null);
    setTemplatePickerOpen(false);
  };

  const fetchRuns = useCallback(async (sessionId: string) => {
    try {
      const r = await fetch(`/api/sessions/${sessionId}/runs`);
      if (r.ok) {
        const data = await r.json();
        setRuns(data.items || []);
      }
    } catch (e) {
      console.error("Failed to fetch runs:", e);
    }
  }, []);

  const loadRunDetail = useCallback(async (runIdToLoad: string) => {
    try {
      setStatus("loading");
      const r = await fetch(`/api/runs/${runIdToLoad}/detail`);
      if (r.ok) {
        const data = await r.json();
        setPrompt(data.prompt);
        setRunId(runIdToLoad);
        setEvents(data.events || []);
        setStatus("completed");
      } else {
        setStatus("error: failed to load run");
      }
    } catch (e) {
      console.error("Failed to load run detail:", e);
      setStatus("error: failed to load run");
    }
  }, [setRunId, setEvents, setStatus]);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  useEffect(() => {
    if (selectedWorkspaceId) {
      fetchSessions(selectedWorkspaceId);
    }
  }, [selectedWorkspaceId, fetchSessions]);

  useEffect(() => {
    if (sessionId) {
      fetchRuns(sessionId);
      // Note: Runner type is set explicitly in onContinueSession, not here
      // This prevents overwriting user's dropdown selection on page load
    } else {
      setRuns([]);
    }
  }, [sessionId, fetchRuns]);

  const eventsText = useMemo(() => {
    return events
      .map((e: EventLine) => `${new Date(e.at).toISOString()} ${JSON.stringify(e.data, null, 2)}`)
      .join("\n\n");
  }, [events]);

  const transcript = useMemo(() => {
    const messages: TranscriptMessage[] = [];
    let currentAssistantText = "";

    for (const event of events) {
      const data = event.data;
      if (!data || typeof data !== "object") continue;

      const eventType = data.type || "";

      // Handle Codex runner events
      if (eventType === "item.completed" && data.item) {
        const item = data.item;
        if (item.type === "command_execution") {
          messages.push({
            role: "tool",
            content: item.status === "completed" ? "Command executed" : "Command failed",
            toolName: "shell",
            toolInput: item.command,
            toolOutput: item.aggregated_output || `Exit code: ${item.exit_code}`
          });
        } else if (item.type === "agent_message" || item.text) {
          messages.push({ role: "assistant", content: item.text || "" });
        }
      } else if (eventType === "item.completed" && data.item?.type === "agent_message") {
        messages.push({ role: "assistant", content: data.item.text || "" });
      }

      // Handle agent_message directly (for final responses)
      if (eventType === "item.completed" && data.item?.type === "agent_message") {
        // Already handled above
      }

      // Handle Claude runner events (ui.* format)
      if (eventType === "ui.message.user") {
        messages.push({ role: "user", content: data.payload?.text || "" });
      } else if (eventType === "ui.message.assistant.delta") {
        currentAssistantText += data.payload?.textDelta || "";
      } else if (eventType === "ui.message.assistant.final") {
        messages.push({ role: "assistant", content: data.payload?.text || currentAssistantText });
        currentAssistantText = "";
      } else if (eventType === "ui.tool.call" || eventType === "ui.tool.call.start") {
        messages.push({
          role: "tool",
          content: `Calling ${data.payload?.toolName}`,
          toolName: data.payload?.toolName,
          toolId: data.payload?.toolId,
          toolInput: data.payload?.input
        });
      } else if (eventType === "ui.tool.result") {
        messages.push({
          role: "tool",
          content: `Result from ${data.payload?.toolName}`,
          toolName: data.payload?.toolName,
          toolId: data.payload?.toolId,
          toolOutput: data.payload?.output
        });
      } else if (eventType === "ui.tool.blocked") {
        messages.push({
          role: "tool",
          content: `Blocked: ${data.payload?.reason}`,
          toolName: data.payload?.toolName,
          toolId: data.payload?.toolId,
          isBlocked: true
        });
      } else if (eventType === "ui.skill.activated") {
        messages.push({
          role: "system",
          content: `Skill activated: ${data.payload?.skillName}`,
          skillName: data.payload?.skillName,
          skillScope: data.payload?.scope
        });
      } else if (eventType === "ui.iteration") {
        messages.push({
          role: "system",
          content: `Iteration ${data.payload?.current}/${data.payload?.max}`,
          iteration: { current: data.payload?.current, max: data.payload?.max }
        });
      }
    }

    if (currentAssistantText) {
      messages.push({ role: "assistant", content: currentAssistantText });
    }

    return messages;
  }, [events]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  async function onImportWorkspace() {
    if (!repoUrl) return;
    setStatus("importing");

    const r = await fetch("/api/workspaces/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source_type: "github", source_uri: repoUrl })
    });

    if (!r.ok) {
      setStatus(`error: ${await r.text()}`);
      return;
    }

    const data = await r.json();
    setSelectedWorkspaceId(data.workspace_id);
    setShowImportForm(false);
    setRepoUrl("");
    setStatus("idle");
    await fetchWorkspaces();
  }

  async function onScanLocal() {
    setStatus("scanning");
    try {
      const r = await fetch("/api/workspaces/scan");
      if (r.ok) {
        const data = await r.json();
        setDiscoveredFolders(data.discovered || []);
        const names: Record<string, string> = {};
        for (const f of data.discovered || []) {
          names[f.folder_name] = f.suggested_name;
        }
        setFolderNames(names);
        setSelectedFolders(new Set((data.discovered || []).map((f: DiscoveredFolder) => f.folder_name)));
        setShowScanModal(true);
      }
    } catch (e) {
      console.error("Failed to scan:", e);
    }
    setStatus("idle");
  }

  async function onImportSelectedFolders() {
    setStatus("importing");
    for (const folderName of selectedFolders) {
      const displayName = folderNames[folderName] || folderName;
      try {
        await fetch("/api/workspaces/import-local", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ folder_name: folderName, display_name: displayName })
        });
      } catch (e) {
        console.error(`Failed to import ${folderName}:`, e);
      }
    }
    setShowScanModal(false);
    setDiscoveredFolders([]);
    setSelectedFolders(new Set());
    setStatus("idle");
    await fetchWorkspaces();
  }

  function toggleFolderSelection(folderName: string) {
    setSelectedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderName)) {
        next.delete(folderName);
      } else {
        next.add(folderName);
      }
      return next;
    });
  }

  async function onCreateSession() {
    if (!selectedWorkspaceId) return;
    setStatus("creating-session");
    setEvents([]);
    setRunId(null);

    const r = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspace_id: selectedWorkspaceId, runner_type: runnerType })
    });

    if (!r.ok) {
      setStatus(`error: ${await r.text()}`);
      return;
    }

    const data = await r.json();
    setSessionId(data.session_id);
    setStatus("session-ready");
    if (selectedWorkspaceId) {
      await fetchSessions(selectedWorkspaceId);
    }
  }

  async function onContinueSession(session: Session) {
    setSessionId(session.session_id);
    setRunnerType(session.runner_type);
    setEvents([]);
    setRunId(null);
    setStatus("session-ready");
  }

  async function onDeleteWorkspace() {
    if (!selectedWorkspaceId) return;
    setStatus("deleting");
    try {
      const r = await fetch(`/api/workspaces/${selectedWorkspaceId}`, {
        method: "DELETE"
      });
      if (r.ok) {
        setSelectedWorkspaceId(null);
        setSessionId(null);
        setEvents([]);
        setRunId(null);
        setStatus("idle");
        setPrompt("");
        setShowDeleteConfirm(false);
        await fetchWorkspaces();
      } else {
        setStatus(`error: ${await r.text()}`);
      }
    } catch (e) {
      console.error("Failed to delete workspace:", e);
      setStatus("error: failed to delete");
    }
  }

  // Cleanup EventSource on unmount to prevent leaks
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  // Persist runId to sessionStorage so it survives hard refresh
  useEffect(() => {
    if (runId) {
      sessionStorage.setItem("codex-active-run", runId);
    }
  }, [runId]);

  // On mount: recover active run from sessionStorage if context was lost
  useEffect(() => {
    if (!runId && status === "idle") {
      const savedRunId = sessionStorage.getItem("codex-active-run");
      if (savedRunId) {
        setRunId(savedRunId);
        setStatus("running");
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recover session: if status is running but no EventSource, reconnect to live stream
  // The runner buffers all events, so reconnecting replays everything + gets live updates
  useEffect(() => {
    if (status === "running" && !eventSourceRef.current && runId) {
      // Try to reconnect to the live SSE stream (runner replays buffered events)
      const es = new EventSource(`/api/runs/${runId}/events`);
      eventSourceRef.current = es;
      let reconnectedText = "";

      es.onmessage = (msg) => {
        try {
          const parsed = JSON.parse(msg.data);
          setEvents((prev: EventLine[]) => [...prev, { at: Date.now(), data: parsed }]);

          if (parsed.type === "ui.message.assistant.delta") {
            reconnectedText += parsed.payload?.textDelta || "";
            setStreamingText(reconnectedText);
          } else if (parsed.type === "ui.message.assistant.final") {
            setStreamingText("");
            setActiveToolCall(null);
            reconnectedText = "";
          } else if (parsed.type === "ui.tool.call" || parsed.type === "ui.tool.call.start") {
            setActiveToolCall({ name: parsed.payload?.toolName || "tool", input: parsed.payload?.input });
            setStreamingText("");
          } else if (parsed.type === "ui.tool.result") {
            setActiveToolCall(null);
          } else if (parsed.type === "run.completed" || parsed.type === "stream.closed") {
            setStatus("completed");
            setStreamingText("");
            setActiveToolCall(null);
            sessionStorage.removeItem("codex-active-run");
            es.close();
            eventSourceRef.current = null;
          } else if (parsed.type === "error") {
            setStatus(`error: ${parsed.payload?.message || parsed.message || "unknown"}`);
            setStreamingText("");
            setActiveToolCall(null);
            sessionStorage.removeItem("codex-active-run");
            es.close();
            eventSourceRef.current = null;
          }
        } catch {}
      };

      es.onerror = () => {
        es.close();
        eventSourceRef.current = null;
        // Fallback: try to load completed events from DB
        (async () => {
          try {
            const r = await fetch(`/api/runs/${runId}/detail`);
            if (r.ok) {
              const data = await r.json();
              if (data.events && data.events.length > 0) {
                setEvents(data.events);
                setStatus("completed");
              } else {
                setStatus("stream-closed");
              }
            } else {
              setStatus("stream-closed");
            }
          } catch {
            setStatus("stream-closed");
          }
          setStreamingText("");
          setActiveToolCall(null);
          sessionStorage.removeItem("codex-active-run");
        })();
      };
    }
  }, [status, runId, setEvents, setStatus]);

  async function onRunPrompt() {
    if (!sessionId) return;

    // Close any existing EventSource
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setStatus("running");
    setEvents([]);
    setStreamingText("");
    setActiveToolCall(null);

    // Persist user message to database
    await fetch(`/api/sessions/${sessionId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "user", content: prompt })
    });

    const r = await fetch(`/api/sessions/${sessionId}/prompt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });

    if (!r.ok) {
      setStatus(`error: ${await r.text()}`);
      return;
    }

    const data = await r.json();
    const nextRunId = data.run_id;
    setRunId(nextRunId);

    let assistantContent = "";
    const toolMessages: Array<{ role: string; content: string; metadata?: any }> = [];

    const es = new EventSource(`/api/runs/${nextRunId}/events`);
    eventSourceRef.current = es;
    es.onmessage = (msg) => {
      try {
        const parsed = JSON.parse(msg.data);
        setEvents((prev: EventLine[]) => [...prev, { at: Date.now(), data: parsed }]);

        // === Codex SDK events: item.started / item.updated / item.completed ===
        if (parsed.type === "item.started" && parsed.item) {
          const item = parsed.item;
          if (item.type === "reasoning") {
            setStreamingText(item.text || "");
          } else if (item.type === "command_execution") {
            setActiveToolCall({ name: "shell", input: item.command });
            setStreamingText("");
          } else if (item.type === "file_change") {
            const files = (item.changes || []).map((c: any) => `${c.kind}: ${c.path}`).join(", ");
            setActiveToolCall({ name: "file_edit", input: files });
            setStreamingText("");
          } else if (item.type === "mcp_tool_call") {
            setActiveToolCall({ name: `${item.server}/${item.tool}`, input: item.arguments });
            setStreamingText("");
          } else if (item.type === "todo_list") {
            const plan = (item.items || []).map((t: any) => `${t.completed ? "✅" : "⬜"} ${t.text}`).join("\n");
            setStreamingText(plan);
          } else if (item.type === "agent_message") {
            setStreamingText(item.text || "");
          }
        } else if (parsed.type === "item.updated" && parsed.item) {
          const item = parsed.item;
          if (item.type === "command_execution") {
            setActiveToolCall({ name: "shell", input: item.command });
            if (item.aggregated_output) {
              setStreamingText(item.aggregated_output.slice(-2000));
            }
          } else if (item.type === "reasoning") {
            setStreamingText(item.text || "");
          } else if (item.type === "agent_message") {
            setStreamingText(item.text || "");
          } else if (item.type === "todo_list") {
            const plan = (item.items || []).map((t: any) => `${t.completed ? "✅" : "⬜"} ${t.text}`).join("\n");
            setStreamingText(plan);
          }
        } else if (parsed.type === "item.completed" && parsed.item) {
          const item = parsed.item;
          if (item.type === "agent_message" && item.text) {
            assistantContent = item.text;
            setStreamingText("");
            setActiveToolCall(null);
          } else if (item.type === "command_execution") {
            setActiveToolCall(null);
            setStreamingText("");
            toolMessages.push({
              role: "tool",
              content: "shell",
              metadata: {
                tool_name: "shell",
                tool_input: item.command,
                tool_output: item.aggregated_output || `Exit code: ${item.exit_code}`
              }
            });
          } else if (item.type === "file_change") {
            setActiveToolCall(null);
            setStreamingText("");
            toolMessages.push({
              role: "tool",
              content: "file_edit",
              metadata: {
                tool_name: "file_edit",
                tool_input: (item.changes || []).map((c: any) => `${c.kind}: ${c.path}`).join("\n"),
                tool_output: `Status: ${item.status}`
              }
            });
          } else if (item.type === "mcp_tool_call") {
            setActiveToolCall(null);
            setStreamingText("");
            toolMessages.push({
              role: "tool",
              content: item.tool || "mcp_tool",
              metadata: {
                tool_name: `${item.server}/${item.tool}`,
                tool_input: item.arguments,
                tool_output: item.result || item.error?.message || "completed"
              }
            });
          } else if (item.type === "reasoning" || item.type === "todo_list") {
            setStreamingText("");
          }
        // === Claude runner events: ui.message.* / ui.tool.* ===
        } else if (parsed.type === "ui.message.assistant.delta") {
          // Show streaming text in real-time
          setStreamingText(prev => prev + (parsed.payload?.textDelta || ""));
        } else if (parsed.type === "ui.message.assistant.final") {
          assistantContent = parsed.payload?.text || assistantContent;
          setStreamingText("");
          setActiveToolCall(null);
        } else if (parsed.type === "ui.tool.call" || parsed.type === "ui.tool.call.start") {
          setActiveToolCall({ name: parsed.payload?.toolName || "tool", input: parsed.payload?.input });
          setStreamingText("");
        } else if (parsed.type === "ui.tool.result") {
          setActiveToolCall(null);
          toolMessages.push({
            role: "tool",
            content: parsed.payload?.toolName || "tool",
            metadata: {
              tool_name: parsed.payload?.toolName,
              tool_output: parsed.payload?.output
            }
          });
        }

        if (parsed.type === "run.completed" || parsed.type === "stream.closed") {
          setStatus("completed");
          setStreamingText("");
          setActiveToolCall(null);
          sessionStorage.removeItem("codex-active-run");
          es.close();
          eventSourceRef.current = null;
          
          // Persist assistant and tool messages to database
          (async () => {
            for (const toolMsg of toolMessages) {
              await fetch(`/api/sessions/${sessionId}/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  role: toolMsg.role,
                  content: toolMsg.content,
                  run_id: nextRunId,
                  metadata: toolMsg.metadata
                })
              });
            }
            if (assistantContent) {
              await fetch(`/api/sessions/${sessionId}/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  role: "assistant",
                  content: assistantContent,
                  run_id: nextRunId
                })
              });
            }
          })();
        } else if (parsed.type === "error") {
          setStatus(`error: ${parsed.payload?.message || parsed.message || "unknown"}`);
          setStreamingText("");
          setActiveToolCall(null);
          sessionStorage.removeItem("codex-active-run");
          es.close();
          eventSourceRef.current = null;
        }
      } catch {
        setEvents((prev: EventLine[]) => [...prev, { at: Date.now(), data: msg.data }]);
      }
    };
    es.onerror = () => {
      es.close();
      eventSourceRef.current = null;
      setStreamingText("");
      setActiveToolCall(null);
      if (status === "running") {
        // Try to recover from DB after a short delay
        setTimeout(async () => {
          try {
            const r = await fetch(`/api/runs/${nextRunId}/detail`);
            if (r.ok) {
              const data = await r.json();
              if (data.events && data.events.length > 0) {
                setEvents(data.events);
                setStatus("completed");
                return;
              }
            }
          } catch {}
          setStatus("stream-closed");
        }, 1000);
      }
    };
  }

  return (
    <div className="space-y-6">
      {/* Delete Workspace Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-lg bg-white p-6 shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-zinc-900">Delete Workspace?</h3>
            <p className="mt-2 text-sm text-zinc-600">
              This will permanently delete the workspace and all associated sessions and runs.
              This action cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                onClick={onDeleteWorkspace}
                disabled={status === "deleting"}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {status === "deleting" ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-zinc-900 dark:text-white">Agent Console</h1>
          <p className="mt-1 text-xs md:text-sm text-zinc-600 dark:text-zinc-400">
            Select a workspace, choose a runner, and run prompts.
          </p>
        </div>
        {/* Mobile Controls Toggle */}
        <button
          onClick={() => setControlsCollapsed(!controlsCollapsed)}
          className="lg:hidden flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700"
        >
          <span>⚙️</span>
          <span className="hidden sm:inline">{controlsCollapsed ? 'Show Controls' : 'Hide Controls'}</span>
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 h-auto lg:h-[calc(100vh-180px)] min-h-0 lg:min-h-[600px]">
        {/* Controls Panel - Collapsible on mobile, sidebar on desktop */}
        <div className={`lg:w-80 flex-shrink-0 space-y-4 overflow-y-auto transition-all duration-300 ${
          controlsCollapsed ? 'hidden' : 'block'
        }`}>
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-zinc-900">Workspace</div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowImportForm(!showImportForm)}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  {showImportForm ? "Cancel" : "+ Import"}
                </button>
                <button
                  onClick={onScanLocal}
                  disabled={status === "scanning"}
                  className="text-xs text-zinc-600 hover:text-zinc-800"
                  title="Scan for local folders"
                >
                  🔍 Scan
                </button>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="text-xs text-green-600 hover:text-green-800"
                  title="Upload local folder"
                >
                  📤 Upload
                </button>
                {selectedWorkspaceId && !showImportForm && (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="text-xs text-red-600 hover:text-red-800"
                    title="Remove workspace"
                  >
                    🗑️ Remove
                  </button>
                )}
              </div>
            </div>
            <div className="mt-3 space-y-3">
              {showImportForm ? (
                <>
                  <label className="block">
                    <div className="text-xs font-medium text-zinc-700">GitHub Repo URL</div>
                    <input
                      value={repoUrl}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setRepoUrl(e.target.value)}
                      placeholder="https://github.com/org/repo.git"
                      className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                    />
                  </label>
                  <button
                    onClick={onImportWorkspace}
                    disabled={!repoUrl || status === "importing"}
                    className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    Import Workspace
                  </button>
                </>
              ) : (
                <select
                  value={selectedWorkspaceId || ""}
                  onChange={(e) => {
                    setSelectedWorkspaceId(e.target.value || null);
                    setSessionId(null);
                    setEvents([]);
                    setStatus("idle");
                  }}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                >
                  <option value="">Select a workspace...</option>
                  {workspaces.map((ws) => (
                    <option key={ws.workspace_id} value={ws.workspace_id}>
                      {ws.display_name} ({ws.source_type})
                    </option>
                  ))}
                </select>
              )}

              {selectedWorkspaceId && !showImportForm && (
                <div className="pt-2 border-t border-zinc-100">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-medium text-zinc-700">Sessions</div>
                    <span className="text-xs text-zinc-500">{sessions.length} total</span>
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {sessions.length === 0 ? (
                      <div className="text-xs text-zinc-500">No sessions yet</div>
                    ) : (
                      sessions.map((s) => (
                        <button
                          key={s.session_id}
                          onClick={() => onContinueSession(s)}
                          className={`w-full text-left px-2 py-1.5 rounded text-xs ${
                            sessionId === s.session_id
                              ? "bg-blue-100 text-blue-800"
                              : "bg-zinc-50 hover:bg-zinc-100 text-zinc-700"
                          }`}
                        >
                          <div className="flex justify-between">
                            <span className="font-medium">{s.runner_type}</span>
                            <span className="text-zinc-500">{s.run_count} runs</span>
                          </div>
                          <div className="text-zinc-500 truncate">
                            {new Date(s.created_at).toLocaleDateString()}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4 shadow-sm">
            <div className="text-sm font-medium text-zinc-900 dark:text-white">Session</div>
            <div className="mt-3 space-y-3">
              <label className="block">
                <div className="text-xs font-medium text-zinc-700">Runner</div>
                <select
                  value={runnerType}
                  onChange={(e) => {
                    const newRunner = e.target.value as RunnerType;
                    const runner = RUNNERS.find(r => r.value === newRunner);
                    if (runner && !runner.available) {
                      alert(`${runner.label} is coming soon!`);
                      return;
                    }
                    setRunnerType(newRunner);
                    // Auto-clear session when runner changes
                    if (sessionId) {
                      setSessionId(null);
                      setEvents([]);
                      setRunId(null);
                      setStatus("idle");
                      setPrompt("");
                    }
                  }}
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                >
                  {RUNNERS.map((runner) => (
                    <option 
                      key={runner.value} 
                      value={runner.value}
                      disabled={!runner.available}
                    >
                      {runner.label}{!runner.available ? " (Coming Soon)" : ""}
                    </option>
                  ))}
                </select>
              </label>
              {sessionId && (
                <button
                  onClick={() => {
                    setSessionId(null);
                    setEvents([]);
                    setRunId(null);
                    setStatus("idle");
                    setPrompt("");
                  }}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  Clear Session
                </button>
              )}
              <button
                onClick={onCreateSession}
                disabled={!selectedWorkspaceId || status === "creating-session"}
                className="w-full rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                Create Session
              </button>
            </div>
          </div>

          {sessionId && runs.length > 0 && (
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4 shadow-sm">
              <div className="text-sm font-medium text-zinc-900 dark:text-white">Run History</div>
              <p className="text-xs text-zinc-500 mt-1">Click to load prompt &amp; response</p>
              <div className="mt-3 space-y-1 max-h-40 overflow-y-auto">
                {runs.map((r) => (
                  <div
                    key={r.run_id}
                    onClick={() => loadRunDetail(r.run_id)}
                    className={`px-2 py-1.5 rounded text-xs cursor-pointer transition-colors ${
                      runId === r.run_id
                        ? "bg-blue-100 border border-blue-300"
                        : "bg-zinc-50 hover:bg-zinc-100"
                    }`}
                  >
                    <div className="flex justify-between">
                      <span className={`font-medium ${
                        r.status === "completed" ? "text-green-700" :
                        r.status === "error" ? "text-red-700" :
                        "text-blue-700"
                      }`}>
                        {r.status}
                      </span>
                      <span className="text-zinc-500">
                        {new Date(r.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-zinc-600 truncate">{r.prompt}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          {/* Prompt Section */}
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4 shadow-sm">
            <div className="text-sm font-medium text-zinc-900 dark:text-white">Prompt</div>
          <div className="mt-3 space-y-3">
            <div className="flex items-center gap-2 text-xs">
              <span className={`px-2 py-0.5 rounded ${
                status === "running" ? "bg-blue-100 text-blue-700" :
                status === "completed" ? "bg-green-100 text-green-700" :
                status.startsWith("error") ? "bg-red-100 text-red-700" :
                sessionId ? "bg-green-100 text-green-700" :
                "bg-zinc-100 text-zinc-600"
              }`}>
                {sessionId ? (status === "idle" ? "ready" : status) : "no session"}
              </span>
              {sessionId && (
                <span className="text-zinc-500">
                  {runnerType} • {sessionId.slice(0, 8)}...
                </span>
              )}
            </div>
            <label className="block">
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Instruction</div>
                {availableTemplates.length > 0 && (
                  <div className="relative">
                    <button
                      onClick={() => setTemplatePickerOpen(!templatePickerOpen)}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1"
                    >
                      📝 Use Template
                    </button>
                    {templatePickerOpen && (
                      <div className="absolute right-0 top-6 z-50 w-72 max-h-64 overflow-y-auto rounded-lg border border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 shadow-xl">
                        <div className="p-2 border-b border-zinc-100 dark:border-zinc-700 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                          Select a prompt template
                        </div>
                        {availableTemplates.map((t) => (
                          <button
                            key={t.id}
                            onClick={() => handleSelectTemplate(t)}
                            className="w-full text-left px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-700 border-b border-zinc-50 dark:border-zinc-700 last:border-0"
                          >
                            <div className="text-xs font-medium text-zinc-800 dark:text-zinc-200">{t.name}</div>
                            <div className="text-[10px] text-zinc-400 dark:text-zinc-500 flex items-center gap-2 mt-0.5">
                              <span className="bg-zinc-100 dark:bg-zinc-700 px-1.5 py-0.5 rounded">{t.category}</span>
                              {t.variables?.length > 0 && <span>{t.variables.length} var{t.variables.length !== 1 ? "s" : ""}</span>}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <textarea
                value={prompt}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setPrompt(e.target.value)}
                placeholder="Diagnose failing tests and propose a fix"
                className="mt-1 min-h-[100px] max-h-[200px] w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-3 py-2 text-sm text-zinc-900 dark:text-white resize-y"
              />
            </label>
            <button
              onClick={onRunPrompt}
              disabled={!sessionId || !prompt || status === "running"}
              className="w-full rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              Run Prompt
            </button>
          </div>
          </div>

          {/* Output Section */}
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4 shadow-sm flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium text-zinc-900">Output</div>
            <div className="flex gap-1">
              <button
                onClick={() => setViewMode("transcript")}
                className={`px-2 py-1 text-xs rounded ${
                  viewMode === "transcript"
                    ? "bg-zinc-900 text-white"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                Transcript
              </button>
              <button
                onClick={() => setViewMode("raw")}
                className={`px-2 py-1 text-xs rounded ${
                  viewMode === "raw"
                    ? "bg-zinc-900 text-white"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                Raw Events
              </button>
              <button
                onClick={() => setViewMode("files")}
                className={`px-2 py-1 text-xs rounded ${
                  viewMode === "files"
                    ? "bg-zinc-900 text-white"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                📁 Files
              </button>
            </div>
          </div>

          {viewMode === "files" ? (
            <div className="flex-1 overflow-y-auto p-2 bg-zinc-50 rounded-md border border-zinc-200">
              {selectedWorkspaceId ? (
                <FileBrowser workspaceId={selectedWorkspaceId} />
              ) : (
                <div className="text-sm text-zinc-500 text-center py-8">
                  Select a workspace to browse files.
                </div>
              )}
            </div>
          ) : viewMode === "transcript" ? (
            <div className="flex-1 overflow-y-auto space-y-4 p-3 bg-zinc-50 rounded-md border border-zinc-200">
              {transcript.length === 0 && status !== "running" ? (
                <div className="text-sm text-zinc-500 text-center py-8">
                  No messages yet. Run a prompt to see the transcript.
                </div>
              ) : transcript.length === 0 && status === "running" ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="flex items-center gap-1 text-2xl mb-3">
                    <span className="animate-bounce" style={{ animationDelay: "0ms" }}>🤖</span>
                    <span className="animate-bounce" style={{ animationDelay: "150ms" }}>💭</span>
                    <span className="animate-bounce" style={{ animationDelay: "300ms" }}>⚡</span>
                  </div>
                  <div className="text-sm text-zinc-600 font-medium">Agent is thinking...</div>
                  <div className="text-xs text-zinc-400 mt-1">Processing your request</div>
                </div>
              ) : (
                <>
                {transcript.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`rounded-lg p-3 ${
                      msg.role === "user"
                        ? "bg-blue-50 border border-blue-200 ml-8"
                        : msg.role === "tool"
                        ? msg.isBlocked
                          ? "bg-red-50 border border-red-200 mx-4"
                          : "bg-amber-50 border border-amber-200 mx-4"
                        : msg.role === "system"
                        ? "bg-purple-50 border border-purple-200 mx-4 py-2"
                        : "bg-white border border-zinc-200 mr-8"
                    }`}
                  >
                    {msg.role === "system" ? (
                      <div className="flex items-center gap-2 text-xs">
                        {msg.skillName ? (
                          <>
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-medium">
                              🎯 {msg.skillName}
                            </span>
                            <span className="text-purple-600">
                              {msg.skillScope === "workspace" ? "(workspace)" : "(global)"}
                            </span>
                          </>
                        ) : msg.iteration ? (
                          <>
                            <span className="text-purple-600">
                              🔄 Iteration {msg.iteration.current}/{msg.iteration.max}
                            </span>
                            <div className="flex-1 h-1 bg-purple-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-purple-500 transition-all duration-300"
                                style={{ width: `${(msg.iteration.current / msg.iteration.max) * 100}%` }}
                              />
                            </div>
                          </>
                        ) : (
                          <span className="text-purple-600">{msg.content}</span>
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="text-xs font-medium text-zinc-500 mb-1">
                          {msg.role === "user" ? "You" : msg.role === "tool" ? (
                            <span className="flex items-center gap-2">
                              {msg.isBlocked ? "🚫" : "🔧"} Tool: {msg.toolName}
                              {msg.isBlocked && <span className="text-red-600 font-semibold">BLOCKED</span>}
                            </span>
                          ) : "Assistant"}
                        </div>
                        {msg.role === "tool" ? (
                          <div className="text-xs font-mono">
                            {msg.isBlocked ? (
                              <div className="text-red-700 font-medium">{msg.content}</div>
                            ) : (
                              <>
                                {msg.toolInput && (
                                  <details className="mb-2">
                                    <summary className="cursor-pointer text-amber-700 flex items-center gap-1">
                                      <span>▶</span> Input
                                    </summary>
                                    <pre className="mt-1 p-2 bg-amber-100 rounded overflow-x-auto max-h-40">
                                      {JSON.stringify(msg.toolInput, null, 2)}
                                    </pre>
                                  </details>
                                )}
                                {msg.toolOutput && (
                                  <details>
                                    <summary className="cursor-pointer text-amber-700 flex items-center gap-1">
                                      <span>▶</span> Output
                                    </summary>
                                    <pre className="mt-1 p-2 bg-amber-100 rounded overflow-x-auto max-h-40">
                                      {JSON.stringify(msg.toolOutput, null, 2)}
                                    </pre>
                                  </details>
                                )}
                              </>
                            )}
                          </div>
                        ) : (
                          <div className="prose prose-sm max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {msg.content}
                            </ReactMarkdown>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))
                }
                {status === "running" && (
                  <div className="space-y-2">
                    {/* Show streaming assistant text as it arrives */}
                    {streamingText && (
                      <div className="rounded-lg p-3 bg-white border border-zinc-200 mr-8">
                        <div className="text-xs font-medium text-zinc-500 mb-1 flex items-center gap-2">
                          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                          Assistant is typing...
                        </div>
                        <div className="prose prose-sm max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {streamingText}
                          </ReactMarkdown>
                          <span className="inline-block w-2 h-4 bg-zinc-400 animate-pulse ml-0.5"></span>
                        </div>
                      </div>
                    )}
                    {/* Show active tool call */}
                    {activeToolCall && (
                      <div className="rounded-lg p-3 bg-amber-50 border border-amber-200 mx-4">
                        <div className="text-xs font-medium text-amber-700 flex items-center gap-2">
                          <span className="animate-spin inline-block w-3 h-3 border-2 border-amber-500 border-t-transparent rounded-full"></span>
                          Running: <span className="font-mono bg-amber-100 px-1.5 py-0.5 rounded">{activeToolCall.name}</span>
                        </div>
                        {activeToolCall.input && (
                          <pre className="mt-1 text-[10px] font-mono text-amber-600 max-h-20 overflow-y-auto">
                            {typeof activeToolCall.input === "string" ? activeToolCall.input : JSON.stringify(activeToolCall.input, null, 2)}
                          </pre>
                        )}
                      </div>
                    )}
                    {/* Show thinking indicator when no streaming content yet */}
                    {!streamingText && !activeToolCall && (
                      <div className="flex flex-col items-center justify-center py-6">
                        <div className="flex items-center gap-1 text-2xl mb-2">
                          <span className="animate-bounce" style={{ animationDelay: "0ms" }}>🤖</span>
                          <span className="animate-bounce" style={{ animationDelay: "150ms" }}>💭</span>
                          <span className="animate-bounce" style={{ animationDelay: "300ms" }}>⚡</span>
                        </div>
                        <div className="text-sm text-zinc-600 font-medium">Agent is thinking...</div>
                        <div className="text-xs text-zinc-400 mt-1">Processing your request</div>
                      </div>
                    )}
                  </div>
                )}
                </>
              )}
              <div ref={transcriptEndRef} />
            </div>
          ) : (
            <textarea
              readOnly
              value={eventsText}
              className="flex-1 w-full rounded-md border border-zinc-300 bg-zinc-50 px-3 py-2 font-mono text-xs resize-none"
            />
          )}
        </div>
        </div>
      </div>

      {/* Scan Local Modal */}
      {showScanModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-zinc-900">Discovered Local Folders</h3>
              <button
                onClick={() => setShowScanModal(false)}
                className="text-zinc-500 hover:text-zinc-700"
              >
                ✕
              </button>
            </div>
            
            {discoveredFolders.length === 0 ? (
              <p className="text-sm text-zinc-500 py-4">
                No new folders found. Copy a project folder to <code className="bg-zinc-100 px-1 rounded">/workspaces/name/repo/</code> and scan again.
              </p>
            ) : (
              <div className="space-y-3">
                {discoveredFolders.map((folder) => (
                  <div
                    key={folder.folder_name}
                    className={`p-3 rounded-lg border ${
                      selectedFolders.has(folder.folder_name)
                        ? "border-blue-300 bg-blue-50"
                        : "border-zinc-200 bg-zinc-50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedFolders.has(folder.folder_name)}
                        onChange={() => toggleFolderSelection(folder.folder_name)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-zinc-900">{folder.folder_name}</span>
                          {folder.has_git && (
                            <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded">git</span>
                          )}
                        </div>
                        {folder.git_remote && (
                          <div className="text-xs text-zinc-500 truncate mt-0.5">{folder.git_remote}</div>
                        )}
                        <label className="block mt-2">
                          <span className="text-xs text-zinc-600">Display name:</span>
                          <input
                            type="text"
                            value={folderNames[folder.folder_name] || ""}
                            onChange={(e) => setFolderNames(prev => ({
                              ...prev,
                              [folder.folder_name]: e.target.value
                            }))}
                            className="mt-1 w-full rounded border border-zinc-300 px-2 py-1 text-sm"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-zinc-200">
              <button
                onClick={() => setShowScanModal(false)}
                className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={onImportSelectedFolders}
                disabled={selectedFolders.size === 0 || status === "importing"}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                Import Selected ({selectedFolders.size})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template Variable Fill Modal */}
      {showTemplateVarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-lg bg-white dark:bg-zinc-800 shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-700 px-5 py-3">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
                📝 {showTemplateVarModal.name}
              </h3>
              <button onClick={() => setShowTemplateVarModal(null)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-lg">×</button>
            </div>
            <div className="p-5 space-y-3">
              {showTemplateVarModal.variables.map((v: any) => (
                <div key={v.name}>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    {`{{${v.name}}}`} {v.required && <span className="text-red-500">*</span>}
                    {v.description && <span className="font-normal text-zinc-400"> — {v.description}</span>}
                  </label>
                  {v.type === "enum" && v.options ? (
                    <select
                      value={templateVarValues[v.name] || ""}
                      onChange={(e) => setTemplateVarValues({ ...templateVarValues, [v.name]: e.target.value })}
                      className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-3 py-1.5 text-sm text-zinc-900 dark:text-white"
                    >
                      {v.options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  ) : v.type === "text" ? (
                    <textarea
                      value={templateVarValues[v.name] || ""}
                      onChange={(e) => setTemplateVarValues({ ...templateVarValues, [v.name]: e.target.value })}
                      rows={2}
                      className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-3 py-1.5 text-sm text-zinc-900 dark:text-white"
                    />
                  ) : (
                    <input
                      type={v.type === "number" ? "number" : v.type === "date" ? "date" : "text"}
                      value={templateVarValues[v.name] || ""}
                      onChange={(e) => setTemplateVarValues({ ...templateVarValues, [v.name]: e.target.value })}
                      className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-3 py-1.5 text-sm text-zinc-900 dark:text-white"
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-zinc-200 dark:border-zinc-700 px-5 py-3">
              <button
                onClick={() => setShowTemplateVarModal(null)}
                className="rounded-md border border-zinc-300 dark:border-zinc-600 px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyTemplateVars}
                className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
              >
                Apply to Prompt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSuccess={(workspaceId) => {
          fetchWorkspaces();
          setSelectedWorkspaceId(workspaceId);
          setShowUploadModal(false);
        }}
      />
    </div>
  );
}

export default function CodexPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center p-8"><div className="text-zinc-500">Loading...</div></div>}>
      <CodexPageContent />
    </Suspense>
  );
}
