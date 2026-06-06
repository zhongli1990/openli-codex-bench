/**
 * OpenLI Codex - Enterprise AI Agent Platform
 * Copyright (c) 2026 Lightweight Integration Ltd
 * 
 * This file is part of OpenLI Codex.
 * Licensed under AGPL-3.0 (community) or Commercial license.
 * See LICENSE file for details.
 * 
 * Contact: Zhong@li-ai.co.uk
 */

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getMe, logout, User, hasMinRole } from "@/lib/auth";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/projects", label: "Projects", icon: "📁" },
  { href: "/codex", label: "Agents", icon: "🤖" },
  { href: "/chat", label: "Chat", icon: "💬" },
  { href: "/prompts", label: "Prompts", icon: "📝" },
  { href: "/settings", label: "Settings", icon: "⚙️" }
];

// Admin items with minimum role required to see each
const adminItems = [
  { href: "/admin/users", label: "User Management", icon: "👥", minRole: "org_admin" },
  { href: "/admin/skills", label: "Skills", icon: "🛠️", minRole: "project_admin" },
  { href: "/admin/hooks", label: "Hooks", icon: "🔗", minRole: "org_admin" }
];

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export default function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    getMe().then(setUser);
  }, []);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  // Filter admin items to only those the user's role can access
  const visibleAdminItems = adminItems.filter(i => hasMinRole(user?.role, i.minRole));

  return (
    <div className={`flex h-full flex-col p-4 transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}>
      <div className="mb-6">
        <button
          onClick={onToggle}
          className="flex items-center gap-2 w-full text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md p-1 -m-1"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 via-indigo-500 to-purple-500 flex-shrink-0">
            <span className="text-white text-sm">LI</span>
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <div className="text-sm font-semibold text-zinc-900 dark:text-white">OpenLI Codex</div>
              <div className="text-[10px] text-zinc-500 dark:text-zinc-400">Clinical Integration SaaS</div>
            </div>
          )}
        </button>
      </div>
      <nav className="flex flex-col gap-1">
        {items.map((i) => {
          const active = pathname === i.href;
          const baseClass = "rounded-md px-3 py-2 text-sm flex items-center gap-2 transition-colors";
          const activeClass = "bg-zinc-200 dark:bg-zinc-700 font-medium text-zinc-900 dark:text-white";
          const inactiveClass = "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white";

          return (
            <Link
              key={i.href}
              href={i.href}
              className={`${baseClass} ${active ? activeClass : inactiveClass}`}
              aria-current={active ? "page" : undefined}
              title={i.label}
            >
              <span>{i.icon}</span>
              {!collapsed && <span>{i.label}</span>}
            </Link>
          );
        })}

        {visibleAdminItems.length > 0 && (
          <>
            <div className="my-2 border-t border-zinc-200 dark:border-zinc-700" />
            {!collapsed && <div className="px-3 py-1 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">Admin</div>}
            {visibleAdminItems.map((i) => {
              const active = pathname === i.href || pathname.startsWith(i.href);
              const baseClass = "rounded-md px-3 py-2 text-sm flex items-center gap-2 transition-colors";
              const activeClass = "bg-zinc-200 dark:bg-zinc-700 font-medium text-zinc-900 dark:text-white";
              const inactiveClass = "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white";

              return (
                <Link
                  key={i.href}
                  href={i.href}
                  className={`${baseClass} ${active ? activeClass : inactiveClass}`}
                  aria-current={active ? "page" : undefined}
                  title={i.label}
                >
                  <span>{i.icon}</span>
                  {!collapsed && <span>{i.label}</span>}
                </Link>
              );
            })}
          </>
        )}
      </nav>
      <div className="mt-auto pt-4 space-y-3">
        {user && (
          <div className="rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-3">
            {!collapsed ? (
              <>
                <div className="text-xs font-medium text-zinc-900 dark:text-white truncate">
                  {user.display_name || user.email}
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{user.email}</div>
                <button
                  onClick={handleLogout}
                  className="mt-2 w-full rounded px-2 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-white"
                >
                  Sign out
                </button>
              </>
            ) : (
              <button
                onClick={handleLogout}
                className="w-full text-center text-lg"
                title="Sign out"
              >
                🚪
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
