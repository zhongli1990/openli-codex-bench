/**
 * Auth API helper functions
 */

const API_BASE = "/api";

export interface User {
  id: string;
  tenant_id: string | null;
  email: string;
  mobile: string | null;
  display_name: string | null;
  status: string;
  role: string;
  created_at: string;
  approved_at: string | null;
  last_login_at: string | null;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface RegisterData {
  email: string;
  password: string;
  mobile?: string;
  display_name?: string;
}

const TOKEN_KEY = "saas-codex-token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Login failed" }));
    throw new Error(error.detail || "Login failed");
  }

  const data: LoginResponse = await res.json();
  setToken(data.access_token);
  return data;
}

export async function register(data: RegisterData): Promise<User> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Registration failed" }));
    throw new Error(error.detail || "Registration failed");
  }

  return res.json();
}

export async function getMe(): Promise<User | null> {
  const token = getToken();
  if (!token) return null;

  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    if (res.status === 401) {
      removeToken();
    }
    return null;
  }

  return res.json();
}

export function logout(): void {
  removeToken();
}

/** Roles that grant admin-level access (sidebar tabs, /admin routes) */
const ADMIN_ROLES = ["admin", "super_admin", "org_admin"];

export function isAdminRole(role: string | undefined | null): boolean {
  return !!role && ADMIN_ROLES.includes(role);
}

/** Role hierarchy levels — higher number = more privileges */
const ROLE_LEVELS: Record<string, number> = {
  super_admin: 5,
  admin: 5,
  org_admin: 4,
  project_admin: 3,
  editor: 2,
  viewer: 1,
};

/** Check if user's role meets or exceeds a minimum role level */
export function hasMinRole(userRole: string | undefined | null, minRole: string): boolean {
  if (!userRole) return false;
  return (ROLE_LEVELS[userRole] || 0) >= (ROLE_LEVELS[minRole] || 0);
}

/** Check if user is a super admin (sees all tenants/resources) */
export function isSuperAdmin(role: string | undefined | null): boolean {
  return role === "super_admin" || role === "admin";
}
