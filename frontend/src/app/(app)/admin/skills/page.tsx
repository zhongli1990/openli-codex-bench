"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Skill {
  name: string;
  description: string;
  scope: string;
  version: string;
  last_modified: string | null;
  modified_by: string | null;
  tenant_id: string | null;
  project_id: string | null;
}

interface SkillDetail {
  name: string;
  description: string;
  scope: string;
  content: string;
  version: string;
  last_modified: string | null;
  modified_by: string | null;
  files: { path: string; content: string }[];
}

export default function SkillsManagementPage() {
  const router = useRouter();
  
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedSkill, setSelectedSkill] = useState<SkillDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scopeFilter, setScopeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [changeSummary, setChangeSummary] = useState("");
  const [saving, setSaving] = useState(false);
  const [showNewSkillModal, setShowNewSkillModal] = useState(false);
  const [newSkill, setNewSkill] = useState({
    name: "",
    description: "",
    scope: "platform",
    content: "# New Skill\n\n## Quick Start\n\n[Add instructions here]\n\n## Workflow\n\n[Add workflow steps here]",
  });

  // For now, allow all authenticated users to manage skills
  // TODO: Implement proper RBAC check via /api/auth/me endpoint
  const canManagePlatformSkills = true;
  const canManageTenantSkills = true;
  const canManageProjectSkills = true;

  const fetchSkills = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (scopeFilter !== "all") {
        params.set("scope", scopeFilter);
      }
      
      const response = await fetch(`/api/claude/skills?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch skills: ${response.statusText}`);
      }
      const data = await response.json();
      setSkills(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch skills");
    } finally {
      setLoading(false);
    }
  }, [scopeFilter]);

  const fetchSkillDetail = useCallback(async (name: string, scope: string) => {
    try {
      const params = new URLSearchParams({ scope });
      const response = await fetch(`/api/claude/skills/${name}?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch skill: ${response.statusText}`);
      }
      const data = await response.json();
      setSelectedSkill(data);
      setEditContent(data.content);
      setEditDescription(data.description);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch skill");
    }
  }, []);

  const handleSaveSkill = async () => {
    if (!selectedSkill) return;
    
    setSaving(true);
    try {
      const response = await fetch(`/api/claude/skills/${selectedSkill.name}?scope=${selectedSkill.scope}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: editDescription,
          content: editContent,
          change_summary: changeSummary || "Updated skill",
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to save skill: ${response.statusText}`);
      }
      
      const updated = await response.json();
      setSelectedSkill(updated);
      setIsEditing(false);
      setChangeSummary("");
      fetchSkills();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save skill");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateSkill = async () => {
    if (!newSkill.name || !newSkill.description) {
      setError("Name and description are required");
      return;
    }
    
    setSaving(true);
    try {
      const response = await fetch("/api/claude/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSkill),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Failed to create skill: ${response.statusText}`);
      }
      
      setShowNewSkillModal(false);
      setNewSkill({
        name: "",
        description: "",
        scope: "platform",
        content: "# New Skill\n\n## Quick Start\n\n[Add instructions here]\n\n## Workflow\n\n[Add workflow steps here]",
      });
      fetchSkills();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create skill");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSkill = async (name: string, scope: string) => {
    if (!confirm(`Are you sure you want to delete the skill "${name}"?`)) {
      return;
    }
    
    try {
      const response = await fetch(`/api/claude/skills/${name}?scope=${scope}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete skill: ${response.statusText}`);
      }
      
      setSelectedSkill(null);
      fetchSkills();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete skill");
    }
  };

  const handleReloadSkill = async (name: string, scope: string) => {
    try {
      const response = await fetch(`/api/claude/skills/${name}/reload?scope=${scope}`, {
        method: "POST",
      });
      
      if (!response.ok) {
        throw new Error(`Failed to reload skill: ${response.statusText}`);
      }
      
      const result = await response.json();
      alert(result.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reload skill");
    }
  };

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  const filteredSkills = skills.filter((skill) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        skill.name.toLowerCase().includes(query) ||
        skill.description.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const canEditSkill = (skill: Skill | SkillDetail) => {
    if (skill.scope === "platform") return canManagePlatformSkills;
    if (skill.scope === "tenant") return canManageTenantSkills;
    if (skill.scope === "project") return canManageProjectSkills;
    return false;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Skills Management</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Create, edit, and manage Claude Agent Skills for your organization.
          </p>
        </div>
        {(canManagePlatformSkills || canManageTenantSkills) && (
          <button
            onClick={() => setShowNewSkillModal(true)}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + New Skill
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-4">
          <div className="flex">
            <span className="text-red-600 mr-2">⚠️</span>
            <div className="text-sm text-red-700">{error}</div>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-6 h-[calc(100vh-220px)] min-h-[500px]">
        {/* Skills List */}
        <div className="w-80 flex-shrink-0 flex flex-col">
          <div className="rounded-lg border border-zinc-200 bg-white shadow-sm flex-1 flex flex-col">
            <div className="p-4 border-b border-zinc-200">
              <div className="flex gap-2 mb-3">
                <select
                  value={scopeFilter}
                  onChange={(e) => setScopeFilter(e.target.value)}
                  className="flex-1 rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
                >
                  <option value="all">All Scopes</option>
                  <option value="platform">Platform</option>
                  <option value="tenant">Tenant</option>
                  <option value="project">Project</option>
                </select>
                <button
                  onClick={fetchSkills}
                  className="px-3 py-1.5 text-sm text-zinc-600 hover:text-zinc-800 border border-zinc-300 rounded-md"
                  title="Refresh"
                >
                  🔄
                </button>
              </div>
              <input
                type="text"
                placeholder="Search skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
              />
            </div>
            
            <div className="flex-1 overflow-y-auto p-2">
              {loading ? (
                <div className="text-center py-8 text-zinc-500">Loading...</div>
              ) : filteredSkills.length === 0 ? (
                <div className="text-center py-8 text-zinc-500">No skills found</div>
              ) : (
                <div className="space-y-2">
                  {filteredSkills.map((skill) => (
                    <div
                      key={`${skill.scope}-${skill.name}`}
                      onClick={() => fetchSkillDetail(skill.name, skill.scope)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedSkill?.name === skill.name && selectedSkill?.scope === skill.scope
                          ? "bg-blue-50 border border-blue-200"
                          : "bg-zinc-50 hover:bg-zinc-100 border border-transparent"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm text-zinc-900">{skill.name}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          skill.scope === "platform" ? "bg-purple-100 text-purple-700" :
                          skill.scope === "tenant" ? "bg-blue-100 text-blue-700" :
                          "bg-green-100 text-green-700"
                        }`}>
                          {skill.scope}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-600 line-clamp-2">{skill.description}</p>
                      <div className="flex items-center justify-between mt-2 text-xs text-zinc-500">
                        <span>v{skill.version}</span>
                        {skill.last_modified && (
                          <span>{new Date(skill.last_modified).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Skill Detail / Editor */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedSkill ? (
            <div className="rounded-lg border border-zinc-200 bg-white shadow-sm flex-1 flex flex-col">
              <div className="p-4 border-b border-zinc-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-zinc-900">{selectedSkill.name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        selectedSkill.scope === "platform" ? "bg-purple-100 text-purple-700" :
                        selectedSkill.scope === "tenant" ? "bg-blue-100 text-blue-700" :
                        "bg-green-100 text-green-700"
                      }`}>
                        {selectedSkill.scope}
                      </span>
                      <span className="text-xs text-zinc-500">v{selectedSkill.version}</span>
                      {selectedSkill.modified_by && (
                        <span className="text-xs text-zinc-500">
                          by {selectedSkill.modified_by}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {canEditSkill(selectedSkill) && (
                      <>
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => {
                                setIsEditing(false);
                                setEditContent(selectedSkill.content);
                                setEditDescription(selectedSkill.description);
                              }}
                              className="px-3 py-1.5 text-sm text-zinc-600 hover:text-zinc-800 border border-zinc-300 rounded-md"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleSaveSkill}
                              disabled={saving}
                              className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
                            >
                              {saving ? "Saving..." : "Save"}
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleReloadSkill(selectedSkill.name, selectedSkill.scope)}
                              className="px-3 py-1.5 text-sm text-zinc-600 hover:text-zinc-800 border border-zinc-300 rounded-md"
                              title="Reload skill in runner"
                            >
                              🔄 Reload
                            </button>
                            <button
                              onClick={() => setIsEditing(true)}
                              className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-800 border border-blue-300 rounded-md"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => handleDeleteSkill(selectedSkill.name, selectedSkill.scope)}
                              className="px-3 py-1.5 text-sm text-red-600 hover:text-red-800 border border-red-300 rounded-md"
                            >
                              🗑️ Delete
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {isEditing ? (
                <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">
                      Change Summary
                    </label>
                    <input
                      type="text"
                      value={changeSummary}
                      onChange={(e) => setChangeSummary(e.target.value)}
                      placeholder="Describe your changes..."
                      className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="flex-1 flex flex-col min-h-0">
                    <label className="block text-sm font-medium text-zinc-700 mb-1">
                      SKILL.md Content
                    </label>
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="flex-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm font-mono resize-none"
                      spellCheck={false}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-zinc-700 mb-1">Description</h3>
                    <p className="text-sm text-zinc-600">{selectedSkill.description}</p>
                  </div>
                  
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-zinc-700 mb-1">SKILL.md Content</h3>
                    <pre className="bg-zinc-50 border border-zinc-200 rounded-md p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap">
                      {selectedSkill.content}
                    </pre>
                  </div>

                  {selectedSkill.files.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-zinc-700 mb-2">Supporting Files</h3>
                      <div className="space-y-2">
                        {selectedSkill.files.map((file) => (
                          <details key={file.path} className="bg-zinc-50 border border-zinc-200 rounded-md">
                            <summary className="px-3 py-2 cursor-pointer text-sm font-medium text-zinc-700 hover:bg-zinc-100">
                              📄 {file.path}
                            </summary>
                            <pre className="px-3 py-2 text-xs font-mono overflow-x-auto border-t border-zinc-200 whitespace-pre-wrap">
                              {file.content}
                            </pre>
                          </details>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-zinc-200 bg-white shadow-sm flex-1 flex items-center justify-center">
              <div className="text-center text-zinc-500">
                <div className="text-4xl mb-2">📚</div>
                <p>Select a skill to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Skill Modal */}
      {showNewSkillModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-zinc-900">Create New Skill</h3>
              <button
                onClick={() => setShowNewSkillModal(false)}
                className="text-zinc-500 hover:text-zinc-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newSkill.name}
                  onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })}
                  placeholder="my-skill-name"
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                />
                <p className="text-xs text-zinc-500 mt-1">Lowercase letters, numbers, and hyphens only</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={newSkill.description}
                  onChange={(e) => setNewSkill({ ...newSkill, description: e.target.value })}
                  placeholder="Describe what this skill does and when to use it..."
                  rows={3}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  Scope
                </label>
                <select
                  value={newSkill.scope}
                  onChange={(e) => setNewSkill({ ...newSkill, scope: e.target.value })}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                  disabled={!canManagePlatformSkills}
                >
                  {canManagePlatformSkills && <option value="platform">Platform (all tenants)</option>}
                  <option value="tenant">Tenant (your organization)</option>
                  <option value="project">Project (specific workspace)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  Initial Content
                </label>
                <textarea
                  value={newSkill.content}
                  onChange={(e) => setNewSkill({ ...newSkill, content: e.target.value })}
                  rows={10}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm font-mono"
                  spellCheck={false}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-zinc-200">
              <button
                onClick={() => setShowNewSkillModal(false)}
                className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSkill}
                disabled={saving || !newSkill.name || !newSkill.description}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Creating..." : "Create Skill"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
