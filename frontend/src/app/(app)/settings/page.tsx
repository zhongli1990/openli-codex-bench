"use client";

import { useState, useEffect, useCallback } from "react";
import { RUNNERS, DEFAULT_RUNNER, type RunnerType } from "@/lib/runners";
import { useAppContext } from "@/contexts/AppContext";

type SettingsCategory = "general" | "appearance" | "about";

// The LLM model behind each runner is FIXED server-side by the cost model
// (it is not user-selectable). Surface it as read-only text sourced here so the
// Settings page can't misrepresent control. Placeholder runners are mock-backed.
const RUNNER_FIXED_MODEL: Record<RunnerType, string> = {
  opencodex: "gpt-4o",
  codex: "gpt-5.5",
  claude: "claude-opus-4-8",
  mock: "—",
  gemini: "—",
  azure: "—",
  bedrock: "—",
  custom: "—",
};

type Settings = {
  general: {
    defaultRunner: RunnerType;
    sessionTimeout: number;
    autoSave: boolean;
  };
  appearance: {
    theme: string;
    compactMode: boolean;
    codeFont: string;
    syntaxTheme: string;
  };
};

const DEFAULT_SETTINGS: Settings = {
  general: {
    defaultRunner: DEFAULT_RUNNER,
    sessionTimeout: 60,
    autoSave: true,
  },
  appearance: {
    theme: "system",
    compactMode: false,
    codeFont: "fira-code",
    syntaxTheme: "one-dark",
  },
};

function loadSettings(): Settings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const stored = localStorage.getItem("saas-codex-settings");
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error("Failed to load settings:", e);
  }
  return DEFAULT_SETTINGS;
}

function saveSettings(settings: Settings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("saas-codex-settings", JSON.stringify(settings));
  } catch (e) {
    console.error("Failed to save settings:", e);
  }
}

