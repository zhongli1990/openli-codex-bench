"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { User, getMe, login as apiLogin, logout as apiLogout, removeToken, isAdminRole, hasMinRole as hasMinRoleFn, isSuperAdmin as isSuperAdminFn } from "@/lib/auth";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  hasMinRole: (minRole: string) => boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const userData = await getMe();
      setUser(userData);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);
      await refreshUser();
      setIsLoading(false);
    };
    checkAuth();
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await apiLogin(email, password);
    setUser(response.user);
  }, []);

  const logout = useCallback(() => {
    apiLogout();
    setUser(null);
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: isAdminRole(user?.role),
    isSuperAdmin: isSuperAdminFn(user?.role),
    hasMinRole: (minRole: string) => hasMinRoleFn(user?.role, minRole),
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
