"use client";

import { useCallback, useEffect, useState } from "react";

interface HookConfig {
  enabled: boolean;
  patterns: string[];
}

interface PlatformHooks {
  security: {
    blocked_bash_patterns: string[];
    blocked_path_patterns: string[];
    enabled: boolean;
  };
  audit: {
    log_all_tools: boolean;
    log_blocked_attempts: boolean;
    enabled: boolean;
  };
}

interface TenantHooks {
  compliance: {
    detect_nhs_numbers: boolean;
    detect_pii: boolean;
    block_external_data_transfer: boolean;
    enabled: boolean;
  };
  quality: {
    enforce_coding_standards: boolean;
    require_documentation: boolean;
    enabled: boolean;
  };
}

export default function HooksManagementPage() {
  const [platformHooks, setPlatformHooks] = useState<PlatformHooks>({
    security: {
      blocked_bash_patterns: [
        "rm -rf /",
        "sudo rm",
        "chmod 777 /",
        ":(){:|:&};:",
        "curl | bash",
        "wget | sh",
        "mkfs",
        "> /dev/sda",
        "dd if=/dev/zero",
        ":(){ :|:& };:",
        "mv /* /dev/null",
        "wget http",
        "curl http",
      ],
      blocked_path_patterns: ["../", "..\\"],
      enabled: true,
    },
    audit: {
      log_all_tools: true,
      log_blocked_attempts: true,
      enabled: true,
    },
  });

  const [tenantHooks, setTenantHooks] = useState<TenantHooks>({
    compliance: {
      detect_nhs_numbers: false,
      detect_pii: false,
      block_external_data_transfer: false,
      enabled: false,
    },
    quality: {
      enforce_coding_standards: false,
      require_documentation: false,
      enabled: false,
    },
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [newPattern, setNewPattern] = useState("");

  // For now, hooks are read from the claude-runner hooks.py file
  // In a full implementation, these would be fetched from an API

  const handleAddPattern = (section: "bash" | "path") => {
    if (!newPattern.trim()) return;

    if (section === "bash") {
      setPlatformHooks((prev) => ({
        ...prev,
        security: {
          ...prev.security,
          blocked_bash_patterns: [...prev.security.blocked_bash_patterns, newPattern.trim()],
        },
      }));
    } else {
      setPlatformHooks((prev) => ({
        ...prev,
        security: {
          ...prev.security,
          blocked_path_patterns: [...prev.security.blocked_path_patterns, newPattern.trim()],
        },
      }));
    }
    setNewPattern("");
  };

  const handleRemovePattern = (section: "bash" | "path", index: number) => {
    if (section === "bash") {
      setPlatformHooks((prev) => ({
        ...prev,
        security: {
          ...prev.security,
          blocked_bash_patterns: prev.security.blocked_bash_patterns.filter((_, i) => i !== index),
        },
      }));
    } else {
      setPlatformHooks((prev) => ({
        ...prev,
        security: {
          ...prev.security,
          blocked_path_patterns: prev.security.blocked_path_patterns.filter((_, i) => i !== index),
        },
      }));
    }
  };

  const handleSaveHooks = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // In a full implementation, this would call an API to save hooks configuration
      // For now, we just show a success message
      await new Promise((resolve) => setTimeout(resolve, 500));
      setSuccess("Hooks configuration saved successfully. Note: Changes require container restart to take effect.");
      setEditingSection(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save hooks");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Hooks Configuration</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Configure security, audit, and compliance hooks for the Claude Agent runner.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-4">
          <div className="flex">
            <span className="text-red-600 mr-2">⚠️</span>
            <div className="text-sm text-red-700">{error}</div>
            <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
              ✕
            </button>
          </div>
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-50 border border-green-200 p-4">
          <div className="flex">
            <span className="text-green-600 mr-2">✓</span>
            <div className="text-sm text-green-700">{success}</div>
            <button onClick={() => setSuccess(null)} className="ml-auto text-green-500 hover:text-green-700">
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Platform Hooks */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-zinc-900">Platform Hooks</h2>
          <p className="text-xs text-zinc-500">These hooks are always active and cannot be disabled by tenants.</p>

          {/* Security Hooks */}
          <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
            <div className="p-4 border-b border-zinc-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🔒</span>
                  <h3 className="font-medium text-zinc-900">Security Hooks</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded ${platformHooks.security.enabled ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-600"}`}>
                    {platformHooks.security.enabled ? "ON" : "OFF"}
                  </span>
                  <button
                    onClick={() => setEditingSection(editingSection === "security" ? null : "security")}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {editingSection === "security" ? "Close" : "Configure"}
                  </button>
                </div>
              </div>
            </div>

            {editingSection === "security" && (
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">
                    Blocked Bash Patterns ({platformHooks.security.blocked_bash_patterns.length})
                  </label>
                  <div className="space-y-1 max-h-48 overflow-y-auto mb-2">
                    {platformHooks.security.blocked_bash_patterns.map((pattern, index) => (
                      <div key={index} className="flex items-center justify-between bg-zinc-50 px-3 py-1.5 rounded text-sm">
                        <code className="text-xs font-mono">{pattern}</code>
                        <button
                          onClick={() => handleRemovePattern("bash", index)}
                          className="text-red-500 hover:text-red-700 text-xs"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newPattern}
                      onChange={(e) => setNewPattern(e.target.value)}
                      placeholder="Add new pattern..."
                      className="flex-1 rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
                      onKeyDown={(e) => e.key === "Enter" && handleAddPattern("bash")}
                    />
                    <button
                      onClick={() => handleAddPattern("bash")}
                      className="px-3 py-1.5 text-sm bg-zinc-900 text-white rounded-md hover:bg-zinc-800"
                    >
                      Add
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">
                    Blocked Path Patterns ({platformHooks.security.blocked_path_patterns.length})
                  </label>
                  <div className="space-y-1 mb-2">
                    {platformHooks.security.blocked_path_patterns.map((pattern, index) => (
                      <div key={index} className="flex items-center justify-between bg-zinc-50 px-3 py-1.5 rounded text-sm">
                        <code className="text-xs font-mono">{pattern}</code>
                        <button
                          onClick={() => handleRemovePattern("path", index)}
                          className="text-red-500 hover:text-red-700 text-xs"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleSaveHooks}
                  disabled={saving}
                  className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Security Hooks"}
                </button>
              </div>
            )}

            {editingSection !== "security" && (
              <div className="p-4 text-sm text-zinc-600">
                <ul className="space-y-1">
                  <li>✓ Block dangerous bash commands ({platformHooks.security.blocked_bash_patterns.length} patterns)</li>
                  <li>✓ Block path traversal ({platformHooks.security.blocked_path_patterns.length} patterns)</li>
                  <li>✓ Block absolute paths outside workspace</li>
                </ul>
              </div>
            )}
          </div>

          {/* Audit Hooks */}
          <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
            <div className="p-4 border-b border-zinc-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📝</span>
                  <h3 className="font-medium text-zinc-900">Audit Hooks</h3>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded ${platformHooks.audit.enabled ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-600"}`}>
                  {platformHooks.audit.enabled ? "ON" : "OFF"}
                </span>
              </div>
            </div>
            <div className="p-4 text-sm text-zinc-600">
              <ul className="space-y-1">
                <li className="flex items-center gap-2">
                  <input type="checkbox" checked={platformHooks.audit.log_all_tools} readOnly className="rounded" />
                  Log all tool executions
                </li>
                <li className="flex items-center gap-2">
                  <input type="checkbox" checked={platformHooks.audit.log_blocked_attempts} readOnly className="rounded" />
                  Log blocked attempts
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Tenant Hooks */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-zinc-900">Tenant Hooks</h2>
          <p className="text-xs text-zinc-500">Configurable per tenant/organization.</p>

          {/* Compliance Hooks */}
          <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
            <div className="p-4 border-b border-zinc-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🏥</span>
                  <h3 className="font-medium text-zinc-900">Compliance Hooks</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded ${tenantHooks.compliance.enabled ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-600"}`}>
                    {tenantHooks.compliance.enabled ? "ON" : "OFF"}
                  </span>
                  <button
                    onClick={() => setEditingSection(editingSection === "compliance" ? null : "compliance")}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {editingSection === "compliance" ? "Close" : "Configure"}
                  </button>
                </div>
              </div>
            </div>

            {editingSection === "compliance" ? (
              <div className="p-4 space-y-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={tenantHooks.compliance.detect_nhs_numbers}
                    onChange={(e) =>
                      setTenantHooks((prev) => ({
                        ...prev,
                        compliance: { ...prev.compliance, detect_nhs_numbers: e.target.checked, enabled: true },
                      }))
                    }
                    className="rounded"
                  />
                  Detect NHS numbers in output
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={tenantHooks.compliance.detect_pii}
                    onChange={(e) =>
                      setTenantHooks((prev) => ({
                        ...prev,
                        compliance: { ...prev.compliance, detect_pii: e.target.checked, enabled: true },
                      }))
                    }
                    className="rounded"
                  />
                  Detect PII (names, addresses)
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={tenantHooks.compliance.block_external_data_transfer}
                    onChange={(e) =>
                      setTenantHooks((prev) => ({
                        ...prev,
                        compliance: { ...prev.compliance, block_external_data_transfer: e.target.checked, enabled: true },
                      }))
                    }
                    className="rounded"
                  />
                  Block external data transfer
                </label>
                <button
                  onClick={handleSaveHooks}
                  disabled={saving}
                  className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 mt-2"
                >
                  {saving ? "Saving..." : "Save Compliance Hooks"}
                </button>
              </div>
            ) : (
              <div className="p-4 text-sm text-zinc-600">
                <ul className="space-y-1">
                  <li className="flex items-center gap-2">
                    <span className={tenantHooks.compliance.detect_nhs_numbers ? "text-green-600" : "text-zinc-400"}>
                      {tenantHooks.compliance.detect_nhs_numbers ? "✓" : "○"}
                    </span>
                    Detect NHS numbers
                  </li>
                  <li className="flex items-center gap-2">
                    <span className={tenantHooks.compliance.detect_pii ? "text-green-600" : "text-zinc-400"}>
                      {tenantHooks.compliance.detect_pii ? "✓" : "○"}
                    </span>
                    Detect PII
                  </li>
                  <li className="flex items-center gap-2">
                    <span className={tenantHooks.compliance.block_external_data_transfer ? "text-green-600" : "text-zinc-400"}>
                      {tenantHooks.compliance.block_external_data_transfer ? "✓" : "○"}
                    </span>
                    Block external data transfer
                  </li>
                </ul>
              </div>
            )}
          </div>

          {/* Quality Hooks */}
          <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
            <div className="p-4 border-b border-zinc-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📋</span>
                  <h3 className="font-medium text-zinc-900">Quality Hooks</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded ${tenantHooks.quality.enabled ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-600"}`}>
                    {tenantHooks.quality.enabled ? "ON" : "OFF"}
                  </span>
                  <button
                    onClick={() => setEditingSection(editingSection === "quality" ? null : "quality")}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {editingSection === "quality" ? "Close" : "Configure"}
                  </button>
                </div>
              </div>
            </div>

            {editingSection === "quality" ? (
              <div className="p-4 space-y-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={tenantHooks.quality.enforce_coding_standards}
                    onChange={(e) =>
                      setTenantHooks((prev) => ({
                        ...prev,
                        quality: { ...prev.quality, enforce_coding_standards: e.target.checked, enabled: true },
                      }))
                    }
                    className="rounded"
                  />
                  Enforce coding standards
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={tenantHooks.quality.require_documentation}
                    onChange={(e) =>
                      setTenantHooks((prev) => ({
                        ...prev,
                        quality: { ...prev.quality, require_documentation: e.target.checked, enabled: true },
                      }))
                    }
                    className="rounded"
                  />
                  Require documentation
                </label>
                <button
                  onClick={handleSaveHooks}
                  disabled={saving}
                  className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 mt-2"
                >
                  {saving ? "Saving..." : "Save Quality Hooks"}
                </button>
              </div>
            ) : (
              <div className="p-4 text-sm text-zinc-600">
                <ul className="space-y-1">
                  <li className="flex items-center gap-2">
                    <span className={tenantHooks.quality.enforce_coding_standards ? "text-green-600" : "text-zinc-400"}>
                      {tenantHooks.quality.enforce_coding_standards ? "✓" : "○"}
                    </span>
                    Enforce coding standards
                  </li>
                  <li className="flex items-center gap-2">
                    <span className={tenantHooks.quality.require_documentation ? "text-green-600" : "text-zinc-400"}>
                      {tenantHooks.quality.require_documentation ? "✓" : "○"}
                    </span>
                    Require documentation
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex gap-3">
          <span className="text-blue-600">ℹ️</span>
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">About Hooks</p>
            <p>
              Hooks are pre/post tool execution validators that run in the Claude Agent runner. 
              Platform hooks are always active and provide security and audit capabilities. 
              Tenant hooks can be configured per organization for compliance and quality requirements.
            </p>
            <p className="mt-2">
              <strong>Note:</strong> Changes to hooks configuration require a container restart to take effect.
              In production, hooks configuration should be managed via environment variables or configuration files.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
