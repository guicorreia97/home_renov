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

## Frontend

Vitest + React Testing Library, run via `npm test` from `frontend/`
(`npm run test:watch` while working). `make check` is the backend gate and does
not run these — the two suites are separate, and both must pass.

**happy-dom, not jsdom.** Every modal in the app is a native `<dialog>`, and
jsdom does not implement `HTMLDialogElement.showModal` — under it, every test
that renders a `Modal` throws. happy-dom implements `showModal`, `close` and
`open`.

Test files sit next to the code they cover as `<Component>.test.tsx`;
`src/test/` holds the shared setup only.

`src/test/setup.ts` registers the jest-dom matchers, cleans the DOM between
tests, and stubs `fetch`. Stub the network, never the API client: `src/api/` is
the only module that calls `fetch`, so stubbing at that boundary leaves the
client's own error normalising, abort handling and 204 case under test.

```tsx
import { render, screen } from '@testing-library/react'
import { stubApi } from '../../test/setup'

it('shows the expense once loaded', async () => {
  stubApi({
    'GET /expenses': { body: [expense] },
    'GET /budget/summary': { body: summary },
  })

  render(<ExpensesScreen />)

  expect(await screen.findByText('Kitchen worktop')).toBeInTheDocument()
})
```

Pass an array to a route — `[{ body: before }, { body: after }]` — when a test
must prove a refetch returned fresh data; entries are consumed in order and the
last one repeats. `apiCalls` records what was requested, and
`stubNetworkFailure()` simulates an unreachable backend.

Query by what the user perceives — role, label, text — not by test ids or class
names. Assert on rendered output rather than on component state.

## What not to do

- Do not delete or `xfail` a failing test to make the gate pass. A red test is
  information; find the cause.
- Do not assert on log output or on exact error strings meant for humans.
- Do not mock what you own — inject a fake instead.
