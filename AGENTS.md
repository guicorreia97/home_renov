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
| `frontend/` | React + TypeScript (Vite). **Not created yet.** |
| `docs/` | Normative guides. Read before touching the matching area. |
| `docs/plans/` | Dated proposals. Non-normative. Delete once shipped. |

## Core commands

Run from the repo root. `make check` is the definition of "done".

| Command | What it does |
|---|---|
| `make install` | `uv sync` the backend. |
| `make run` | Start the API on :8000. |
| `make check` | **The quality gate**: ruff lint + format + secret scan + pytest. |
| `make fmt` | Auto-fix formatting and safe lint errors. |
| `make test` | pytest only. |
| `make secrets` | Scan the working tree for credentials (gitleaks). |
| `make secrets-history` | Scan the full git history. Slower; run after imports. |
| `make hooks` | One-time: activate the tracked pre-commit hook. |
| `cd backend && uv run ruff check path/to/file.py` | Check one changed file. |

`make check` needs `gitleaks` installed (`brew install gitleaks`, or the binary
from its releases page). It fails loudly if missing rather than skipping the
scan — a gate that silently does nothing is worse than no gate.

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

## Required reading per task

Read the doc before starting; do not infer the convention from surrounding code.

| Situation | Read |
|---|---|
| Adding or changing an endpoint, service, or model | `docs/backend-guide.md` |
| Anything that reads or writes stored data | `docs/persistence-guide.md` |
| Writing or changing tests | `docs/testing-guide.md` |
| Any UI work, any component, any styling | `docs/design-system-guide.md` |
| Handling any credential, token, or connection string | `docs/secrets-guide.md` |
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
| Judging a diff before commit | `reviewer` |
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
- **Observability:** structured logs only; never log user content (rule 4).
- **Secrets:** never paste a real credential into a tracked file, a commit
  message, or a log line. If you find one already committed, stop and tell the
  user it must be rotated — removing it from the working tree does not unleak it.
- **Git:** work on a branch. Conventional Commits (`feat:`, `fix:`, `chore:`,
  `docs:`, `test:`, `refactor:`). **Never push and never open a PR** unless
  explicitly asked. → `.agents/skills/commit-messages/SKILL.md`
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
