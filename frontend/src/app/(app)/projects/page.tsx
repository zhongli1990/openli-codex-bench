"use client";

import { useEffect, useState, useCallback, type ChangeEvent } from "react";
import Link from "next/link";
import { UploadModal } from "@/components/workspace";

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
  runner_type: string;
  created_at: string;
  run_count: number;
};

type WorkspaceWithStats = Workspace & {
  sessions: Session[];
  total_runs: number;
};

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
}

function WorkspaceCard({ 
  workspace, 
  expanded, 
  onToggle,
  onRefresh,
  onDelete
}: { 
  workspace: WorkspaceWithStats; 
  expanded: boolean;
  onToggle: () => void;
  onRefresh: () => void;
  onDelete: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  const copyPath = () => {
    navigator.clipboard.writeText(workspace.local_path);
    setShowMenu(false);
  };

  return (
    <div className="rounded-lg border border-zinc-200 bg-white shadow-sm hover:shadow-md transition-shadow">
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <span className="text-2xl">
              {workspace.source_type === "github" ? "🐙" : "📁"}
            </span>
            <div>
              <h3 className="text-base font-semibold text-zinc-900">
                {workspace.display_name}
              </h3>
              <p className="text-sm text-zinc-500 mt-0.5">
                {workspace.source_type === "github" 
                  ? workspace.source_uri.replace("https://github.com/", "")
                  : workspace.local_path}
              </p>
            </div>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 rounded hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-1 w-40 rounded-md border border-zinc-200 bg-white shadow-lg z-10">
                <button
                  onClick={() => { onRefresh(); setShowMenu(false); }}
                  className="w-full px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
                >
                  🔄 Refresh
                </button>
                <button
                  onClick={copyPath}
                  className="w-full px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
                >
                  📋 Copy Path
                </button>
                <button
                  onClick={() => { onDelete(); setShowMenu(false); }}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                >
                  🗑️ Remove
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-4 text-sm">
          <span className="text-zinc-600">
            <strong>{workspace.sessions.length}</strong> sessions
          </span>
          <span className="text-zinc-300">•</span>
          <span className="text-zinc-600">
            <strong>{workspace.total_runs}</strong> runs
          </span>
          <span className="text-zinc-300">•</span>
          <span className="text-zinc-500">
            Created {formatRelativeTime(workspace.created_at)}
          </span>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Link
            href={`/codex?workspace=${workspace.workspace_id}`}
            className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800"
          >
            ⚡ Open in Agents
          </Link>
          <Link
            href={`/chat?workspace=${workspace.workspace_id}`}
            className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            💬 Open in Chat
          </Link>
          {workspace.sessions.length > 0 && (
            <button
              onClick={onToggle}
              className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              {expanded ? "▼" : "▶"} Sessions ({workspace.sessions.length})
            </button>
          )}
        </div>
      </div>

      {expanded && workspace.sessions.length > 0 && (
        <div className="border-t border-zinc-200 bg-zinc-50 px-5 py-3">
          <div className="space-y-2">
            {workspace.sessions.map((session) => (
              <div
                key={session.session_id}
                className="flex items-center justify-between rounded-md bg-white px-3 py-2 border border-zinc-200"
              >
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    session.runner_type === "codex" 
                      ? "bg-blue-100 text-blue-700" 
                      : "bg-purple-100 text-purple-700"
                  }`}>
                    {session.runner_type}
                  </span>
                  <span className="text-sm text-zinc-600">
                    {session.run_count} runs
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400">
                    {formatRelativeTime(session.created_at)}
                  </span>
                  <Link
                    href={`/codex?workspace=${workspace.workspace_id}&session=${session.session_id}`}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Open →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

type DiscoveredFolder = {
  folder_name: string;
  path: string;
  has_git: boolean;
  git_remote: string | null;
  suggested_name: string;
};

export default function ProjectsPage() {
  const [workspaces, setWorkspaces] = useState<WorkspaceWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  
  // Import/Upload state
  const [showImportForm, setShowImportForm] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [repoUrl, setRepoUrl] = useState("");
  const [importStatus, setImportStatus] = useState<string>("idle");
  const [discoveredFolders, setDiscoveredFolders] = useState<DiscoveredFolder[]>([]);
  const [selectedFolders, setSelectedFolders] = useState<Set<string>>(new Set());
  const [folderNames, setFolderNames] = useState<Record<string, string>>({});

  const fetchWorkspaces = useCallback(async () => {
    try {
      const res = await fetch("/api/workspaces");
      if (!res.ok) return;
      
      const data = await res.json();
      const workspacesList: Workspace[] = data.items || [];
      
      // Fetch sessions for each workspace
      const workspacesWithStats: WorkspaceWithStats[] = await Promise.all(
        workspacesList.map(async (ws) => {
          try {
            const sessRes = await fetch(`/api/workspaces/${ws.workspace_id}/sessions`);
            const sessData = sessRes.ok ? await sessRes.json() : { items: [] };
            const sessions: Session[] = sessData.items || [];
            const total_runs = sessions.reduce((sum, s) => sum + (s.run_count || 0), 0);
            return { ...ws, sessions, total_runs };
          } catch {
            return { ...ws, sessions: [], total_runs: 0 };
          }
        })
      );
      
      setWorkspaces(workspacesWithStats);
    } catch (e) {
      console.error("Failed to fetch workspaces:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filteredWorkspaces = workspaces.filter((ws) =>
    ws.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ws.source_uri.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Import from GitHub
  const onImportWorkspace = async () => {
    if (!repoUrl) return;
    setImportStatus("importing");
    try {
      const r = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_type: "github", source_uri: repoUrl })
      });
      if (r.ok) {
        setRepoUrl("");
        setShowImportForm(false);
        fetchWorkspaces();
      }
    } finally {
      setImportStatus("idle");
    }
  };

  // Scan local folders
  const onScanLocal = async () => {
    setImportStatus("scanning");
    try {
      const r = await fetch("/api/workspaces/scan-local");
      if (r.ok) {
        const data = await r.json();
        setDiscoveredFolders(data.folders || []);
        const names: Record<string, string> = {};
        (data.folders || []).forEach((f: DiscoveredFolder) => {
          names[f.path] = f.suggested_name;
        });
        setFolderNames(names);
        setSelectedFolders(new Set());
        setShowScanModal(true);
      }
    } finally {
      setImportStatus("idle");
    }
  };

  // Import selected local folders
  const onImportSelectedFolders = async () => {
    setImportStatus("importing");
    try {
      for (const path of selectedFolders) {
        await fetch("/api/workspaces", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source_type: "local",
            source_uri: path,
            display_name: folderNames[path] || path.split("/").pop()
          })
        });
      }
      setShowScanModal(false);
      setSelectedFolders(new Set());
      fetchWorkspaces();
    } finally {
      setImportStatus("idle");
    }
  };

  // Delete workspace
  const onDeleteWorkspace = async (workspaceId: string) => {
    setImportStatus("deleting");
    try {
      const r = await fetch(`/api/workspaces/${workspaceId}`, { method: "DELETE" });
      if (r.ok) {
        setShowDeleteConfirm(null);
        fetchWorkspaces();
      }
    } finally {
      setImportStatus("idle");
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Modal */}
      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSuccess={() => {
          setShowUploadModal(false);
          fetchWorkspaces();
        }}
      />

      {/* Scan Local Modal */}
      {showScanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-700">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Discovered Local Folders</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Select folders to import as workspaces</p>
            </div>
            <div className="p-4 max-h-[50vh] overflow-y-auto space-y-2">
              {discoveredFolders.length === 0 ? (
                <p className="text-sm text-zinc-500">No new folders found</p>
              ) : (
                discoveredFolders.map((folder) => (
                  <div key={folder.path} className="flex items-start gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700">
                    <input
                      type="checkbox"
                      checked={selectedFolders.has(folder.path)}
                      onChange={(e) => {
                        const next = new Set(selectedFolders);
                        if (e.target.checked) next.add(folder.path);
                        else next.delete(folder.path);
                        setSelectedFolders(next);
                      }}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <input
                        type="text"
                        value={folderNames[folder.path] || ""}
                        onChange={(e) => setFolderNames({ ...folderNames, [folder.path]: e.target.value })}
                        className="w-full text-sm font-medium bg-transparent border-b border-transparent hover:border-zinc-300 focus:border-zinc-500 focus:outline-none"
                      />
                      <p className="text-xs text-zinc-500 truncate">{folder.path}</p>
                      {folder.has_git && <span className="text-xs text-green-600">🐙 Git repo</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-700 flex justify-end gap-2">
              <button
                onClick={() => setShowScanModal(false)}
                className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={onImportSelectedFolders}
                disabled={selectedFolders.size === 0 || importStatus === "importing"}
                className="px-4 py-2 text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-800 rounded-md disabled:opacity-50"
              >
                Import {selectedFolders.size > 0 ? `(${selectedFolders.size})` : ""}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-xl w-full max-w-sm mx-4 p-6">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Delete Workspace?</h3>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              This will remove the workspace and all its sessions. This action cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={() => onDeleteWorkspace(showDeleteConfirm)}
                disabled={importStatus === "deleting"}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50"
              >
                {importStatus === "deleting" ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Form Modal */}
      {showImportForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Import from GitHub</h3>
            <div className="mt-4">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Repository URL</label>
              <input
                type="text"
                value={repoUrl}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/org/repo.git"
                className="mt-1 w-full rounded-md border border-zinc-300 dark:border-zinc-600 px-3 py-2 text-sm dark:bg-zinc-700 dark:text-white"
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => { setShowImportForm(false); setRepoUrl(""); }}
                className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={onImportWorkspace}
                disabled={!repoUrl || importStatus === "importing"}
                className="px-4 py-2 text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-800 rounded-md disabled:opacity-50"
              >
                {importStatus === "importing" ? "Importing..." : "Import"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-zinc-900 dark:text-white">Projects</h1>
          <p className="mt-1 text-xs md:text-sm text-zinc-600 dark:text-zinc-400">
            Manage your workspaces and integration projects
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onScanLocal}
            disabled={importStatus === "scanning"}
            className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 dark:border-zinc-600 px-3 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700"
          >
            🔍 {importStatus === "scanning" ? "Scanning..." : "Scan Local"}
          </button>
          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 dark:border-zinc-600 px-3 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700"
          >
            📤 Upload
          </button>
          <button
            onClick={() => setShowImportForm(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            + Import GitHub
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search workspaces..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 pl-10 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      {/* Workspace List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border border-zinc-200 bg-white p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-zinc-200 rounded animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 bg-zinc-200 rounded animate-pulse w-1/3" />
                  <div className="h-4 bg-zinc-200 rounded animate-pulse w-1/2" />
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <div className="h-8 bg-zinc-200 rounded animate-pulse w-24" />
                <div className="h-8 bg-zinc-200 rounded animate-pulse w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredWorkspaces.length > 0 ? (
        <div className="space-y-4">
          {filteredWorkspaces.map((ws) => (
            <WorkspaceCard
              key={ws.workspace_id}
              workspace={ws}
              expanded={expandedIds.has(ws.workspace_id)}
              onToggle={() => toggleExpanded(ws.workspace_id)}
              onRefresh={fetchWorkspaces}
              onDelete={() => setShowDeleteConfirm(ws.workspace_id)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center">
          <span className="text-4xl">📦</span>
          <h3 className="mt-4 text-lg font-medium text-zinc-900">No workspaces found</h3>
          <p className="mt-2 text-sm text-zinc-500">
            {searchQuery 
              ? "Try a different search term" 
              : "Import a project from GitHub or scan local folders to get started"}
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Link
              href="/codex"
              className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              + Import Project
            </Link>
          </div>
        </div>
      )}

      {/* Stats Footer */}
      {!loading && workspaces.length > 0 && (
        <div className="text-center text-sm text-zinc-500">
          Showing {filteredWorkspaces.length} of {workspaces.length} workspaces
        </div>
      )}
    </div>
  );
}
