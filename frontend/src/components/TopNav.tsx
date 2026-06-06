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

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getMe, logout, User } from "@/lib/auth";
import AboutModal, { VERSION } from "./AboutModal";
import SettingsMenu from "./SettingsMenu";

interface TopNavProps {
  onMenuClick?: () => void;
}

export default function TopNav({ onMenuClick }: TopNavProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [showAbout, setShowAbout] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    getMe().then(setUser);
  }, []);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <>
      <div className="flex w-full items-center justify-between px-4 md:px-6 py-3">
        <div className="flex items-center gap-4 md:gap-6">
          {/* Mobile Menu Button */}
          <button
            onClick={onMenuClick}
            className="md:hidden p-2 rounded-md text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            aria-label="Open menu"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Logo and Brand */}
          <button
            onClick={() => setShowAbout(true)}
            className="flex items-center gap-3 rounded-lg px-2 py-1 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 via-indigo-500 to-purple-500">
              <span className="text-white text-sm font-bold">LI</span>
            </div>
            <div className="text-left">
              <div className="text-sm font-semibold text-zinc-900 dark:text-white">OpenLI Codex</div>
              <div className="text-[10px] text-zinc-500 dark:text-zinc-400">v{VERSION}</div>
            </div>
          </button>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <Link 
              href="/codex" 
              className="rounded-md px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
            >
              Agent
            </Link>
            <Link 
              href="/admin/skills" 
              className="rounded-md px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
            >
              Skills
            </Link>
            <Link 
              href="/admin/hooks" 
              className="rounded-md px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
            >
              Hooks
            </Link>
          </nav>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Settings Button */}
          <button
            onClick={() => setShowSettings(true)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            title="Settings & RBAC"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          {/* About Button */}
          <button
            onClick={() => setShowAbout(true)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            title="About"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          {/* User section */}
          {user ? (
            <>
              <div className="hidden rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 md:block">
                {user.display_name || user.email}
              </div>
              <button
                onClick={handleLogout}
                className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-700 dark:hover:bg-zinc-600"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-700 dark:hover:bg-zinc-600"
            >
              Login
            </Link>
          )}
        </div>
      </div>

      {/* Modals */}
      <AboutModal isOpen={showAbout} onClose={() => setShowAbout(false)} />
      <SettingsMenu isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </>
  );
}
