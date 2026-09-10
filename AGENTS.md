# home_renov — agent harness

Home renovation project manager: plan and track rooms, tasks, budget, contractors
and timeline for a renovation. **Single-user, local-first. No user accounts, no
auth, no marketplace in v1** — if a request implies any of those, stop and ask.

This file is the canonical harness config. `CLAUDE.md` is a symlink to it.
Keep it short: deep explanations belong in `docs/`, linked from the tables below.

## Repo map

| Path | Purpose |
|---|---|
| `backend/` | FastAPI service (Python 3.11, uv). The only server-side runtime. |
| `backend/app/api/` | Routers and endpoints. Thin: parse, validate, delegate. |
| `backend/app/src/services/` | Business logic. No HTTP, no file/DB access. |
| `backend/app/src/models/` | Pydantic domain models. |
| `backend/app/src/utils/` | Cross-cutting helpers only. |
| `backend/app/logging/` | Structured JSON logger (`log_config` singleton). |
| `backend/config/` | Settings + per-environment `.env` files. |
| `backend/tests/` | pytest suite. |
| `frontend/` | React + TypeScript (Vite). The expenses screen, shared components, Vitest. |
| `frontend/src/api/` | The only place `fetch` is called. Money crosses the wire as a **string**. |
| `docs/` | Normative guides. Read before touching the matching area. |
| `scripts/` | Repo-wide shell checks called by the Makefile. |
| `openspec/` | Change proposals and shipped specs. The only planning home. |

## Core commands

Run from the repo root. `make check` is the definition of "done".

| Command | What it does |
|---|---|
| `make install` | `uv sync` the backend and `npm ci` the frontend. Run once after cloning. |
| `make run` | Start the API on :8000. |
| `make check` | **The quality gate**: harness coherence + ruff lint + format + secret scan + pytest + the frontend gate. |
| `make fmt` | Auto-fix formatting and safe lint errors. |
| `make test` | pytest only. |
| `make check-frontend` | The frontend half alone: oxlint + build (type-checks) + Vitest. |
| `make secrets` | Scan the working tree for credentials (gitleaks). |
| `make secrets-history` | Scan the full git history. Slower; run after imports. |
| `make branch NAME=<type>/<slug>` | Fetch, then branch off `origin/main`. **Start every change with this.** |
| `make branch-status` | Audit branches against `origin/main`; shows what is safe to delete. |
| `make harness-check` | Fail when a doc and the rule it describes have drifted apart. |
| `make hooks` | One-time: activate the tracked git hooks. |
| `cd backend && uv run ruff check path/to/file.py` | Check one changed file. |

`make check` covers **both** halves of the repo — a change that breaks the
frontend fails the gate exactly as a broken backend does. There is one gate, not
two, because the hook and CI both call this one target.

It therefore needs `gitleaks` installed (`brew install gitleaks`, or the binary
from its releases page) and `frontend/node_modules` present (`make install`).
Either one missing fails loudly rather than skipping the step it enables — a
gate that silently does nothing is worse than no gate, because it is trusted.

Never invoke `pip`, `poetry`, or a bare `python`. Dependencies are managed by
`uv` only: `cd backend && uv add <pkg>` (or `uv add --dev <pkg>`).

## Project rules

These are invariants. Breaking one is a defect even if tests pass.

1. **Layering: `api → services → repositories`.** Endpoints parse, validate and
   delegate — no business logic in a route handler. Services never import
   FastAPI and never touch a file or database directly. → `docs/backend-guide.md`
2. **All persistence sits behind a repository interface.** v1 stores JSON files;
   MongoDB comes later. No `json.load`, `open()`, or driver call outside
   `app/src/repositories/`. → `docs/persistence-guide.md`
3. **Full type hints, Pydantic at the boundaries.** Every function is annotated.
   Request and response bodies are Pydantic models, never bare dicts. Enforced
   by ruff `ANN`.
4. **Structured logging only.** Use `log_config.get_logger()`. `print()` is
   banned (ruff `T20`). Never log secrets, addresses, contractor details, or any
   renovation note content — log IDs and counts instead.
5. **Every endpoint has a test.** A new route without a pytest covering it is
   incomplete work. → `docs/testing-guide.md`
6. **Secrets never enter git.** Real credentials live only in untracked
   `config/envs/.env.<env>` files. `.env.example` and `.env.testing` are
   committed and **allowlisted in `.gitleaks.toml`**, so a real credential
   placed there is scanned by nothing — they must hold dummy values only.
   Never hardcode a credential in source: `make check` runs gitleaks plus ruff
   `S105`-`S107`, and neither may be silenced to get a commit through.
   → `docs/secrets-guide.md`
