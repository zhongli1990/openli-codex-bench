"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

type RunnerType = "codex" | "claude" | "gemini" | "azure" | "bedrock" | "openli" | "custom";

const RUNNER_TYPE_STORAGE_KEY = "saas-codex-runner-type";

// Helper to get initial runner type from localStorage (runs synchronously on client)
function getInitialRunnerType(): RunnerType {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(RUNNER_TYPE_STORAGE_KEY);
    if (stored === "codex" || stored === "claude" || stored === "gemini" || stored === "azure" || stored === "bedrock" || stored === "openli" || stored === "custom") {
      return stored as RunnerType;
    }
  }
  return "claude";
}

type Workspace = {
  workspace_id: string;
  display_name: string;
  source_type: string;
  source_uri: string;
  local_path: string;
  created_at: string;
};

type Session = {
  session_id: string;
  workspace_id: string;
  runner_type: RunnerType;
  thread_id: string;
  created_at: string;
  run_count: number;
};

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
  } | null;
  created_at: string;
  isStreaming?: boolean;
};

type EventLine = {
  at: number;
  data: any;
};

type SetStateAction<T> = T | ((prev: T) => T);

type AppContextType = {
  // Shared state
  workspaces: Workspace[];
  setWorkspaces: (workspaces: Workspace[]) => void;
  selectedWorkspaceId: string | null;
  setSelectedWorkspaceId: (id: string | null) => void;
  sessions: Session[];
  setSessions: (sessions: Session[]) => void;
  sessionId: string | null;
  setSessionId: (id: string | null) => void;
  runnerType: RunnerType;
  setRunnerType: (type: RunnerType) => void;
  
  // Chat-specific state
  chatMessages: ChatMessage[];
  setChatMessages: (messages: SetStateAction<ChatMessage[]>) => void;
  chatStatus: string;
  setChatStatus: (status: string) => void;
  
  // Codex-specific state
  codexEvents: EventLine[];
  setCodexEvents: (events: SetStateAction<EventLine[]>) => void;
  codexStatus: string;
  setCodexStatus: (status: string) => void;
  codexRunId: string | null;
  setCodexRunId: (id: string | null) => void;
  
  // Data fetching
  fetchWorkspaces: () => Promise<void>;
  fetchSessions: (workspaceId: string) => Promise<void>;
  fetchMessages: (sessionId: string) => Promise<void>;
};

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  // Shared state
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  // Initialize from localStorage synchronously to avoid flash/race condition
  const [runnerType, setRunnerTypeState] = useState<RunnerType>(getInitialRunnerType);
  
  // Persist runner type to localStorage
  const setRunnerType = useCallback((type: RunnerType) => {
    setRunnerTypeState(type);
    if (typeof window !== "undefined") {
      localStorage.setItem(RUNNER_TYPE_STORAGE_KEY, type);
    }
  }, []);
  
  // Chat-specific state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatStatus, setChatStatus] = useState<string>("idle");
  
  // Codex-specific state
  const [codexEvents, setCodexEvents] = useState<EventLine[]>([]);
  const [codexStatus, setCodexStatus] = useState<string>("idle");
  const [codexRunId, setCodexRunId] = useState<string | null>(null);

  const fetchWorkspaces = useCallback(async () => {
    try {
      const r = await fetch("/api/workspaces");
      if (r.ok) {
        const data = await r.json();
        setWorkspaces(data.items || []);
      }
    } catch (e) {
      console.error("Failed to fetch workspaces:", e);
    }
  }, []);

  const fetchSessions = useCallback(async (workspaceId: string) => {
    try {
      const r = await fetch(`/api/workspaces/${workspaceId}/sessions`);
      if (r.ok) {
        const data = await r.json();
        setSessions(data.items || []);
      }
    } catch (e) {
      console.error("Failed to fetch sessions:", e);
    }
  }, []);

  const fetchMessages = useCallback(async (sessionId: string) => {
    try {
      const r = await fetch(`/api/sessions/${sessionId}/messages`);
      if (r.ok) {
        const data = await r.json();
        setChatMessages(data.items || []);
      }
    } catch (e) {
      console.error("Failed to fetch messages:", e);
    }
  }, []);

  return (
    <AppContext.Provider
      value={{
        workspaces,
        setWorkspaces,
        selectedWorkspaceId,
        setSelectedWorkspaceId,
        sessions,
        setSessions,
        sessionId,
        setSessionId,
        runnerType,
        setRunnerType,
        chatMessages,
        setChatMessages,
        chatStatus,
        setChatStatus,
        codexEvents,
        setCodexEvents,
        codexStatus,
        setCodexStatus,
        codexRunId,
        setCodexRunId,
        fetchWorkspaces,
        fetchSessions,
        fetchMessages,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
}
