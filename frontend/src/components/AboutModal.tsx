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

import { useState } from "react";

interface VersionHistory {
  version: string;
  date: string;
  features: string[];
}

const VERSION = "0.7.1";
const BUILD_DATE = "Feb 9, 2026";
const PLATFORM_NAME = "OpenLI";
const PRODUCT_NAME = "OpenLI Codex";

const versionHistory: VersionHistory[] = [
  {
    version: "0.7.1",
    date: "Feb 9, 2026",
    features: [
      "5-role RBAC: super_admin, org_admin, project_admin, editor, viewer",
      "Tenant-scoped resource filtering on all API endpoints",
      "Real-time SSE streaming — Codex SDK (reasoning, commands, file changes, todo lists)",
      "Real-time SSE streaming — Claude SDK (token-by-token text, tool calls)",
      "Session persistence across navigation via sessionStorage + SSE reconnect",
      "Role-gated sidebar and admin UI with minRole filtering",
      "User Management: role dropdown, tenant assignment (super_admin)",
      "Fix: useAuth crash on User Management page (AuthProvider wrapper)",
      "Fix: role change 422 error (query param forwarding in API proxy)",
      "Consolidated RBAC design documentation",
    ],
  },
  {
    version: "0.6.9",
    date: "Feb 9, 2026",
    features: [
      "Prompt & Skills Manager microservice (PostgreSQL-backed)",
      "Prompts tab: browse, create, edit, publish prompt templates",
      "Template variable system with typed inputs and live preview",
      "Use Template modal with variable fill and Send to Agent",
      "Template picker dropdown in Agent Console prompt area",
      "10 seed platform templates (SoW, Charter, ADR, PRD, etc.)",
      "Skills CRUD API with versioning and multi-tenant support",
      "File-based skills sync to database",
      "Template usage analytics logging",
      "Categories API with template/skill counts",
    ],
  },
  {
    version: "0.6.8",
    date: "Feb 8, 2026",
    features: [
      "Collapsible sidebar with dark mode",
      "Multi-agent SDK dropdown (7 runners)",
      "Updated branding and descriptions",
      "Improved mobile responsiveness",
    ],
  },
  {
    version: "0.6.7",
    date: "Feb 8, 2026",
    features: [
      "OpenLI branding (uppercase LI)",
    ],
  },
  {
    version: "0.6.6",
    date: "Feb 8, 2026",
    features: [
      "Rebranded to OpenLI Codex",
      "Dual licensing (AGPL-3.0 + Commercial)",
      "Copyright headers and IP protection",
      "Updated documentation and naming structure",
    ],
  },
  {
    version: "0.6.5",
    date: "Feb 8, 2026",
    features: [
      "New favicon and app branding",
      "About modal with version history",
      "Sample users with RBAC display",
      "Settings menu with user roles",
    ],
  },
  {
    version: "0.6.4",
    date: "Feb 8, 2026",
    features: [
      "Skills Management UI with CRUD operations",
      "Hooks Configuration UI (Security, Audit, Compliance)",
      "Playwright E2E tests for Skills and Hooks",
      "RBAC middleware implementation",
      "Navigation bar with Skills/Hooks links",
    ],
  },
  {
    version: "0.6.3",
    date: "Feb 7, 2026",
    features: [
      "Skills Usage Guide documentation",
      "Best practices per role (Sales, PM, Architect)",
      "Cross-runner strategy documentation",
    ],
  },
  {
    version: "0.6.0",
    date: "Feb 7, 2026",
    features: [
      "Claude Agent SDK integration",
      "Skill files with YAML frontmatter",
      "Pre/post tool hooks (security, audit)",
      "10 platform skills (sow-generator, architecture-design, etc.)",
      "SSE streaming improvements",
    ],
  },
  {
    version: "0.5.0",
    date: "Feb 6, 2026",
    features: [
      "File upload/browser/download features",
      "RBAC database tables (tenants, groups, user_groups)",
      "Workspace file management",
    ],
  },
  {
    version: "0.4.0",
    date: "Feb 5, 2026",
    features: [
      "User authentication (JWT)",
      "Admin user management",
      "User approval workflow",
      "Login/Register pages",
    ],
  },
  {
    version: "0.3.0",
    date: "Jan 20, 2026",
    features: [
      "Dashboard with stats",
      "System health monitoring",
      "Recent activity feed",
    ],
  },
  {
    version: "0.2.0",
    date: "Jan 19, 2026",
    features: [
      "Dual runner support (Codex + Claude)",
      "Runner selection dropdown",
      "Session management",
    ],
  },
  {
    version: "0.1.0",
    date: "Jan 18, 2026",
    features: [
      "Initial release",
      "Agent Console UI",
      "Workspace import from GitHub",
      "SSE event streaming",
      "Transcript and Raw Events views",
    ],
  },
];

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AboutModal({ isOpen, onClose }: AboutModalProps) {
  const [activeTab, setActiveTab] = useState<"about" | "history">("about");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-zinc-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-500 px-6 py-4 dark:border-zinc-700">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 backdrop-blur">
              <svg className="h-6 w-6 text-white" viewBox="0 0 100 100" fill="none">
                <circle cx="50" cy="42" r="18" stroke="currentColor" strokeWidth="4"/>
                <circle cx="50" cy="42" r="8" fill="currentColor"/>
                <line x1="50" y1="24" x2="50" y2="16" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                <line x1="50" y1="60" x2="50" y2="68" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                <line x1="32" y1="42" x2="24" y2="42" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                <line x1="68" y1="42" x2="76" y2="42" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{PRODUCT_NAME}</h2>
              <p className="text-sm text-white/80">Enterprise AI Agent Platform</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-white/80 hover:bg-white/20 hover:text-white"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-700">
          <button
            onClick={() => setActiveTab("about")}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "about"
                ? "border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400"
                : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            }`}
          >
            About
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "history"
                ? "border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400"
                : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            }`}
          >
            Version History
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto p-6">
          {activeTab === "about" ? (
            <div className="space-y-6">
              {/* Version Info */}
              <div className="rounded-lg bg-gradient-to-r from-sky-50 to-indigo-50 p-4 dark:from-sky-900/20 dark:to-indigo-900/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">Current Version</p>
                    <p className="text-2xl font-bold text-zinc-900 dark:text-white">v{VERSION}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">Build Date</p>
                    <p className="text-lg font-semibold text-zinc-700 dark:text-zinc-300">{BUILD_DATE}</p>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <h3 className="mb-2 font-semibold text-zinc-900 dark:text-white">Description</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  OpenLI Codex is an enterprise AI agent platform designed for healthcare integration,
                  clinical workflows, and intelligent document generation. Built with cutting-edge 
                  agentic AI platforms, it provides a multi-tenant SaaS architecture with robust
                  RBAC controls and plug-and-play agent SDK support.
                </p>
              </div>

              {/* Key Features */}
              <div>
                <h3 className="mb-2 font-semibold text-zinc-900 dark:text-white">Key Features</h3>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    "Multi-Agent SDKs",
                    "Plug-and-Play Runners",
                    "Prompt Templates",
                    "Skills Management",
                    "Security Hooks",
                    "5-Role RBAC",
                    "Real-time Streaming",
                    "Session Persistence",
                    "NHS/HIPAA Compliance",
                    "Tenant Isolation",
                  ].map((feature) => (
                    <div
                      key={feature}
                      className="flex items-center gap-2 rounded-md bg-zinc-100 px-3 py-2 text-sm dark:bg-zinc-700"
                    >
                      <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-zinc-700 dark:text-zinc-300">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tech Stack */}
              <div>
                <h3 className="mb-2 font-semibold text-zinc-900 dark:text-white">Technology Stack</h3>
                <div className="flex flex-wrap gap-2">
                  {[
                    "Next.js 14",
                    "React 18",
                    "FastAPI",
                    "PostgreSQL",
                    "Docker",
                    "Codex SDK",
                    "Claude SDK",
                    "TailwindCSS",
                    "TypeScript",
                  ].map((tech) => (
                    <span
                      key={tech}
                      className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {versionHistory.map((release) => (
                <div
                  key={release.version}
                  className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="rounded-md bg-indigo-100 px-2 py-1 text-sm font-bold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                      v{release.version}
                    </span>
                    <span className="text-sm text-zinc-500 dark:text-zinc-400">{release.date}</span>
                  </div>
                  <ul className="space-y-1">
                    {release.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                        <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-indigo-400" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-200 bg-zinc-50 px-6 py-3 dark:border-zinc-700 dark:bg-zinc-800/50">
          <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
            © 2026 Lightweight Integration Ltd. OpenLI Codex - Enterprise AI Agent Platform.
          </p>
        </div>
      </div>
    </div>
  );
}

export { VERSION, BUILD_DATE };
