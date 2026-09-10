# home_renov

A home renovation project manager: plan and track rooms, tasks, budget,
contractors and timeline for a renovation. Single-user and local-first — no
accounts, no marketplace.

## Stack

- **Backend** — FastAPI on Python 3.11, run by uvicorn, dependencies via `uv`.
- **Storage** — JSON files on disk in v1, behind a repository interface;
  MongoDB later.
- **Frontend** — React 18 + TypeScript on Vite, styled with Tailwind against the
  design tokens in `docs/design-system-guide.md`.

## Quick start

```bash
make install    # uv sync the backend and npm ci the frontend
make run        # start the API on http://localhost:8000
make check      # the quality gate: backend and frontend, both halves
make hooks      # one-time: activate the git hooks (pre-commit + commit-msg)
```

Interactive API docs at http://localhost:8000/docs once running.

**There is one gate, not two.** `make check` runs the harness check, backend lint
and format, the secret scan, pytest, and then the frontend's own gate — oxlint,
the production build (which type-checks) and Vitest. The pre-commit hook and CI
both call it, so a change that breaks the frontend fails at the same moment as
one that breaks the backend. See `docs/testing-guide.md`.

It follows that `make check` needs `frontend/node_modules`. `make install`
installs both halves; run it once after cloning. If the directory is missing the
gate stops and says so — it never skips the frontend silently, because a gate
that quietly does nothing is trusted while checking nothing.

The frontend also has its own commands, for working inside it:

```bash
cd frontend
npm run dev     # http://localhost:5173 — needs `make run` in another terminal
npm run build   # production build; also type-checks
npm run lint    # oxlint, including the jsx-a11y accessibility rules
npm test        # vitest + React Testing Library (npm run test:watch while working)
```

Node 22 is pinned in `frontend/.nvmrc`; CI reads that same file, so `nvm use`
gives you the version the gate runs.

The dev port is pinned to 5173 because the backend's CORS allowlist names that
origin exactly. Changing it breaks every request with an opaque browser error
rather than a clean 4xx.

`make check` requires [gitleaks](https://github.com/gitleaks/gitleaks) for the
secret scan: `brew install gitleaks`, or grab the binary from its releases page.

## Working in this repo

`AGENTS.md` is the canonical guide for both humans and AI agents: repo map,
commands, project rules, and which document to read before which task. Start
there. Architecture choices and their rationale are in
`ARCHITECTURE-DECISIONS.md`.

Work happens on a branch and reaches `main` only through a squash-merged pull
request that CI has passed — never a direct commit, never a local merge.
`make branch-status` shows what is in flight and what is safe to delete.
`docs/git-guide.md` is the full contract.
