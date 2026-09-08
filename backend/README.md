# home_renov backend

FastAPI service. Python 3.11, managed by [uv](https://docs.astral.sh/uv/).

## Setup

Install uv once:

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

Then, from the repo root:

```bash
make install
```

`uv` creates `.venv/` and installs the locked dependencies itself — there is no
manual venv step and no `pip install`.

## Running

```bash
make run                       # from the repo root
cd backend && uv run start     # equivalent
```

Commands must run with `backend/` as the working directory: `config/settings.py`
resolves `.env` paths relative to the cwd. The `Makefile` handles this.

## Environment

`config/.env` selects the environment via `APP_ENV`; the matching
`config/envs/.env.<APP_ENV>` supplies the values.

- `.env.example` — the template. Committed.
- `.env.testing` — dummy values so tests and CI can boot. Committed.
- `.env.development` — yours, untracked. Copy from `.env.example`.

**Never commit real credentials.** A missing env file raises `FileNotFoundError`
at import time, before the server starts.

## Dependencies

```bash
uv add <package>          # runtime
uv add --dev <package>    # tooling
```

Commit the updated `uv.lock`. The Docker build installs with `--frozen`, so an
uncommitted lock breaks it.

## Layout

```
app/api/          routers and endpoints (thin)
app/src/services/ business logic
app/src/models/   Pydantic domain models
app/logging/      structured JSON logging
config/           settings and env files
tests/            pytest suite
```

See `docs/backend-guide.md` for the layering rules.