7. **The frontend follows the design system.** Colors, spacing and component
   shapes come from `docs/design-system-guide.md` — do not invent new tokens.
8. **Never modify agent-control files unless explicitly asked** — `AGENTS.md`,
   `CLAUDE.md`, `.claude/**`, `.agents/**`, `.github/**`. If asked, keep the
   change in its own commit.
9. **Branch, commit and merge by the workflow.** Every change is a branch off
   `main`, squash-merged through a green pull request — never a direct commit
   to `main` and never a local merge into it. `feat/**` needs an OpenSpec
   change proposal first, and its commits carry a `Change:` trailer. Push
   branches freely; opening or merging a PR is the user's call.
   → `docs/git-guide.md`

## Required reading per task

Read the doc before starting; do not infer the convention from surrounding code.

| Situation | Read |
|---|---|
| Adding or changing an endpoint, service, or model | `docs/backend-guide.md` |
| Anything that reads or writes stored data | `docs/persistence-guide.md` |
| Writing or changing tests | `docs/testing-guide.md` |
| Any UI work, any component, any styling | `docs/design-system-guide.md` |
| Handling any credential, token, or connection string | `docs/secrets-guide.md` |
| Branching, committing, merging, or cleaning up branches | `docs/git-guide.md` |
| Choosing between two viable architectures | `ARCHITECTURE-DECISIONS.md` |

## Delegation rule

Work that is large, exploratory, repetitive, parallelizable, or token-heavy
**MUST** be delegated to a sub-agent with its own context window and scoped
tools. The main agent is an orchestrator: it plans, delegates, and decides on
distilled results. It does not read twenty files into its own context to answer
one question.

| Work type | Sub-agent |
|---|---|
| "Where is X?", "How is Y done?", any multi-file search | `explorer` |
| Judging a branch diff before a PR | `reviewer` |
| Writing pytest tests for a module | `test-writer` |
| Building React components | `ui-builder` |

Definitions live in `.claude/agents/`. Give a sub-agent no more tools than its
job needs.

## Agent loop

**Plan → Act → Observe → Adjust → Conclude.**

- **Stopping criterion:** `make check` passes. Nothing is "done" before that,
  and a passing gate is the only evidence accepted — not "the change looks right".
- **On failure:** read the actual error, fix the cause, re-run the gate. Do not
  loosen a lint rule, delete a failing test, or add `# noqa` to make the gate
  pass. If a rule is genuinely wrong, say so and ask.
- **Verify before you assert.** State a fact about the repo only after checking
  it in this session — especially before declaring a rule inapplicable, a
  constraint unmet, or a deviation necessary. Git refs are the usual trap: `main`
  is a local cache and is stale by default, so `git fetch` first or read
  `origin/main`. "I checked and X" and "X is presumably true" must never come out
  sounding the same.
- **Observability:** structured logs only; never log user content (rule 4).
- **Secrets:** never paste a real credential into a tracked file, a commit
  message, or a log line. If you find one already committed, stop and tell the
  user it must be rotated — removing it from the working tree does not unleak it.
- **Git:** branch off `main`, Conventional Commits, squash-merge via PR.
  Pushing a branch needs no permission; **never open a PR and never merge**
  unless explicitly asked. → `docs/git-guide.md`,
  `.agents/skills/commit-messages/SKILL.md`
- **Human review required before:** changing the storage layer or its on-disk
  format, adding a dependency, changing anything under rule 8, and any first
  deploy-facing config.

## Recurrent errors

Append here when a mistake happens twice. Keep entries one line.

- CORS was `allow_origins=["*"]` with `allow_credentials=True` — browsers reject
  that pairing. Add explicit origins; never widen back to `"*"`.
- `config/settings.py` resolves `.env` paths **relative to the working
  directory**, so backend commands must run from `backend/`. The `Makefile`
  handles this; do not run `pytest` from the repo root.
- `.env.example` and `.env.testing` are gitleaks-allowlisted by path, so the
  scanner will not save you there — they are the one place a real secret can be
  committed silently.
- The app will not boot if `config/envs/.env.<APP_ENV>` is missing — it raises
  `FileNotFoundError` at import time, not a clean startup error.
- Local `main` is stale until fetched, and under squash-merge a landed branch
  then looks unmerged — an agent believed that and built a workaround it did not
  need. Start with `make branch NAME=…`; never judge `main` you have not fetched.
- "Has this branch landed?" is answered by `scripts/branch-landed.sh`, not by
  ahead-count and not by comparing trees. Both of those look correct the day you
  write them and rot on the next merge; the test pins that down.
- A test suite in the gate must survive a loaded machine. The frontend suite's
  5s default timeout failed under load with nothing broken; `testTimeout` in
  `frontend/vite.config.ts` is deliberate headroom, not a workaround.
