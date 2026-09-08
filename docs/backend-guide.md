# Backend guide

FastAPI, Python 3.11, dependencies managed by `uv`. Run everything from
`backend/` (settings resolve `.env` paths relative to the working directory).

## Runtime

Your code is Python; the runtime is CPython 3.11 inside **uvicorn**, an ASGI
server. FastAPI is a library that declares routes — uvicorn is the long-lived
process holding the event loop and turning HTTP bytes into `async def` calls.
`uv run start` boots exactly that (`app.api.main:main`), as does the Dockerfile.

## Layering

```
app/api/endpoints/    HTTP boundary. Parse, validate, delegate, return.
app/src/services/     Business logic. Pure Python.
app/src/repositories/ Persistence. The only layer that touches storage.
app/src/models/       Pydantic domain models, shared by all layers.
```

Dependencies point **downward only**. A service importing `fastapi`, or an
endpoint calling `open()`, is a layering violation.

**Endpoints** stay thin — a handler that is more than ~15 lines is doing work
that belongs in a service:

```python
@router.post("/rooms", status_code=status.HTTP_201_CREATED)
async def create_room(payload: RoomCreate) -> Room:
    return room_service.create(payload)
```

**Services** take and return domain models, raise domain exceptions (not
`HTTPException`), and receive their repository by injection rather than
importing a concrete one — that is what keeps the JSON→Mongo swap cheap.

## Models

Every request and response body is a Pydantic model. Never return a bare dict
from a route except trivial constants like the health check. Separate the shapes:
`RoomCreate` (input), `Room` (stored/returned) — reusing one model for both leaks
server-generated fields into the input schema.

## Configuration

`config/settings.py` reads `config/.env` for `APP_ENV`, then loads
`config/envs/.env.<APP_ENV>`. Both must exist or the app raises at import time.
Add new settings as typed fields on `Settings`, with a default only when the
value is genuinely optional. Read config through `settings`, never `os.getenv`.

## Logging

```python
from app.logging.log_config import log_config
logger = log_config.get_logger()
logger.info("Room created", extra={"room_id": room.id})
```

JSON-structured, singleton-configured, already wired in `main.py`. `print()` is
banned by ruff. Put variables in `extra=`, not in an f-string, so they stay
queryable. **Never log user content** — no renovation notes, addresses, or
contractor details. Log identifiers and counts.

## Errors

Services raise domain exceptions; the API layer translates them to HTTP. Error
responses use a consistent shape: `{"detail": "<human-readable sentence>"}`.
Never leak a stack trace or an internal path to a client.

## Adding a dependency

`cd backend && uv add <pkg>` (or `--dev`). Commit the updated `uv.lock`. Adding
a dependency needs human review — say what it's for and why the stdlib won't do.
