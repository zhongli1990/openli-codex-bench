"use client";

import { useCallback, useState, useRef } from "react";
// NOTE: JSZip must be installed: npm install jszip @types/jszip
import JSZip from "jszip";

type UploadModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (workspaceId: string) => void;
};

type FileEntry = {
  name: string;
  path: string;
  size: number;
  isDirectory: boolean;
};

export function UploadModal({ isOpen, onClose, onSuccess }: UploadModalProps) {
  const [displayName, setDisplayName] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [fileEntries, setFileEntries] = useState<FileEntry[]>([]);
  const [totalSize, setTotalSize] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback((files: FileList) => {
    const entries: FileEntry[] = [];
    let total = 0;
    const folderName = files[0]?.webkitRelativePath?.split("/")[0] || "uploaded-folder";

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      entries.push({
        name: file.name,
        path: file.webkitRelativePath || file.name,
        size: file.size,
        isDirectory: false,
      });
      total += file.size;
    }

    setSelectedFiles(files);
    setFileEntries(entries);
    setTotalSize(total);
    if (!displayName) {
      setDisplayName(folderName);
    }
  }, [displayName]);

  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const items = e.dataTransfer.items;
    if (items && items.length > 0) {
      // Note: Drag and drop folder support is limited in browsers
      // For now, we'll show a message to use the browse button
      setError("Drag and drop for folders is not fully supported. Please use the Browse button.");
    }
  };

  const handleUpload = async () => {
    if (!selectedFiles || selectedFiles.length === 0 || !displayName.trim()) {
      setError("Please select a folder and provide a name");
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      // Create ZIP from selected files
      const zip = new JSZip();
      
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const path = file.webkitRelativePath || file.name;
        // Remove the root folder name from path to avoid double nesting
        const pathParts = path.split("/");
        const relativePath = pathParts.slice(1).join("/") || file.name;
        
        const content = await file.arrayBuffer();
        zip.file(relativePath, content);
        
        setUploadProgress(Math.round((i / selectedFiles.length) * 50));
      }

      setUploadProgress(50);

      // Generate ZIP blob
      const zipBlob = await zip.generateAsync({ 
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 6 }
      }, (metadata: { percent: number }) => {
        setUploadProgress(50 + Math.round(metadata.percent * 0.25));
      });

      setUploadProgress(75);

      // Upload to backend
      const formData = new FormData();
      formData.append("file", zipBlob, `${displayName}.zip`);
      formData.append("display_name", displayName.trim());

      const response = await fetch("/api/workspaces/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Upload failed");
      }

      setUploadProgress(100);

      const data = await response.json();
      onSuccess(data.workspace_id);
      handleClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setDisplayName("");
    setSelectedFiles(null);
    setFileEntries([]);
    setTotalSize(0);
    setUploadProgress(0);
    setError(null);
    onClose();
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="rounded-lg bg-white shadow-xl max-w-lg w-full mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-200">
          <h3 className="text-lg font-semibold text-zinc-900">📤 Upload Local Folder</h3>
          <button
            onClick={handleClose}
            disabled={uploading}
            className="text-zinc-500 hover:text-zinc-700 text-xl disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Workspace Name */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Workspace Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="my-integration-project"
              disabled={uploading}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm disabled:bg-zinc-100"
            />
          </div>

          {/* Drop Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              dragOver
                ? "border-blue-500 bg-blue-50"
                : "border-zinc-300 hover:border-zinc-400 hover:bg-zinc-50"
            } ${uploading ? "pointer-events-none opacity-50" : ""}`}
          >
            <input
              ref={fileInputRef}
              type="file"
              webkitdirectory=""
              directory=""
              multiple
              onChange={handleFolderSelect}
              className="hidden"
              disabled={uploading}
            />
            <div className="text-4xl mb-2">📁</div>
            <div className="text-sm text-zinc-600">
              Click to browse and select a folder
            </div>
            <div className="text-xs text-zinc-400 mt-1">
              Maximum size: 1GB • All files will be uploaded
            </div>
          </div>

          {/* Selected Files Summary */}
          {fileEntries.length > 0 && (
            <div className="bg-zinc-50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-zinc-700">
                  Selected: {fileEntries.length} files
                </span>
                <span className="text-sm text-zinc-500">
                  {formatSize(totalSize)}
                </span>
              </div>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {fileEntries.slice(0, 10).map((entry, idx) => (
                  <div key={idx} className="text-xs text-zinc-600 truncate">
                    📄 {entry.path}
                  </div>
                ))}
                {fileEntries.length > 10 && (
                  <div className="text-xs text-zinc-400">
                    ... and {fileEntries.length - 10} more files
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {uploading && (
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-zinc-600">
                  {uploadProgress < 50 ? "Compressing..." : 
                   uploadProgress < 75 ? "Creating archive..." : 
                   uploadProgress < 100 ? "Uploading..." : "Complete!"}
                </span>
                <span className="text-zinc-500">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-zinc-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-zinc-200">
          <button
            onClick={handleClose}
            disabled={uploading}
            className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-800 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={uploading || fileEntries.length === 0 || !displayName.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {uploading ? "Uploading..." : "Upload & Import"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Add type declarations for webkitdirectory
declare module "react" {
  interface InputHTMLAttributes<T> extends HTMLAttributes<T> {
    webkitdirectory?: string;
    directory?: string;
  }
}
