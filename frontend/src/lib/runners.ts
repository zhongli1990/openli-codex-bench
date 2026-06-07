/**
 * OpenLi Codex - Enterprise AI Agent Platform
 * Copyright (c) 2026 Lightweight Integration Ltd
 *
 * Single source of truth for the OpenRunner runner types.
 *
 * There are two classes of runner:
 *  - LIVE runners (opencodex, codex, claude, mock): real, backend-backed
 *    runner types. The backend `runner_type` enum accepts exactly these.
 *  - PLACEHOLDER runners (gemini, azure, bedrock, custom): "to be activated"
 *    runners shown in the UI so users can see what's coming, but not yet
 *    wired to a real backend. They are mock-backed: when one is active the
 *    run page sends `runner_type: "mock"` (NOT the placeholder value, which
 *    the backend would 422), and the UI surfaces a placeholder warning.
 *
 * Keep the LIVE list in sync with the backend `runner_type` enum.
 */

export type RunnerType =
  | "codex"
  | "claude"
  | "opencodex"
  | "mock"
  | "gemini"
  | "azure"
  | "bedrock"
  | "custom";

/** The subset of runner types the backend actually accepts. */
export type BackendRunnerType = "codex" | "claude" | "opencodex" | "mock";

export type RunnerStatus = "live" | "placeholder";

export type RunnerInfo = {
  value: RunnerType;
  label: string;
  short: string;
  description: string;
  /** Tailwind color fragment, e.g. "emerald" | "violet" | "sky" | "zinc" */
  color: string;
  /** "live" = real backend runner; "placeholder" = mock-backed, to be activated. */
  status: RunnerStatus;
  /**
   * The runner_type to actually send to the backend. Live runners map to
   * themselves; placeholder runners map to "mock".
   */
  backendRunner: BackendRunnerType;
};

export const RUNNERS: RunnerInfo[] = [
  {
    value: "opencodex",
    label: "OpenCodex",
    short: "OC",
    description: "OpenLI OpenCodex - our 3rd-gen agentic SDK (flagship)",
    color: "sky",
    status: "live",
    backendRunner: "opencodex",
  },
  {
    value: "codex",
    label: "OpenAI Codex",
    short: "OAI",
    description: "OpenAI Codex agent - agentic coding assistant",
    color: "emerald",
    status: "live",
    backendRunner: "codex",
  },
  {
    value: "claude",
    label: "Claude Code",
    short: "CLD",
    description: "Anthropic Claude Code agent - advanced reasoning assistant",
    color: "violet",
    status: "live",
    backendRunner: "claude",
  },
  {
    value: "mock",
    label: "Mock",
    short: "MK",
    description: "Deterministic zero-token mock runner",
    color: "zinc",
    status: "live",
    backendRunner: "mock",
  },
  {
    value: "gemini",
    label: "Gemini",
    short: "GEM",
    description: "Google Gemini agent - placeholder, not yet activated",
    color: "amber",
    status: "placeholder",
    backendRunner: "mock",
  },
  {
    value: "azure",
    label: "Azure OpenAI",
    short: "AZ",
    description: "Azure OpenAI agent - placeholder, not yet activated",
    color: "blue",
    status: "placeholder",
    backendRunner: "mock",
  },
  {
    value: "bedrock",
    label: "AWS Bedrock",
    short: "BR",
    description: "AWS Bedrock agent - placeholder, not yet activated",
    color: "orange",
    status: "placeholder",
    backendRunner: "mock",
  },
  {
    value: "custom",
    label: "Custom Runner",
    short: "CST",
    description: "Bring-your-own runner endpoint - placeholder, not yet activated",
    color: "rose",
    status: "placeholder",
    backendRunner: "mock",
  },
];

/** The default runner: OpenLI's flagship OpenCodex. */
export const DEFAULT_RUNNER: RunnerType = "opencodex";

export const RUNNER_BY_VALUE: Record<RunnerType, RunnerInfo> = RUNNERS.reduce(
  (acc, runner) => {
    acc[runner.value] = runner;
    return acc;
  },
  {} as Record<RunnerType, RunnerInfo>,
);

export function isRunnerType(x: unknown): x is RunnerType {
  return typeof x === "string" && x in RUNNER_BY_VALUE;
}

/** True when the given runner is a not-yet-activated placeholder. */
export function isPlaceholderRunner(value: RunnerType): boolean {
  return RUNNER_BY_VALUE[value]?.status === "placeholder";
}

/**
 * The runner_type to POST to the backend for a given selected runner.
 * Live runners send themselves; placeholder runners send "mock".
 */
export function backendRunnerFor(value: RunnerType): BackendRunnerType {
  return RUNNER_BY_VALUE[value]?.backendRunner ?? "mock";
}
