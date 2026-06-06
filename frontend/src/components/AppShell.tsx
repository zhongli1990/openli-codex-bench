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

import type { ReactNode } from "react";
import { useState } from "react";
import Sidebar from "./Sidebar";
import TopNav from "./TopNav";
import { AppProvider } from "@/contexts/AppContext";

export default function AppShell({ children }: { children: ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <AppProvider>
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
        <div className="flex min-h-screen">
          {/* Desktop Sidebar */}
          <aside 
            className={`hidden md:block border-r border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 transition-all duration-300 flex-shrink-0 ${
              sidebarCollapsed ? 'w-16' : 'w-64'
            }`}
          >
            <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
          </aside>

          {/* Mobile Sidebar Overlay */}
          {mobileMenuOpen && (
            <div 
              className="fixed inset-0 z-40 bg-black/50 md:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
          )}

          {/* Mobile Sidebar */}
          <aside 
            className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-zinc-800 border-r border-zinc-200 dark:border-zinc-700 transform transition-transform duration-300 md:hidden ${
              mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <Sidebar collapsed={false} onToggle={() => setMobileMenuOpen(false)} />
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            <header className="border-b border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800">
              <TopNav onMenuClick={() => setMobileMenuOpen(true)} />
            </header>
            <main className="flex-1 p-4 md:p-6 overflow-auto">
              <div className="w-full max-w-full">{children}</div>
            </main>
          </div>
        </div>
      </div>
    </AppProvider>
  );
}
