# fleet-bench — Fleet Runner Swap Harness & like-for-like Agent Benchmark

**Prove that OpenRunner's runners drop into a real product, and benchmark the world's best coding
agents — Claude Code, OpenAI Codex, and our own OpenCodex — like-for-like on real enterprise work.**

> © 2026 Lightweight Integration Ltd, UK. A **physical clone of `saas-codex`** (its own ports / DB /
> compose project), repurposed as a controlled benchmark rig. It is intentionally derived from a real
> product so the swap proof runs through an actual session/workspace/streaming surface, not a toy.

---

## Why fleet-bench exists

Two questions, one rig:

1. **Swap proof** — can OpenRunner's runners *replace* a product's existing runner with **no adapter**,
   without breaking the product's UX (sessions, SSE streaming, workspaces, transcripts)? saas-codex's
   backend already routes by `runner_type` over the **same Unified Runner Protocol** OpenRunner speaks
   (`/threads` + `/runs` + `/runs/{id}/events`), so the swap is by config alone — fleet-bench verifies it.
2. **Agent benchmark** — given the *same* real-world task + the *same* workspace, how do the agents
   compare on **process** (tool use, steps, latency, tokens) and **outcome** (grounded correctness)?
   Same inputs → same golds → compare trace/quality/efficiency. Honest and repeatable.

The methodology, phases, and routing live in [`FLEET_BENCH.md`](FLEET_BENCH.md).

---

## The runners under test

| `runner_type` | engine | auth | served by |
|---|---|---|---|
| `opencodex` | OpenLI's 3rd-gen agentic SDK (model-agnostic) | API key | **OpenRunner** (host `9432`) |
| `openai-codex` | real OpenAI Codex agent (`@openai/codex-sdk`) | API key · ChatGPT subscription | OpenRunner (`9430`) or clone-embedded |
| `claude` | real Claude Code agent (`claude-agent-sdk`) | API key · Claude Code subscription | OpenRunner (`9431`) or clone-embedded |
| `mock` | deterministic, zero-token | — | OpenRunner (`9433`) |

Switchable by env (`RUNNER_*_URL`); change one variable at a time (see the controlled-swap procedure).

---

## Proven so far

- **Runner-protocol + body-shape parity VALIDATED** — saas-codex's exact `/threads`+`/runs`+`/events`
  shapes work against OpenRunner's runners → **no adapter**.
- **Product-backend swap PROVEN** — a real session driven through the cloned backend with
  `runner_type=opencodex` created a thread + run on OpenRunner's runner end-to-end.
- **Real-world 3-agent comparison on the Bradford NHS InterSystems estate** (1,412 files —
  ObjectScript `.cls` across RCL/BRI/LTH trusts, topology CSVs, docs):

  | runner · model | auth | tools | tokens | cost | outcome |
  |---|---|---|---|---|---|
  | opencodex · gpt-4o | API | 7 | 9.4k | $0.027 | correct + grounded |
  | openai-codex · gpt-5.5 | ChatGPT sub | 11 | 65.6k | — | correct + grounded, deepest |
  | claude · opus-4-8 | Claude Code sub | 3 | — | — | best-structured |

  All three real agents produced correct grounded analyses; OpenCodex is the model-agnostic,
  lowest-cost option. Cost strategy: subscriptions (codex + claude, no token fee) + `gpt-4o` for
  opencodex (minimal). Reports: `openrunner/tests/fleet-bench/{bradford_parity_report,live_comparison}.md`.

---

## Run

```bash
# OpenRunner runners must be up (host 9430-9433) — they are the swap targets.
cd fleet-bench
docker compose up -d postgres backend          # Phase A core (clone's product backend)
# Phase B/C: drive the same cases with runner_type ∈ {codex, claude, opencodex, mock}
#   POST :9441/api/sessions {runner_type, repo_url}  → routes to the chosen runner
```

Runner-level parity (zero-token, no app boot needed):
```bash
python3 ../openrunner/tests/fleet-bench/parity_report.py     # 4 runners × 3 cases
python3 ../openrunner/tests/fleet-bench/bradford_bench.py    # content-level, Bradford estate
```

## Ports (9440–9459, distinct from saas-codex 9100s)
fe `9440` · be `9441` · codex `9442` · pg `9443` · claude `9444` · prompt `9445` · eval `9446` · memory `9447` · llm-gw `9448`

## Status
- **Phase 1 DONE** — clone + re-range + swap wiring + protocol/body parity validated.
- **Phase 2 — product-backend swap PROVEN** + 3-agent real-world comparison done.
- **Next** — shared workspace volume for content-level cases through the backend, full backend-routed
  runner matrix, Playwright smoke, then the ASOS clone (machine-checkable golds). See `FLEET_BENCH.md`.

## Security
- `.env`, `.env.live`, and `workspaces/` are gitignored. API keys / subscription tokens are env-only,
  never committed. The 30 MB Bradford estate lives under `workspaces/` (ignored).

**© 2026 Lightweight Integration Ltd, UK.**
