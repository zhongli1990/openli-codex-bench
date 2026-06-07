/**
 * OpenLI Codex - Enterprise AI Agent Platform
 * Copyright (c) 2026 Lightweight Integration Ltd
 *
 * Top-bar runner switcher. Bound to the shared runnerType/setRunnerType from
 * AppContext so the active runner can be changed anytime and persists
 * (localStorage). The active runner is what the run page sends as runner_type.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { RUNNERS, RUNNER_BY_VALUE, isPlaceholderRunner } from "@/lib/runners";

export default function RunnerSwitcher() {
  const { runnerType, setRunnerType } = useAppContext();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const firstOptionRef = useRef<HTMLButtonElement | null>(null);

  const active = RUNNER_BY_VALUE[runnerType] ?? RUNNERS[0];

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", onClick);
      return () => document.removeEventListener("mousedown", onClick);
    }
  }, [open]);

  // When the dropdown opens, move focus to the first option for keyboard users.
  useEffect(() => {
    if (open) {
      firstOptionRef.current?.focus();
    }
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        ref={buttonRef}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
        title="Active runner"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span
          className={`flex h-5 w-7 items-center justify-center rounded text-[10px] font-bold bg-${active.color}-100 text-${active.color}-700`}
        >
          {active.short}
        </span>
        <span className="hidden sm:inline">{active.label}</span>
        <svg
          className={`h-3.5 w-3.5 text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              setOpen(false);
              buttonRef.current?.focus();
            }
          }}
          className="absolute right-0 z-50 mt-1 w-60 rounded-md border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-800"
        >
          {RUNNERS.map((runner, index) => {
            const selected = runner.value === runnerType;
            const placeholder = runner.status === "placeholder";
            const selectRunner = () => {
              setRunnerType(runner.value);
              setOpen(false);
              buttonRef.current?.focus();
            };
            return (
              <button
                key={runner.value}
                ref={index === 0 ? firstOptionRef : undefined}
                role="option"
                aria-selected={selected}
                onClick={selectRunner}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    selectRunner();
                  }
                }}
                className={`flex w-full items-start gap-2.5 px-3 py-2 text-left text-xs transition-colors ${
                  selected
                    ? "bg-zinc-100 dark:bg-zinc-700"
                    : "hover:bg-zinc-50 dark:hover:bg-zinc-700/50"
                } ${placeholder ? "opacity-60" : ""}`}
              >
                <span
                  className={`mt-0.5 flex h-5 w-7 flex-shrink-0 items-center justify-center rounded text-[10px] font-bold bg-${runner.color}-100 text-${runner.color}-700`}
                >
                  {runner.short}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="font-medium text-zinc-900 dark:text-white">{runner.label}</span>
                    {placeholder && (
                      <span className="rounded bg-amber-100 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                        Soon
                      </span>
                    )}
                    {selected && <span className="text-zinc-400">✓</span>}
                  </span>
                  <span className="block truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                    {runner.description}
                  </span>
                </span>
              </button>
            );
          })}
          {isPlaceholderRunner(runnerType) && (
            <div className="mx-2 mt-1 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-[10px] leading-snug text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300">
              <span className="font-semibold">{active.label} is a placeholder runner</span> — not yet
              activated; running against the Mock runner.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