function applyTheme(theme: string): void {
  if (typeof window === "undefined") return;
  const root = document.documentElement;
  
  if (theme === "dark") {
    root.classList.add("dark");
  } else if (theme === "light") {
    root.classList.remove("dark");
  } else {
    // System preference
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (prefersDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }
}

function SettingsSidebar({ 
  active, 
  onSelect 
}: { 
  active: SettingsCategory; 
  onSelect: (cat: SettingsCategory) => void;
}) {
  const categories: { id: SettingsCategory; label: string; icon: string }[] = [
    { id: "general", label: "General", icon: "⚙️" },
    { id: "appearance", label: "Appearance", icon: "🎨" },
    { id: "about", label: "About", icon: "ℹ️" },
  ];

  return (
    <nav className="space-y-1">
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.id)}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            active === cat.id
              ? "bg-zinc-900 text-white"
              : "text-zinc-700 hover:bg-zinc-100"
          }`}
        >
          <span>{cat.icon}</span>
          {cat.label}
        </button>
      ))}
    </nav>
  );
}

function GeneralSettings({ 
  settings, 
  onUpdate 
}: {
  settings: Settings;
  onUpdate: (settings: Settings) => void;
}) {
  const [saved, setSaved] = useState(false);
  // Bind the default-runner control to the shared AppContext runner so the
  // Settings choice actually drives (and stays in sync with) the active runner.
  const { runnerType, setRunnerType } = useAppContext();

  const handleSave = () => {
    onUpdate(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const updateGeneral = (key: keyof Settings["general"], value: string | number | boolean) => {
    onUpdate({
      ...settings,
      general: { ...settings.general, [key]: value }
    });
  };

  const handleSelectRunner = (value: RunnerType) => {
    // Drive the active/default runner via AppContext (persists to the same key
    // getInitialRunnerType reads + takes effect immediately, consistent with
    // the top-bar switcher) and mirror into settings persistence.
    setRunnerType(value);
    updateGeneral("defaultRunner", value);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-zinc-900">General Settings</h3>
        <p className="mt-1 text-sm text-zinc-500">Configure your default preferences</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700">Default Runner</label>
          <p className="text-xs text-zinc-500 mt-0.5">Select the AI runner for new sessions</p>
          <div className="mt-2 space-y-2">
            {RUNNERS.map((runner) => {
              const placeholder = runner.status === "placeholder";
              return (
                <label
                  key={runner.value}
                  className={`flex items-center gap-3 p-3 rounded-lg border border-zinc-200 cursor-pointer hover:bg-zinc-50 ${
                    placeholder ? "opacity-70" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="runner"
                    value={runner.value}
                    checked={runnerType === runner.value}
                    onChange={() => handleSelectRunner(runner.value)}
                    className="w-4 h-4 text-zinc-900"
                  />
                  <span
                    className={`flex h-6 w-8 flex-shrink-0 items-center justify-center rounded text-[10px] font-bold bg-${runner.color}-100 text-${runner.color}-700`}
                  >
                    {runner.short}
                  </span>
                  <div>
                    <p className="flex items-center gap-1.5 text-sm font-medium text-zinc-900">
                      {runner.label}
                      {placeholder && (
                        <span className="rounded bg-amber-100 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-700">
                          Soon
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-zinc-500">{runner.description}</p>
                  </div>
                  <span className="ml-auto rounded bg-zinc-100 px-2 py-0.5 font-mono text-[11px] text-zinc-500">
                    {RUNNER_FIXED_MODEL[runner.value]}
                  </span>
                </label>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            The model behind each runner is fixed by the cost model and is not user-configurable.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700">Session Timeout</label>
          <p className="text-xs text-zinc-500 mt-0.5">Minutes before inactive sessions expire</p>
          <input
            type="number"
            value={settings.general.sessionTimeout}
            onChange={(e) => updateGeneral("sessionTimeout", parseInt(e.target.value) || 60)}
            min={5}
            max={480}
            className="mt-2 w-32 rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          />
        </div>

        <div>
          <label className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-700">Auto-save Messages</p>
              <p className="text-xs text-zinc-500">Automatically persist all chat messages</p>
            </div>
            <button
              onClick={() => updateGeneral("autoSave", !settings.general.autoSave)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.general.autoSave ? "bg-zinc-900" : "bg-zinc-200"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.general.autoSave ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </label>
        </div>
      </div>

      <div className="pt-4 border-t border-zinc-200 flex items-center gap-3">
        <button 
          onClick={handleSave}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Save Changes
        </button>
        {saved && <span className="text-sm text-green-600">✓ Saved</span>}
      </div>
    </div>
  );
}

function AppearanceSettings({
  settings, 
  onUpdate 
}: { 
  settings: Settings; 
  onUpdate: (settings: Settings) => void;
}) {
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onUpdate(settings);
    applyTheme(settings.appearance.theme);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const updateAppearance = (key: keyof Settings["appearance"], value: string | boolean) => {
    const newSettings = {
      ...settings,
      appearance: { ...settings.appearance, [key]: value }
    };
    onUpdate(newSettings);
    if (key === "theme") {
      applyTheme(value as string);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-zinc-900">Appearance</h3>
        <p className="mt-1 text-sm text-zinc-500">Customize the look and feel</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700">Theme</label>
          <div className="mt-2 flex gap-2">
            {["light", "dark", "system"].map((t) => (
              <button
                key={t}
                onClick={() => updateAppearance("theme", t)}
                className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-colors ${
                  settings.appearance.theme === t
                    ? "bg-zinc-900 text-white"
                    : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <p className="text-xs text-zinc-400 mt-2">Theme changes apply immediately</p>
        </div>

        <div>
          <label className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-700">Compact Mode</p>
              <p className="text-xs text-zinc-500">Reduce spacing for dense layouts</p>
            </div>
            <button
              onClick={() => updateAppearance("compactMode", !settings.appearance.compactMode)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.appearance.compactMode ? "bg-zinc-900" : "bg-zinc-200"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.appearance.compactMode ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700">Code Font</label>
          <select
            value={settings.appearance.codeFont}
            onChange={(e) => updateAppearance("codeFont", e.target.value)}
            className="mt-2 w-full max-w-xs rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          >
            <option value="fira-code">Fira Code</option>
            <option value="jetbrains-mono">JetBrains Mono</option>
            <option value="monaco">Monaco</option>
            <option value="source-code-pro">Source Code Pro</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700">Syntax Theme</label>
          <select
            value={settings.appearance.syntaxTheme}
            onChange={(e) => updateAppearance("syntaxTheme", e.target.value)}
            className="mt-2 w-full max-w-xs rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          >
            <option value="one-dark">One Dark</option>
            <option value="github">GitHub</option>
            <option value="dracula">Dracula</option>
            <option value="monokai">Monokai</option>
          </select>
        </div>
      </div>

      <div className="pt-4 border-t border-zinc-200 flex items-center gap-3">
        <button 
          onClick={handleSave}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Save Changes
        </button>
        {saved && <span className="text-sm text-green-600">✓ Saved</span>}
      </div>
    </div>
  );
}

function AboutSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-zinc-900">About</h3>
        <p className="mt-1 text-sm text-zinc-500">Application information and resources</p>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-lg bg-zinc-900 flex items-center justify-center">
            <span className="text-2xl text-white">🚀</span>
          </div>
          <div>
            <h4 className="text-xl font-bold text-zinc-900">OpenLi Codex</h4>
            <p className="text-sm text-zinc-500">AI-Powered Healthcare Integration Platform</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <p className="text-xs text-zinc-500">Version</p>
          <p className="text-sm font-medium text-zinc-900">v0.3.0</p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <p className="text-xs text-zinc-500">Build</p>
          <p className="text-sm font-medium text-zinc-900 font-mono">1d4b9db</p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <p className="text-xs text-zinc-500">License</p>
          <p className="text-sm font-medium text-zinc-900">Enterprise</p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <p className="text-xs text-zinc-500">Environment</p>
          <p className="text-sm font-medium text-zinc-900">Development</p>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-medium text-zinc-900">Resources</h4>
        <div className="space-y-1">
          <a
            href="https://github.com/zhongli1990/openli-codex-bench"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
          >
            <span>📦</span> GitHub Repository
          </a>
          <a
            href="#"
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
          >
            <span>📚</span> Documentation
          </a>
          <a
            href="#"
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
          >
            <span>💬</span> Support
          </a>
        </div>
      </div>

      <div className="pt-4 border-t border-zinc-200 text-center text-xs text-zinc-400">
        © 2026 OpenLi Codex. All rights reserved.
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>("general");
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  // Load settings from localStorage on mount
  useEffect(() => {
    const loaded = loadSettings();
    setSettings(loaded);
    applyTheme(loaded.appearance.theme);
  }, []);

  // Save and update settings
  const handleUpdate = useCallback((newSettings: Settings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Settings</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Configure your workspace and integration preferences
        </p>
      </div>

      {/* Settings Layout */}
      <div className="flex gap-8">
        {/* Sidebar */}
        <div className="w-48 flex-shrink-0">
          <SettingsSidebar active={activeCategory} onSelect={setActiveCategory} />
        </div>

        {/* Content */}
        <div className="flex-1 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          {activeCategory === "general" && <GeneralSettings settings={settings} onUpdate={handleUpdate} />}
          {activeCategory === "appearance" && <AppearanceSettings settings={settings} onUpdate={handleUpdate} />}
          {activeCategory === "about" && <AboutSettings />}
        </div>
      </div>
    </div>
  );
}
