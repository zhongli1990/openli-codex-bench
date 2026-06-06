"use client";

import { useCallback, useEffect, useState } from "react";

type FileInfo = {
  name: string;
  path: string;
  type: "file" | "directory";
  size: number | null;
  modified_at: string;
};

type FileBrowserProps = {
  workspaceId: string;
  compact?: boolean;
  onFileSelect?: (file: FileInfo) => void;
};

export function FileBrowser({ workspaceId, compact = false, onFileSelect }: FileBrowserProps) {
  const [currentPath, setCurrentPath] = useState("/");
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [items, setItems] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewingFile, setViewingFile] = useState<FileInfo | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  const fetchFiles = useCallback(async (path: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/files?path=${encodeURIComponent(path)}`);
      if (!res.ok) {
        throw new Error("Failed to load files");
      }
      const data = await res.json();
      setCurrentPath(data.current_path);
      setParentPath(data.parent_path);
      setItems(data.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load files");
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    if (workspaceId) {
      fetchFiles("/");
    }
  }, [workspaceId, fetchFiles]);

  const handleNavigate = (path: string) => {
    fetchFiles(path);
  };

  const handleViewFile = async (file: FileInfo) => {
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/files/view?path=${encodeURIComponent(file.path)}`);
      if (!res.ok) {
        throw new Error("Failed to load file");
      }
      const data = await res.json();
      if (data.is_binary) {
        // Can't view binary files, trigger download instead
        handleDownload(file);
        return;
      }
      setFileContent(data.content);
      setViewingFile(file);
    } catch (e) {
      console.error("Failed to view file:", e);
    }
  };

  const handleDownload = (file: FileInfo) => {
    const url = `/api/workspaces/${workspaceId}/files/download?path=${encodeURIComponent(file.path)}`;
    window.open(url, "_blank");
  };

  const handleDownloadZip = () => {
    const url = `/api/workspaces/${workspaceId}/files/download-zip?path=${encodeURIComponent(currentPath)}`;
    window.open(url, "_blank");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("path", currentPath);

      const res = await fetch(`/api/workspaces/${workspaceId}/files/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Failed to upload file");
      }

      // Refresh file list
      await fetchFiles(currentPath);
    } catch (e) {
      console.error("Failed to upload file:", e);
    } finally {
      setUploadingFile(false);
      e.target.value = "";
    }
  };

  const formatSize = (bytes: number | null) => {
    if (bytes === null) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString();
  };

  if (!workspaceId) {
    return (
      <div className="text-sm text-zinc-500 text-center py-4">
        Select a workspace to browse files
      </div>
    );
  }

  return (
    <div className={`${compact ? "text-xs" : "text-sm"}`}>
      {/* File Viewer Modal */}
      {viewingFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-lg bg-white shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-zinc-200">
              <div>
                <h3 className="text-lg font-semibold text-zinc-900">📄 {viewingFile.name}</h3>
                <p className="text-xs text-zinc-500">
                  {viewingFile.path} • {formatSize(viewingFile.size)}
                </p>
              </div>
              <button
                onClick={() => { setViewingFile(null); setFileContent(null); }}
                className="text-zinc-500 hover:text-zinc-700 text-xl"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-zinc-50">
              <pre className="whitespace-pre-wrap font-mono text-sm text-zinc-800">
                {fileContent}
              </pre>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-zinc-200">
              <button
                onClick={() => navigator.clipboard.writeText(fileContent || "")}
                className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-800"
              >
                Copy to Clipboard
              </button>
              <button
                onClick={() => handleDownload(viewingFile)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                ⬇ Download
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Path Navigation */}
      <div className={`flex items-center justify-between ${compact ? "mb-2" : "mb-3"} gap-2`}>
        <div className="flex items-center gap-1 text-zinc-600 min-w-0">
          {parentPath !== null && (
            <button
              onClick={() => handleNavigate(parentPath)}
              className="p-1 hover:bg-zinc-100 rounded"
              title="Go up"
            >
              ⬆
            </button>
          )}
          <button
            onClick={() => handleNavigate("/")}
            className="p-1 hover:bg-zinc-100 rounded"
            title="Go to root"
          >
            🏠
          </button>
          <span className="truncate text-zinc-500" title={currentPath}>
            {currentPath}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <label className="cursor-pointer">
            <input
              type="file"
              className="hidden"
              onChange={handleFileUpload}
              disabled={uploadingFile}
            />
            <span className={`px-2 py-1 rounded text-xs ${
              uploadingFile 
                ? "bg-zinc-200 text-zinc-400" 
                : "bg-zinc-100 hover:bg-zinc-200 text-zinc-600"
            }`}>
              {uploadingFile ? "..." : "⬆ Upload"}
            </span>
          </label>
        </div>
      </div>

      {/* File List */}
      {loading ? (
        <div className="text-center py-4 text-zinc-500">Loading...</div>
      ) : error ? (
        <div className="text-center py-4 text-red-500">{error}</div>
      ) : items.length === 0 ? (
        <div className="text-center py-4 text-zinc-500">Empty directory</div>
      ) : (
        <div className={`border border-zinc-200 rounded-md overflow-hidden ${compact ? "max-h-48" : "max-h-80"} overflow-y-auto`}>
          {items.map((item) => (
            <div
              key={item.path}
              className="flex items-center justify-between px-3 py-2 hover:bg-zinc-50 border-b border-zinc-100 last:border-b-0"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span>{item.type === "directory" ? "📁" : "📄"}</span>
                <span className="truncate" title={item.name}>
                  {item.name}
                </span>
                {!compact && item.type === "file" && (
                  <span className="text-zinc-400 text-xs">
                    {formatSize(item.size)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {item.type === "directory" ? (
                  <button
                    onClick={() => handleNavigate(item.path)}
                    className="px-2 py-1 text-xs bg-zinc-100 hover:bg-zinc-200 rounded"
                  >
                    Browse
                  </button>
                ) : (
                  <>
                    {!compact && (
                      <button
                        onClick={() => handleViewFile(item)}
                        className="px-2 py-1 text-xs bg-zinc-100 hover:bg-zinc-200 rounded"
                      >
                        View
                      </button>
                    )}
                    <button
                      onClick={() => handleDownload(item)}
                      className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded"
                    >
                      ⬇
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Download All Button */}
      {!compact && items.length > 0 && (
        <div className="mt-3">
          <button
            onClick={handleDownloadZip}
            className="w-full px-3 py-2 text-sm font-medium text-white bg-zinc-900 rounded-md hover:bg-zinc-800"
          >
            ⬇ Download All as ZIP
          </button>
        </div>
      )}
    </div>
  );
}
