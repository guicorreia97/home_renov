# Testing guide

pytest, run via `make test` (or `make check` for the full gate). Tests run under
`APP_ENV=testing`, which loads the committed dummy `config/envs/.env.testing`.

## Requirements

- **Every endpoint has a test.** A new route without one is incomplete work.
- Test the behavior a caller can observe — status code and response body — not
  the internals of the handler.
- Tests must not touch the real `data/` directory, hit the network, or depend on
  each other's ordering.

## Layout

`backend/tests/`, mirroring the source tree: `test_<module>.py`, with test
functions named `test_<subject>_<expected outcome>`
(`test_create_room_rejects_empty_name`). Arrange–act–assert, blank-line
separated, no comments restating the code.

## Endpoints

Use FastAPI's `TestClient`:

```python
from fastapi.testclient import TestClient
from app.api.main import app

client = TestClient(app)


def test_healthcheck_returns_ok():
    response = client.get("/healthcheck")

    assert response.status_code == 200
    assert response.json() == {"message": "OK"}
```

## Services and repositories

Services are pure Python — call them directly, injecting an in-memory fake
repository that implements the Protocol. That is the payoff of the interface in
`docs/persistence-guide.md`: service tests need no disk at all.

For the JSON repository itself, use pytest's `tmp_path` fixture as the data
directory so nothing leaks between tests.

## What not to do

- Do not delete or `xfail` a failing test to make the gate pass. A red test is
  information; find the cause.
- Do not assert on log output or on exact error strings meant for humans.
- Do not mock what you own — inject a fake instead.
