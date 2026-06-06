/**
 * OpenLi Codex - Enterprise AI Agent Platform
 * Copyright (c) 2026 Lightweight Integration Ltd
 * 
 * This file is part of OpenLi Codex.
 * Licensed under AGPL-3.0 (community) or Commercial license.
 * See LICENSE file for details.
 * 
 * Contact: Zhong@li-ai.co.uk
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { getToken } from "@/lib/auth";

interface SampleUser {
  id: string;
  email: string;
  displayName: string;
  role: "super_admin" | "org_admin" | "project_admin" | "editor" | "viewer";
  tenant: string;
  groups: string[];
  status: "active" | "pending" | "inactive";
}

interface UserGroup {
  id: string;
  name: string;
  description: string;
  permissions: string[];
}

const sampleUsers: SampleUser[] = [
  {
    id: "1",
    email: "admin@saas-codex.com",
    displayName: "Platform Admin",
    role: "super_admin",
    tenant: "Platform",
    groups: ["Super Admins"],
    status: "active",
  },
  {
    id: "2",
    email: "sarah.jones@nhs-trust.uk",
    displayName: "Sarah Jones",
    role: "org_admin",
    tenant: "NHS Birmingham Trust",
    groups: ["Org Admins", "Clinical Leads"],
    status: "active",
  },
  {
    id: "3",
    email: "james.wilson@nhs-trust.uk",
    displayName: "James Wilson",
    role: "project_admin",
    tenant: "NHS Birmingham Trust",
    groups: ["Project Managers", "IT Team"],
    status: "active",
  },
  {
    id: "4",
    email: "emma.chen@enterprise.com",
    displayName: "Emma Chen",
    role: "org_admin",
    tenant: "Enterprise Corp",
    groups: ["Org Admins", "Architecture"],
    status: "active",
  },
  {
    id: "5",
    email: "michael.brown@enterprise.com",
    displayName: "Michael Brown",
    role: "editor",
    tenant: "Enterprise Corp",
    groups: ["Developers", "QA Team"],
    status: "active",
  },
  {
    id: "6",
    email: "lisa.taylor@nhs-trust.uk",
    displayName: "Lisa Taylor",
    role: "editor",
    tenant: "NHS Birmingham Trust",
    groups: ["Sales", "Pre-Sales"],
    status: "active",
  },
  {
    id: "7",
    email: "david.smith@enterprise.com",
    displayName: "David Smith",
    role: "viewer",
    tenant: "Enterprise Corp",
    groups: ["Stakeholders"],
    status: "active",
  },
  {
    id: "8",
    email: "pending.user@newclient.com",
    displayName: "Pending User",
    role: "viewer",
    tenant: "New Client Ltd",
    groups: [],
    status: "pending",
  },
];

const userGroups: UserGroup[] = [
  {
    id: "1",
    name: "Super Admins",
    description: "Platform-wide administrative access",
    permissions: ["platform:*", "tenant:*", "user:*", "skill:*", "hook:*"],
  },
  {
    id: "2",
    name: "Org Admins",
    description: "Tenant organization administrators",
    permissions: ["tenant:read", "tenant:write", "user:manage", "skill:manage", "hook:configure"],
  },
  {
    id: "3",
    name: "Project Managers",
    description: "Project-level administration",
    permissions: ["project:*", "workspace:manage", "session:manage"],
  },
  {
    id: "4",
    name: "Developers",
    description: "Development team members",
    permissions: ["workspace:read", "workspace:write", "session:create", "skill:use"],
  },
  {
    id: "5",
    name: "Sales",
    description: "Sales and pre-sales team",
    permissions: ["workspace:read", "session:create", "skill:use:sow-generator"],
  },
  {
    id: "6",
    name: "Architecture",
    description: "Solution architects",
    permissions: ["workspace:read", "workspace:write", "skill:use:architecture-*"],
  },
  {
    id: "7",
    name: "Clinical Leads",
    description: "Clinical oversight and compliance",
    permissions: ["workspace:read", "skill:use:healthcare-*", "hook:view"],
  },
  {
    id: "8",
    name: "Stakeholders",
    description: "View-only access for stakeholders",
    permissions: ["workspace:read", "session:read"],
  },
];

const roleColors: Record<string, string> = {
  super_admin: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  org_admin: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  project_admin: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  editor: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  viewer: "bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300",
};

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  org_admin: "Org Admin",
  project_admin: "Project Admin",
  editor: "Editor",
  viewer: "Viewer",
};

const statusColors: Record<string, string> = {
  active: "bg-green-500",
  pending: "bg-yellow-500",
  inactive: "bg-zinc-400",
};

interface SettingsMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsMenu({ isOpen, onClose }: SettingsMenuProps) {
  const [activeTab, setActiveTab] = useState<"users" | "groups" | "rbac">("users");
  const [liveUsers, setLiveUsers] = useState<SampleUser[] | null>(null);
  const [liveGroups, setLiveGroups] = useState<UserGroup[] | null>(null);
  const [liveTenants, setLiveTenants] = useState<{id: string; name: string; slug: string}[]>([]);
  const [rbacSummary, setRbacSummary] = useState<{roles: Record<string, number>; tenant_count: number; group_count: number; valid_roles: string[]} | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchLiveData = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [usersRes, tenantsRes, groupsRes, rbacRes] = await Promise.all([
        fetch("/api/admin/users", { headers }),
        fetch("/api/admin/tenants", { headers }),
        fetch("/api/admin/groups", { headers }),
        fetch("/api/admin/rbac/summary", { headers }),
      ]);
      if (usersRes.ok) {
        const users = await usersRes.json();
        setLiveUsers(users.map((u: any) => ({
          id: u.id,
          email: u.email,
          displayName: u.display_name || u.email,
          role: u.role,
          tenant: u.tenant_id || "Platform",
          groups: [],
          status: u.status,
        })));
      }
      if (tenantsRes.ok) setLiveTenants(await tenantsRes.json());
      if (groupsRes.ok) {
        const groups = await groupsRes.json();
        setLiveGroups(groups.map((g: any) => ({
          id: g.id,
          name: g.name,
          description: g.description || "",
          permissions: [],
        })));
      }
      if (rbacRes.ok) setRbacSummary(await rbacRes.json());
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isOpen) fetchLiveData();
  }, [isOpen, fetchLiveData]);

  if (!isOpen) return null;

  // Use live data if available, fall back to static samples
  const displayUsers = liveUsers || sampleUsers;
  const displayGroups = liveGroups || userGroups;

  // Resolve tenant names for live users
  const tenantNameMap: Record<string, string> = {};
  for (const t of liveTenants) tenantNameMap[t.id] = t.name;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-zinc-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-6 py-4 dark:border-zinc-700 dark:bg-zinc-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
              <svg className="h-5 w-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Settings & RBAC</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Users, Groups & Access Control</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-700">
          <button
            onClick={() => setActiveTab("users")}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === "users"
                ? "border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400"
                : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            }`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            Sample Users
          </button>
          <button
            onClick={() => setActiveTab("groups")}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === "groups"
                ? "border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400"
                : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            }`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            User Groups
          </button>
          <button
            onClick={() => setActiveTab("rbac")}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === "rbac"
                ? "border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400"
                : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            }`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            RBAC Matrix
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[65vh] overflow-y-auto p-6">
          {activeTab === "users" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-700">
                    <th className="pb-3 font-semibold text-zinc-900 dark:text-white">User</th>
                    <th className="pb-3 font-semibold text-zinc-900 dark:text-white">Role</th>
                    <th className="pb-3 font-semibold text-zinc-900 dark:text-white">Tenant</th>
                    <th className="pb-3 font-semibold text-zinc-900 dark:text-white">Groups</th>
                    <th className="pb-3 font-semibold text-zinc-900 dark:text-white">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700">
                  {loading && (
                    <tr><td colSpan={5} className="py-4 text-center text-sm text-zinc-500">Loading live data...</td></tr>
                  )}
                  {displayUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-700/50">
                      <td className="py-3">
                        <div>
                          <p className="font-medium text-zinc-900 dark:text-white">{user.displayName}</p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">{user.email}</p>
                        </div>
                      </td>
                      <td className="py-3">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${roleColors[user.role]}`}>
                          {roleLabels[user.role]}
                        </span>
                      </td>
                      <td className="py-3 text-zinc-600 dark:text-zinc-400">
                        {tenantNameMap[user.tenant] || user.tenant}
                      </td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-1">
                          {user.groups.map((group) => (
                            <span
                              key={group}
                              className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
                            >
                              {group}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${statusColors[user.status]}`} />
                          <span className="text-xs capitalize text-zinc-600 dark:text-zinc-400">{user.status}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "groups" && (
            <div className="grid gap-4 md:grid-cols-2">
              {displayGroups.map((group) => (
                <div
                  key={group.id}
                  className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700"
                >
                  <h3 className="font-semibold text-zinc-900 dark:text-white">{group.name}</h3>
                  <p className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">{group.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {group.permissions.map((perm) => (
                      <span
                        key={perm}
                        className="rounded bg-indigo-50 px-2 py-0.5 text-xs font-mono text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300"
                      >
                        {perm}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "rbac" && (
            <div className="space-y-6">
              {/* RBAC Hierarchy */}
              <div className="rounded-lg bg-gradient-to-r from-zinc-50 to-zinc-100 p-4 dark:from-zinc-800 dark:to-zinc-700">
                <h3 className="mb-3 font-semibold text-zinc-900 dark:text-white">3-Tier RBAC Hierarchy</h3>
                <div className="flex items-center justify-center gap-4">
                  <div className="flex flex-col items-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                      <svg className="h-8 w-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <p className="mt-2 text-sm font-medium text-zinc-900 dark:text-white">Super Admin</p>
                    <p className="text-xs text-zinc-500">Platform Owner</p>
                  </div>
                  <svg className="h-6 w-6 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <div className="flex flex-col items-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
                      <svg className="h-8 w-8 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <p className="mt-2 text-sm font-medium text-zinc-900 dark:text-white">Org Admin</p>
                    <p className="text-xs text-zinc-500">Tenant Admin</p>
                  </div>
                  <svg className="h-6 w-6 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <div className="flex flex-col items-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                      <svg className="h-8 w-8 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    <p className="mt-2 text-sm font-medium text-zinc-900 dark:text-white">End Users</p>
                    <p className="text-xs text-zinc-500">Project Roles</p>
                  </div>
                </div>
              </div>

              {/* Permission Matrix */}
              <div>
                <h3 className="mb-3 font-semibold text-zinc-900 dark:text-white">Permission Matrix</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-zinc-700">
                        <th className="pb-2 pr-4 font-semibold text-zinc-900 dark:text-white">Resource</th>
                        <th className="pb-2 px-2 text-center font-semibold text-red-600 dark:text-red-400">Super</th>
                        <th className="pb-2 px-2 text-center font-semibold text-purple-600 dark:text-purple-400">Org</th>
                        <th className="pb-2 px-2 text-center font-semibold text-blue-600 dark:text-blue-400">Project</th>
                        <th className="pb-2 px-2 text-center font-semibold text-green-600 dark:text-green-400">Editor</th>
                        <th className="pb-2 px-2 text-center font-semibold text-zinc-600 dark:text-zinc-400">Viewer</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700">
                      {[
                        { resource: "Platform Skills", super: "CRUD", org: "R", project: "R", editor: "R", viewer: "R" },
                        { resource: "Tenant Skills", super: "CRUD", org: "CRUD", project: "R", editor: "R", viewer: "R" },
                        { resource: "Project Skills", super: "CRUD", org: "CRUD", project: "CRUD", editor: "R", viewer: "R" },
                        { resource: "Platform Hooks", super: "CRUD", org: "R", project: "R", editor: "-", viewer: "-" },
                        { resource: "Tenant Hooks", super: "CRUD", org: "CRUD", project: "R", editor: "-", viewer: "-" },
                        { resource: "Users", super: "CRUD", org: "CRU*", project: "-", editor: "-", viewer: "-" },
                        { resource: "Workspaces", super: "CRUD", org: "CRUD", project: "CRUD", editor: "RU", viewer: "R" },
                        { resource: "Sessions", super: "CRUD", org: "CRUD", project: "CRUD", editor: "CRUD", viewer: "R" },
                      ].map((row) => (
                        <tr key={row.resource}>
                          <td className="py-2 pr-4 font-medium text-zinc-700 dark:text-zinc-300">{row.resource}</td>
                          <td className="py-2 px-2 text-center text-xs font-mono">{row.super}</td>
                          <td className="py-2 px-2 text-center text-xs font-mono">{row.org}</td>
                          <td className="py-2 px-2 text-center text-xs font-mono">{row.project}</td>
                          <td className="py-2 px-2 text-center text-xs font-mono">{row.editor}</td>
                          <td className="py-2 px-2 text-center text-xs font-mono">{row.viewer}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                  C=Create, R=Read, U=Update, D=Delete, *=Within tenant only
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-200 bg-zinc-50 px-6 py-3 dark:border-zinc-700 dark:bg-zinc-800/50">
          <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
            © 2026 Lightweight Integration Ltd. See RBAC_Design.md for full documentation.
          </p>
        </div>
      </div>
    </div>
  );
}
