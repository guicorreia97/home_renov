# home_renov

A home renovation project manager: plan and track rooms, tasks, budget,
contractors and timeline for a renovation. Single-user and local-first — no
accounts, no marketplace.

## Stack

- **Backend** — FastAPI on Python 3.11, run by uvicorn, dependencies via `uv`.
- **Storage** — JSON files on disk in v1, behind a repository interface;
  MongoDB later.
- **Frontend** — React + TypeScript on Vite (not created yet).

## Quick start

```bash
make install    # uv sync the backend
make run        # start the API on http://localhost:8000
make check      # the quality gate: lint + format + secret scan + tests
make hooks      # one-time: activate the pre-commit hook
```

Interactive API docs at http://localhost:8000/docs once running.

`make check` requires [gitleaks](https://github.com/gitleaks/gitleaks) for the
secret scan: `brew install gitleaks`, or grab the binary from its releases page.

## Working in this repo

`AGENTS.md` is the canonical guide for both humans and AI agents: repo map,
commands, project rules, and which document to read before which task. Start
there. Architecture choices and their rationale are in
`ARCHITECTURE-DECISIONS.md`.
