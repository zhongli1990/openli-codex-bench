"use client";

import { useState, useEffect, useCallback } from "react";
import { User, getToken, isSuperAdmin as isSuperAdminFn } from "@/lib/auth";
import { useAuth } from "@/contexts/AuthContext";

type UserStatus = "pending" | "active" | "inactive" | "rejected";
type UserRole = "super_admin" | "org_admin" | "project_admin" | "editor" | "viewer";

const VALID_ROLES: { value: UserRole; label: string }[] = [
  { value: "super_admin", label: "Super Admin" },
  { value: "org_admin", label: "Org Admin" },
  { value: "project_admin", label: "Project Admin" },
  { value: "editor", label: "Editor" },
  { value: "viewer", label: "Viewer" },
];

const statusColors: Record<UserStatus, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  inactive: "bg-zinc-100 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

const roleColors: Record<string, string> = {
  super_admin: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  org_admin: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  project_admin: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  editor: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  viewer: "bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300",
  admin: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  user: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
};

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  org_admin: "Org Admin",
  project_admin: "Project Admin",
  editor: "Editor",
  viewer: "Viewer",
  admin: "Admin (legacy)",
  user: "User (legacy)",
};

export default function UserManagementPage() {
  const { user: currentUser } = useAuth();
  const currentIsSuperAdmin = isSuperAdminFn(currentUser?.role);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [tenants, setTenants] = useState<{id: string; name: string; slug: string}[]>([]);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError("");
    const token = getToken();
    
    try {
      const url = statusFilter === "all" 
        ? "/api/admin/users" 
        : `/api/admin/users?status=${statusFilter}`;
      
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!res.ok) {
        if (res.status === 403) {
          setError("Admin access required");
        } else {
          setError("Failed to fetch users");
        }
        return;
      }
      
      const data = await res.json();
      setUsers(data);
    } catch {
      setError("Failed to fetch users");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  const fetchTenants = useCallback(async () => {
    const token = getToken();
    try {
      const res = await fetch("/api/admin/tenants", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setTenants(await res.json());
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchTenants();
  }, [fetchUsers, fetchTenants]);

  const handleAction = async (userId: string, action: "approve" | "reject" | "activate" | "deactivate") => {
    setActionLoading(userId);
    const token = getToken();
    
    try {
      const res = await fetch(`/api/admin/users/${userId}/${action}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!res.ok) {
        const data = await res.json();
        alert(data.detail || `Failed to ${action} user`);
        return;
      }
      
      await fetchUsers();
    } catch {
      alert(`Failed to ${action} user`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    setActionLoading(userId);
    const token = getToken();
    try {
      const res = await fetch(`/api/admin/users/${userId}/role?role=${newRole}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        let msg = "Failed to change role";
        try {
          const data = await res.json();
          msg = typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail);
        } catch {}
        alert(msg);
        return;
      }
      await fetchUsers();
    } catch (e: any) {
      alert("Failed to change role: " + (e?.message || String(e)));
    } finally {
      setActionLoading(null);
    }
  };

  const handleTenantChange = async (userId: string, tenantId: string) => {
    setActionLoading(userId);
    const token = getToken();
    try {
      const param = tenantId ? `?tenant_id=${tenantId}` : "";
      const res = await fetch(`/api/admin/users/${userId}/tenant${param}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        let msg = "Failed to assign tenant";
        try {
          const data = await res.json();
          msg = typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail);
        } catch {}
        alert(msg);
        return;
      }
      await fetchUsers();
    } catch (e: any) {
      alert("Failed to assign tenant: " + (e?.message || String(e)));
    } finally {
      setActionLoading(null);
    }
  };

  const pendingCount = users.filter(u => u.status === "pending").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">User Management</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Manage user accounts, roles, and tenant assignments
          </p>
        </div>
        {pendingCount > 0 && (
          <div className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800">
            {pendingCount} pending approval{pendingCount > 1 ? "s" : ""}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-zinc-700">Filter by status:</label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8 text-zinc-500">Loading users...</div>
      ) : users.length === 0 ? (
        <div className="text-center py-8 text-zinc-500">No users found</div>
      ) : (
        <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden">
          <table className="min-w-full divide-y divide-zinc-200">
            <thead className="bg-zinc-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Role
                </th>
                {currentIsSuperAdmin && (
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Tenant
                </th>
                )}
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Registered
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-zinc-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-zinc-900">
                      {user.display_name || user.email}
                    </div>
                    <div className="text-sm text-zinc-500">{user.email}</div>
                    {user.mobile && (
                      <div className="text-xs text-zinc-400">{user.mobile}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusColors[user.status as UserStatus]}`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      disabled={actionLoading === user.id}
                      className={`rounded-full px-2 py-1 text-xs font-medium border-0 cursor-pointer ${roleColors[user.role] || roleColors.editor}`}
                    >
                      {VALID_ROLES.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                      {/* Show legacy roles if present */}
                      {!VALID_ROLES.find(r => r.value === user.role) && (
                        <option value={user.role}>{roleLabels[user.role] || user.role}</option>
                      )}
                    </select>
                  </td>
                  {currentIsSuperAdmin && (
                  <td className="px-4 py-3">
                    <select
                      value={user.tenant_id || ""}
                      onChange={(e) => handleTenantChange(user.id, e.target.value)}
                      disabled={actionLoading === user.id}
                      className="rounded-md border border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-2 py-1 text-xs text-zinc-700 dark:text-zinc-300"
                    >
                      <option value="">No Tenant (Platform)</option>
                      {tenants.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </td>
                  )}
                  <td className="px-4 py-3 text-sm text-zinc-500">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      {user.status === "pending" && (
                        <>
                          <button
                            onClick={() => handleAction(user.id, "approve")}
                            disabled={actionLoading === user.id}
                            className="rounded px-2 py-1 text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleAction(user.id, "reject")}
                            disabled={actionLoading === user.id}
                            className="rounded px-2 py-1 text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {user.status === "active" && user.role !== "admin" && (
                        <button
                          onClick={() => handleAction(user.id, "deactivate")}
                          disabled={actionLoading === user.id}
                          className="rounded px-2 py-1 text-xs font-medium bg-zinc-100 text-zinc-700 hover:bg-zinc-200 disabled:opacity-50"
                        >
                          Deactivate
                        </button>
                      )}
                      {(user.status === "inactive" || user.status === "rejected") && (
                        <button
                          onClick={() => handleAction(user.id, "activate")}
                          disabled={actionLoading === user.id}
                          className="rounded px-2 py-1 text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-50"
                        >
                          Activate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
