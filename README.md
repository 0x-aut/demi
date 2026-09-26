# Demideus (Demi) — Agent Context README

> This README is written in a compressed notation for AI coding agents. Read `§0 Legend` first — every symbol maps to one exact meaning. Precision > prose.

---

## §0 Legend

| Symbol | Meaning |
|---|---|
| `→` | produces / transforms into |
| `⇒` | triggers / causes |
| `⊕` | combined with (both parts required together) |
| `∥` | runs in parallel with |
| `?` | optional / stretch scope, not MVP |
| `!` | MVP-critical, build this first |
| `U` | the developer using Demi |
| `R` | a GitHub repo `U` connects to Demi |
| `S(U)` | `U`'s declared scope (e.g. `frontend`, `backend`, `junior`, `infra`) — a filter, not a role label |
| `Bob(R)` | Bob IDE's generated output for `R` |

---

## §1 What Demi is (one line)

`Demi := Dashboard(Bob(R)) ⊕ AgentLayer(explain, PR-gen, detect)` — a platform that turns a repo a developer has never seen into one they can navigate, understand at their scope, and safely ship fixes/features into, via AI agents.

Built for: **IBM Bob 2.0 Hackathon** (Sep 25–27, 2026), solo dev, Nuxt.

## §2 Core loop

```
R → Bob(R) = {architecture.*, onboarding.*, triage.*}      ! (input contract — lock this shape early)
Bob(R) × S(U) → Demi.render()                                ! scoped, navigable explanation UI
Issue(R) → Agent(context = Bob(R) ⊕ diff-relevant files) → PR(R)   ! issue-to-PR pipeline
R.codebase → Agent.scan() ⇒ Issue(R)                          ? proactive issue creation
{Agent₁, Agent₂, …} ∥ on {part₁, part₂, …} of R               ? concurrent multi-agent PRs
U.assignedIssues(R) → Tab.track() → U.triggers(fix|inspect)   ! issue tracking tab
```

Read top to bottom = build priority order. `!` rows are the demo spine; `?` rows are stretch.

## §3 Feature set (F1…F5)

- **F1** `!` Repo onboarding dashboard: parse `Bob(R)`, render architecture/onboarding/triage as navigable UI.
- **F2** `!` Scope-aware code explanation: same `Bob(R)` data, filtered/re-explained per `S(U)`.
- **F3** `!` Issue → PR agent: takes a GitHub issue, generates a patch, opens PR on `R`.
- **F4** `?` Proactive codebase scan → auto-files issues on `R`.
- **F5** `?` Multi-agent concurrency: N agents on N code-areas simultaneously, visible status per agent.
- **F6** `!` "My issues" tab: issues assigned to `U` across connected repos, action buttons → F3 or manual inspect.

## §4 Stack

### 4.1 Core (locked in)
| Layer | Choice |
|---|---|
| Framework | Nuxt 3 (Vue 3, `<script setup>`, TS) |
| Server | Nitro server routes (`server/api/*`) — all external calls (GitHub, watsonx) live here, never client-side |
| Styling | Tailwind CSS |
| State | Pinia |
| Repo integration | GitHub REST/GraphQL via Octokit; GitHub OAuth App for `U` auth |
| AI (F1–F3) | watsonx.ai (Granite models) — chat/text completion, called from Nitro routes |

### 4.2 AI layer detail
- `watsonx.ai` = default. One SDK/REST integration point (`server/utils/watsonx.ts`), reused for F1–F4. Auth = API key + project ID, env vars only, never client-exposed.
- `watsonx Orchestrate` = `?` — only if F5 gets built for real (not mocked). Needs ADK + Developer Edition (Docker, Python 3.11+). High setup cost relative to hackathon time; do not start this before F1–F3 are demo-stable.
- Fallback/alt model provider = keep the watsonx call behind a thin interface (`generate(prompt, context): string`) so swapping providers later ≠ rewrite.

### 4.3 Possible additions (not yet decided — evaluate only if a feature needs it, don't pre-adopt)
| Need | Candidate(s) |
|---|---|
| Persist scoped prefs / issue cache | SQLite (local/hackathon) → Postgres/Supabase (if it grows) |
| Background PR-gen jobs (avoid blocking request) | Nitro tasks / BullMQ + Redis (only if F3 latency becomes a UX problem) |
| Live agent status (F5) | SSE from Nitro route, or WebSocket if bidirectional needed |
| Repo-change triggers (F4) | GitHub Webhooks → Nitro endpoint |
| Alt multi-agent frameworks (if Orchestrate too heavy) | LangGraph, CrewAI — lighter-weight parallel-agent patterns, no Docker requirement |
| Validation | Zod on all Nitro route inputs (issue payloads, webhook payloads) |
| Hosting | Vercel/Netlify (fastest for Nuxt) or IBM Cloud Code Engine (stronger IBM-stack narrative for judging) |

## §5 Build order (as agreed, do not reorder without reason)

1. UI first (F1 shell) — use Bob itself to scaffold components/pages, hasten dev time.
2. Wire F1 to real `Bob(R)` output shape — confirm structure before building against assumptions.
3. F2 (scope filter on top of F1's data).
4. F3 (issue → PR), single-agent, synchronous is fine for demo.
5. F6 (issues tab) — mostly UI + GitHub API reads, cheap to add once F3 exists.
6. F4/F5 only if time remains after 1–5 are demo-stable.

## §6 Non-negotiables for any agent editing this repo

- All secrets (GitHub token, watsonx API key/project ID) stay server-side (Nitro), never in client bundle.
- `Bob(R)` parsing logic isolated in one module — if Bob's output shape changes, one file changes.
- watsonx calls go through the single interface in §4.2 — no direct SDK calls scattered across routes.
- Every AI-generated PR must be traceable to the source issue it was generated from (store issue ↔ PR link).