# Testing guide

Two suites, **one gate**. The backend is pytest, run via `make test`; the
frontend is Vitest, run via `npm test` from `frontend/`. `make check` runs both
and is the only definition of "done" — the pre-commit hook and CI call it and
nothing else. Backend tests run under `APP_ENV=testing`, which loads the
committed dummy `config/envs/.env.testing`.

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
(`npm run test:watch` while working). `make check` runs this suite too, through
its `check-frontend` target — oxlint, `npm run build` (which type-checks via
`tsc -b`) and Vitest, the frontend's own definition of done. Use `npm test`
directly for a fast loop while working; the gate is what decides.

`make check-frontend` runs that half alone. It requires `frontend/node_modules`
and fails with instructions when the directory is absent rather than skipping —
`make install` installs both halves. The skip was considered and rejected: it
would engage on a fresh clone, which is precisely when an unverified commit is
most likely, and a gate that silently does nothing is worse than no gate because
it is still trusted.

**happy-dom, not jsdom.** Every modal in the app is a native `<dialog>`, and
jsdom does not implement `HTMLDialogElement.showModal` — under it, every test
that renders a `Modal` throws. happy-dom implements `showModal`, `close` and
`open`.

Test files sit next to the code they cover as `<Component>.test.tsx`;
`src/test/` holds the shared setup and test helpers only.

`src/test/setup.ts` registers the jest-dom matchers, cleans the DOM between
tests, and stubs `fetch`. Stub the network, never the API client: `src/api/` is
the only module that calls `fetch`, so stubbing at that boundary leaves the
client's own error normalising, abort handling and 204 case under test.

```tsx
import { screen } from '@testing-library/react'
import { renderWithLocale } from '../../test/renderWithLocale'
import { stubApi } from '../../test/setup'

it('shows the expense once loaded', async () => {
  stubApi({
    'GET /expenses': { body: [expense] },
    'GET /budget/summary': { body: summary },
  })

  renderWithLocale(<ExpensesScreen />)

  expect(await screen.findByText('Kitchen worktop')).toBeInTheDocument()
})
```

Pass an array to a route — `[{ body: before }, { body: after }]` — when a test
must prove a refetch returned fresh data; entries are consumed in order and the
last one repeats. `apiCalls` records what was requested, and
`stubNetworkFailure()` simulates an unreachable backend.

Query by what the user perceives — role, label, text — not by test ids or class
names. Assert on rendered output rather than on component state.

### Copy and languages

The UI renders in English and European Portuguese (`pt-PT`) from one message
catalogue. `src/i18n/messages.en.ts` is the source of truth and
`messages.pt.ts` is typed `Record<MessageKey, string>` against it, so a key
missing from either side fails the build, and a parity test backs that up if
the annotation is ever weakened. Keys are flat and dotted
(`'expenses.table.header.amount'`) so every use of a message is one grep away.

**A test never hardcodes a user-visible string.** Rewording a message is not a
behaviour change and must not fail the suite; a broken control still must. In
order of preference:

1. Role and accessible name — `getByRole('button', { name: t('expenses.add') })`.
2. A catalogue lookup where the copy itself is the subject —
   `getByText(t('expenses.table.empty'))`.
3. A stable identifier, only where neither exists.

Fixture data — a description, a payee — is test input rather than copy, and is
asserted literally, as `'Kitchen worktop'` is above.

Render through `renderWithLocale(ui, locale)` from `src/test/renderWithLocale.tsx`.
It wraps the tree in a `LocaleProvider` at that locale (default `en`) and
returns a `t` bound to it:

```tsx
const { t } = renderWithLocale(<ExpensesScreen />, 'pt-PT')

expect(await screen.findByRole('heading', { name: t('expenses.title') })).toBeInTheDocument()
```

`useTranslation` and `useFormat` throw outside a provider, so a bare `render` of
a component that uses them fails loudly instead of quietly falling back to
English. Component tests run under one locale. The screen and its two modals
also run under `pt-PT`, where number, date and percentage formatting and text
length differ.

Assert a formatted value through `src/lib/format.ts` or the catalogue, never
against a hand-typed string, and wrap it in `folded` from the same helper
module: Testing Library folds the non-breaking space Intl emits (`1250,50 €`)
in rendered text, but not in the string you pass. The one exception is
`src/lib/format.test.ts` itself, which pins what each locale's output looks
like so every other test can trust the formatter rather than restate it.

## What not to do

- Do not delete or `xfail` a failing test to make the gate pass. A red test is
  information; find the cause.
- Do not assert on log output or on exact error strings meant for humans.
- Do not mock what you own — inject a fake instead.
