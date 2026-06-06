"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";

interface PromptTemplate {
  id: string;
  tenant_id: string | null;
  owner_id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  subcategory: string | null;
  tags: string[];
  template_body: string;
  variables: VariableDefinition[];
  sample_values: Record<string, string>;
  compatible_models: string[];
  tested_models: string[];
  recommended_model: string | null;
  version: number;
  is_latest: boolean;
  status: string;
  visibility: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  usage_count: number;
}

interface VariableDefinition {
  name: string;
  type: string;
  description: string;
  default?: string;
  required: boolean;
  options?: string[];
}

const CATEGORIES = [
  { value: "", label: "All Categories" },
  { value: "sales", label: "Sales" },
  { value: "project-management", label: "Project Management" },
  { value: "product", label: "Product" },
  { value: "architecture", label: "Architecture" },
  { value: "development", label: "Development" },
  { value: "qa", label: "QA & Testing" },
  { value: "support", label: "Support" },
  { value: "compliance", label: "Compliance" },
  { value: "general", label: "General" },
];

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];

export default function PromptsPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");

  // Use Template Modal
  const [useModal, setUseModal] = useState<PromptTemplate | null>(null);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [renderedPrompt, setRenderedPrompt] = useState("");

  // New Template Modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    description: "",
    category: "general",
    template_body: "",
    visibility: "private",
  });
  const [creating, setCreating] = useState(false);

  // Edit Template Modal
  const [editModal, setEditModal] = useState<PromptTemplate | null>(null);
  const [editFields, setEditFields] = useState({ template_body: "", description: "", change_summary: "" });
  const [saving, setSaving] = useState(false);

  // Version History Modal
  const [versionsModal, setVersionsModal] = useState<PromptTemplate | null>(null);
  const [versions, setVersions] = useState<PromptTemplate[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (category) params.set("category", category);
      if (status) params.set("status", status);
      if (search) params.set("search", search);

      const token = getToken();
      const res = await fetch(`/api/prompt-manager/templates?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`Failed to fetch templates: ${res.statusText}`);
      const data = await res.json();
      setTemplates(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch templates");
    } finally {
      setLoading(false);
    }
  }, [category, status, search]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleUseTemplate = (t: PromptTemplate) => {
    const initial: Record<string, string> = {};
    for (const v of t.variables || []) {
      initial[v.name] = t.sample_values?.[v.name] || v.default || "";
    }
    setVariableValues(initial);
    setUseModal(t);
    // Render preview
    let rendered = t.template_body;
    for (const [k, val] of Object.entries(initial)) {
      rendered = rendered.replaceAll(`{{${k}}}`, val);
    }
    setRenderedPrompt(rendered);
  };

  const updateVariable = (name: string, value: string) => {
    const updated = { ...variableValues, [name]: value };
    setVariableValues(updated);
    if (useModal) {
      let rendered = useModal.template_body;
      for (const [k, val] of Object.entries(updated)) {
        rendered = rendered.replaceAll(`{{${k}}}`, val);
      }
      setRenderedPrompt(rendered);
    }
  };

  const handleSendToAgent = () => {
    // Store rendered prompt in sessionStorage for Agent page to pick up
    sessionStorage.setItem("prefill-prompt", renderedPrompt);
    router.push("/codex");
  };

  const handleCopyToClipboard = async () => {
    await navigator.clipboard.writeText(renderedPrompt);
  };

  const handleCreateTemplate = async () => {
    setCreating(true);
    try {
      const token = getToken();
      const res = await fetch("/api/prompt-manager/templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(newTemplate),
      });
      if (!res.ok) throw new Error("Failed to create template");
      setShowNewModal(false);
      setNewTemplate({ name: "", description: "", category: "general", template_body: "", visibility: "private" });
      fetchTemplates();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create template");
    } finally {
      setCreating(false);
    }
  };

  const handleEditTemplate = (t: PromptTemplate) => {
    setEditFields({ template_body: t.template_body, description: t.description || "", change_summary: "" });
    setEditModal(t);
  };

  const handleSaveEdit = async () => {
    if (!editModal) return;
    setSaving(true);
    try {
      const token = getToken();
      const res = await fetch(`/api/prompt-manager/templates/${editModal.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(editFields),
      });
      if (!res.ok) throw new Error("Failed to update template");
      setEditModal(null);
      fetchTemplates();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update template");
    } finally {
      setSaving(false);
    }
  };

  const handleViewVersions = async (t: PromptTemplate) => {
    setVersionsModal(t);
    setLoadingVersions(true);
    try {
      const token = getToken();
      const res = await fetch(`/api/prompt-manager/templates/${t.id}/versions`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setVersions(data.items || []);
      }
    } catch {
      setVersions([]);
    } finally {
      setLoadingVersions(false);
    }
  };

  const handleCloneTemplate = async (id: string) => {
    try {
      const token = getToken();
      const res = await fetch(`/api/prompt-manager/templates/${id}/clone`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to clone template");
      fetchTemplates();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to clone template");
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm("Archive this template?")) return;
    try {
      const token = getToken();
      await fetch(`/api/prompt-manager/templates/${id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      fetchTemplates();
    } catch (err) {
      alert("Failed to delete template");
    }
  };

  const handlePublish = async (id: string) => {
    try {
      const token = getToken();
      await fetch(`/api/prompt-manager/templates/${id}/publish`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      fetchTemplates();
    } catch (err) {
      alert("Failed to publish template");
    }
  };

  const statusBadge = (s: string) => {
    const colors: Record<string, string> = {
      draft: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      published: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      archived: "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300",
      deprecated: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    };
    return (
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[s] || colors.draft}`}>
        {s}
      </span>
    );
  };

  const visibilityIcon = (v: string) => {
    const icons: Record<string, string> = { private: "🔒", team: "👥", tenant: "🏢", public: "🌐" };
    return icons[v] || "🔒";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Prompt Templates</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Create, manage, and share parameterised prompt templates across your team
          </p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          + New Template
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="🔍 Search templates..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white placeholder-zinc-400"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-sm text-zinc-500 dark:text-zinc-400">Loading templates...</div>
        </div>
      )}

      {/* Template Cards */}
      {!loading && templates.length === 0 && (
        <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-600 p-12 text-center">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No templates found. Create your first prompt template to get started.
          </p>
        </div>
      )}

      {!loading && templates.length > 0 && (
        <div className="space-y-3">
          {templates.map((t) => (
            <div
              key={t.id}
              className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-white truncate">{t.name}</h3>
                    <span className="text-xs text-zinc-400">v{t.version}</span>
                    {statusBadge(t.status)}
                    <span title={t.visibility}>{visibilityIcon(t.visibility)}</span>
                  </div>
                  {t.description && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2 line-clamp-2">{t.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400 dark:text-zinc-500">
                    <span className="inline-flex items-center gap-1 rounded bg-zinc-100 dark:bg-zinc-700 px-2 py-0.5 font-medium text-zinc-600 dark:text-zinc-300">
                      {t.category}
                    </span>
                    {t.tags?.map((tag) => (
                      <span key={tag} className="text-zinc-400">#{tag}</span>
                    ))}
                    {t.recommended_model && (
                      <span>🤖 {t.recommended_model}</span>
                    )}
                    <span>📊 Used {t.usage_count} times</span>
                    <span>⏱️ {new Date(t.updated_at).toLocaleDateString()}</span>
                    {t.variables?.length > 0 && (
                      <span>{t.variables.length} variable{t.variables.length !== 1 ? "s" : ""}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                  <button
                    onClick={() => handleUseTemplate(t)}
                    className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
                  >
                    Use
                  </button>
                  <button
                    onClick={() => handleEditTemplate(t)}
                    className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleViewVersions(t)}
                    className="rounded-md border border-indigo-300 dark:border-indigo-600 px-3 py-1.5 text-xs text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
                  >
                    v{t.version}
                  </button>
                  <button
                    onClick={() => handleCloneTemplate(t.id)}
                    className="rounded-md border border-zinc-300 dark:border-zinc-600 px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                    title="Clone template"
                  >
                    📋
                  </button>
                  {t.status === "draft" && (
                    <button
                      onClick={() => handlePublish(t.id)}
                      className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                    >
                      Publish
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteTemplate(t.id)}
                    className="rounded-md border border-zinc-300 dark:border-zinc-600 px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                  >
                    Archive
                  </button>
                </div>
              </div>
            </div>
          ))}
          <div className="text-xs text-zinc-400 dark:text-zinc-500 text-right">
            Showing {templates.length} of {total} templates
          </div>
        </div>
      )}

      {/* ─── Use Template Modal ─── */}
      {useModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white dark:bg-zinc-800 shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-700 px-6 py-4">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                Use: {useModal.name}
              </h2>
              <button onClick={() => setUseModal(null)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xl">×</button>
            </div>
            <div className="p-6 space-y-4">
              {/* Variable Inputs */}
              {useModal.variables?.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Fill in variables:</h3>
                  {useModal.variables.map((v) => (
                    <div key={v.name}>
                      <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                        {`{{${v.name}}}`} {v.required && <span className="text-red-500">*</span>}
                        {v.description && <span className="font-normal text-zinc-400"> — {v.description}</span>}
                      </label>
                      {v.type === "enum" && v.options ? (
                        <select
                          value={variableValues[v.name] || ""}
                          onChange={(e) => updateVariable(v.name, e.target.value)}
                          className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-3 py-2 text-sm text-zinc-900 dark:text-white"
                        >
                          {v.options.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : v.type === "text" ? (
                        <textarea
                          value={variableValues[v.name] || ""}
                          onChange={(e) => updateVariable(v.name, e.target.value)}
                          rows={3}
                          className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-3 py-2 text-sm text-zinc-900 dark:text-white"
                        />
                      ) : (
                        <input
                          type={v.type === "number" ? "number" : v.type === "date" ? "date" : "text"}
                          value={variableValues[v.name] || ""}
                          onChange={(e) => updateVariable(v.name, e.target.value)}
                          className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-3 py-2 text-sm text-zinc-900 dark:text-white"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Preview */}
              <div>
                <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Preview:</h3>
                <div className="rounded-md border border-zinc-200 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-900 p-4 text-sm text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap max-h-60 overflow-y-auto font-mono text-xs">
                  {renderedPrompt}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-zinc-200 dark:border-zinc-700 px-6 py-4">
              <button
                onClick={handleCopyToClipboard}
                className="rounded-md border border-zinc-300 dark:border-zinc-600 px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"
              >
                📋 Copy
              </button>
              <button
                onClick={handleSendToAgent}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                🤖 Send to Agent Console
              </button>
              <button
                onClick={() => setUseModal(null)}
                className="rounded-md border border-zinc-300 dark:border-zinc-600 px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── New Template Modal ─── */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white dark:bg-zinc-800 shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-700 px-6 py-4">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">New Prompt Template</h2>
              <button onClick={() => setShowNewModal(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xl">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Name *</label>
                <input
                  type="text"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  placeholder="e.g. NHS SoW Generator"
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-3 py-2 text-sm text-zinc-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Description</label>
                <input
                  type="text"
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                  placeholder="Brief description of what this template does"
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-3 py-2 text-sm text-zinc-900 dark:text-white"
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Category *</label>
                  <select
                    value={newTemplate.category}
                    onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value })}
                    className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-3 py-2 text-sm text-zinc-900 dark:text-white"
                  >
                    {CATEGORIES.filter((c) => c.value).map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Visibility</label>
                  <select
                    value={newTemplate.visibility}
                    onChange={(e) => setNewTemplate({ ...newTemplate, visibility: e.target.value })}
                    className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-3 py-2 text-sm text-zinc-900 dark:text-white"
                  >
                    <option value="private">🔒 Private</option>
                    <option value="team">👥 Team</option>
                    <option value="tenant">🏢 Tenant</option>
                    <option value="public">🌐 Public</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Template Body * <span className="font-normal text-zinc-400">— Use {"{{variable_name}}"} for parameters</span>
                </label>
                <textarea
                  value={newTemplate.template_body}
                  onChange={(e) => setNewTemplate({ ...newTemplate, template_body: e.target.value })}
                  rows={10}
                  placeholder={"Generate a professional {{document_type}} for {{customer_name}}.\n\nProject: {{project_name}}\nScope: {{scope_description}}"}
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-3 py-2 text-sm text-zinc-900 dark:text-white font-mono"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-zinc-200 dark:border-zinc-700 px-6 py-4">
              <button
                onClick={() => setShowNewModal(false)}
                className="rounded-md border border-zinc-300 dark:border-zinc-600 px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTemplate}
                disabled={creating || !newTemplate.name || !newTemplate.template_body}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create Template"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ─── Edit Template Modal ─── */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white dark:bg-zinc-800 shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-700 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Edit: {editModal.name}</h2>
                <p className="text-xs text-zinc-400 dark:text-zinc-500">Current version: v{editModal.version} — Saving creates a new version</p>
              </div>
              <button onClick={() => setEditModal(null)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xl">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Description</label>
                <input
                  type="text"
                  value={editFields.description}
                  onChange={(e) => setEditFields({ ...editFields, description: e.target.value })}
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-3 py-2 text-sm text-zinc-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Template Body <span className="font-normal text-zinc-400">— Use {"{{variable_name}}"} for parameters</span>
                </label>
                <textarea
                  value={editFields.template_body}
                  onChange={(e) => setEditFields({ ...editFields, template_body: e.target.value })}
                  rows={12}
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-3 py-2 text-sm text-zinc-900 dark:text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Change Summary * <span className="font-normal text-zinc-400">— Describe what changed in this version</span>
                </label>
                <input
                  type="text"
                  value={editFields.change_summary}
                  onChange={(e) => setEditFields({ ...editFields, change_summary: e.target.value })}
                  placeholder="e.g. Updated compliance section, added new variable"
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-3 py-2 text-sm text-zinc-900 dark:text-white"
                />
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-zinc-200 dark:border-zinc-700 px-6 py-4">
              <p className="text-xs text-zinc-400">This will create version v{editModal.version + 1}</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setEditModal(null)}
                  className="rounded-md border border-zinc-300 dark:border-zinc-600 px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={saving || !editFields.change_summary}
                  className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  {saving ? "Saving..." : `Save as v${editModal.version + 1}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Version History Modal ─── */}
      {versionsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white dark:bg-zinc-800 shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-700 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Version History: {versionsModal.name}</h2>
                <p className="text-xs text-zinc-400 dark:text-zinc-500">All versions of this template</p>
              </div>
              <button onClick={() => setVersionsModal(null)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xl">×</button>
            </div>
            <div className="p-6">
              {loadingVersions ? (
                <div className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-8">Loading versions...</div>
              ) : versions.length === 0 ? (
                <div className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-8">No version history available</div>
              ) : (
                <div className="space-y-3">
                  {versions.map((v) => (
                    <div
                      key={v.id}
                      className={`rounded-lg border p-4 ${
                        v.is_latest
                          ? "border-indigo-300 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20"
                          : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-zinc-900 dark:text-white">v{v.version}</span>
                          {v.is_latest && (
                            <span className="inline-flex items-center rounded-full bg-indigo-100 dark:bg-indigo-900 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:text-indigo-300">
                              Latest
                            </span>
                          )}
                          {statusBadge(v.status)}
                        </div>
                        <span className="text-xs text-zinc-400 dark:text-zinc-500">
                          {new Date(v.created_at).toLocaleString()}
                        </span>
                      </div>
                      {v.description && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">{v.description}</p>
                      )}
                      <details className="text-xs">
                        <summary className="cursor-pointer text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300">
                          View template body
                        </summary>
                        <pre className="mt-2 rounded-md bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 p-3 text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap overflow-x-auto max-h-40">
                          {v.template_body}
                        </pre>
                      </details>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center justify-end border-t border-zinc-200 dark:border-zinc-700 px-6 py-4">
              <button
                onClick={() => setVersionsModal(null)}
                className="rounded-md border border-zinc-300 dark:border-zinc-600 px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
