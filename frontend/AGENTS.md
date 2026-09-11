# frontend — agent notes

Scoped rules for the React + TypeScript client. The root `AGENTS.md` still
applies; this adds what is only true here. `CLAUDE.md` is a symlink to this file.

**Status: the expenses screen ships, in English and European Portuguese.**
`ExpensesScreen` is wired into `App.tsx` behind a health check, built on the Vite
app, the Tailwind token layer, the typed API client, the backend types and the
shared components in `src/components/` — all verified against the running
service and covered by the Vitest suite. Copy and locale-sensitive values go
through `src/i18n/`. Build the next screen on what is already here: do not
re-scaffold, do not add a second HTTP layer or an i18n library, do not rebuild a
component that `src/components/` already provides, and do not fake API data to
move on.

## Stack

Vite + React 18 + TypeScript (strict) + Tailwind CSS. npm. Dev server on
`:5173` — the backend only allows that origin (`allow_origins=["http://localhost:5173"]`
in `backend/app/api/main.py`), so do not change the port without changing CORS.

## Layout

| Path | Purpose |
|---|---|
| `src/api/` | Typed API client. `client.ts` is the **only** place `fetch` is called. |
| `src/components/` | Reusable presentational components: `Button`, `Badge`, `Modal`, `TextField`, `SelectField`. |
| `src/features/<name>/` | A screen and the pieces only it uses. `expenses/` is the only one so far. |
| `src/i18n/` | Hand-written i18n, no library: the `en` and `pt-PT` catalogues (`messages.en.ts` is the source of truth), `LocaleProvider`, `useTranslation()`, `useFormat()`, `LanguageSwitcher`. |
| `src/types/` | Types mirroring the backend Pydantic models. |
| `src/lib/` | Small helpers. `format.ts` holds pure money, date and percentage formatters that take an explicit locale — components call them through `useFormat()`, never directly. |
| `src/test/` | Vitest setup and shared test helpers (`renderWithLocale`, fixtures). Tests sit beside the code they cover. |
| `tailwind.config.js` | The design tokens as Tailwind classes. Mirrors the guide. |
| `src/index.css` | The same tokens as CSS custom properties, plus base styles. |

`make harness-check` fails when a directory under `src/` has no row here, or a
row names a path that is gone — add the row in the same change as the directory.

## Commands

Run from `frontend/`.

| Command | What it does |
|---|---|
| `npm install` | Install dependencies. `make install` from the root does this too, via `npm ci`. |
| `npm run dev` | Dev server on :5173. Backend must run separately (`make run`). |
| `npm run build` | Production build — this also type-checks. |
| `npm run typecheck` | Type-check only (`tsc -b`). Not `npx tsc --noEmit`: the root `tsconfig.json` holds only references, so that checks no files and always passes. |
| `npm run lint` | oxlint — includes the `jsx-a11y` accessibility rules (rule 6). |
| `npm test` | Vitest + React Testing Library. |

**Done means the root `make check` passes.** It gates this folder as well as the
backend: its `check-frontend` target runs `npm run lint`, `npm run build` and
`npm test` from here, and the pre-commit hook and CI both call it. The commands
above are the fast inner loop; the gate is what decides. `make check-frontend`
runs this half alone.

Node 22, pinned in `.nvmrc` — CI reads that same file.

## Rules

1. **The design system is not optional.** Read `docs/design-system-guide.md`
   before writing any markup, every time. Only its tokens — `bg-surface`,
   `text-muted`, `bg-accent` — never Tailwind's stock palette (`bg-gray-800`,
   `text-blue-500`), which is cool-toned and fights the warm dark ground.
   Spacing comes from the 8pt scale only: 4, 8, 12, 16, 24, 32, 48, 64. If a
   token you need is missing, **add it to the guide first**; never hardcode a hex.
2. **The backend is read-only.** Read `backend/app/api/` to learn the contract;
   never change it. If the UI needs an endpoint that does not exist, stop and
   report exactly what it needs.
3. **All server access goes through `src/api/`.** No `fetch` in a component.
   Request and response types live in `src/types/` and mirror the backend models.
4. **Typed props, no `any`.** Explicit `interface` per component; TS strict mode
   stays on. Keep a component under ~150 lines — extract rather than nest.
5. **Every screen handles loading, empty and error.** An empty state is a real
   sentence plus the next action, never "No data".
6. **Accessible by default.** Buttons are `<button>`; icon-only controls carry an
   `aria-label`; every interactive element is keyboard reachable with a visible
   `:focus-visible` ring in `--accent`.
7. **No secrets in the client.** Anything in `frontend/` ships to the browser.
   Config goes in `.env.local` (untracked) and must be non-sensitive; `VITE_`
   variables are public by definition. → `docs/secrets-guide.md`
8. **Single-user, local-first.** No auth, no accounts, no login screen. If a
   request implies one, stop and ask.
9. **No hardcoded copy.** Every user-visible string, accessible names included,
   is a key in `src/i18n/messages.en.ts` plus its twin in `messages.pt.ts`,
   rendered with `t()` from `useTranslation()`. Money, dates and percentages go
   through `useFormat()`; enum labels are catalogue keys
   (`expense.category.<value>` and siblings), never the raw wire value. State
   holds a `MessageDescriptor`, never a translated string. Portuguese runs
   20–30% longer → `docs/design-system-guide.md`; testing copy →
   `docs/testing-guide.md`.

## API contract (current)

Base URL from `VITE_API_URL`, default `http://localhost:8000`.

| Endpoint | Notes |
|---|---|
| `GET /healthcheck` | Liveness. |
| `GET /budget`, `PUT /budget` | The single budget. |
| `GET /budget/summary` | Totals — prefer this over computing them client-side. |
| `GET /expenses`, `POST /expenses` | List and create. |
| `GET|PATCH|DELETE /expenses/{id}` | Single expense. |

### Money is a string, always

Amounts are `Decimal` server-side and Pydantic serialises them to JSON
**strings** — `"250.50"`, never `250.5`. `Money` in `src/types/money.ts` is
therefore `string`, which makes the dangerous line a compile error:

```ts
const total = a.amount + b.amount   // type error, and correctly so
```

Never `Number()` an amount except at the moment of display (`formatMoney`).
Never sum, compare or forecast amounts in the client — `GET /budget/summary`
returns every total already computed on exact decimals. Two sources of truth
for the same figure will drift, and the one built on floats is the wrong one.

`budget_used_percent` is a genuine `number`: it is a ratio, not an amount.

### Error shape

FastAPI returns `{"detail": ...}` where `detail` is a **string** for the
handlers' own errors and an **array of objects** for 422 validation failures.
`ApiError` normalises both into a readable `message`; components should render
`error.message` and never reach into `detail`. `ApiError.status === 0` means the
request never arrived — the API is down, or CORS refused it. The browser
deliberately makes those two indistinguishable.

`GET /healthcheck` returns `{"message": "OK"}` — not `{"status": ...}`.

## Delegation

UI work is delegated: spawn `ui-builder` for any component, screen, or styling
change (`.claude/agents/ui-builder.md`). Use `explorer` to locate things instead
of opening files into the main context.

## Recurrent errors

Append here when a mistake happens twice. One line each.

- The dev server port is pinned by backend CORS — changing it breaks every
  request with an opaque browser error, not a 4xx.
- A stale `uvicorn` left on :8000 serves the routes it was started with, so new
  endpoints 404 while `/healthcheck` still answers. `make run` then fails with
  "address already in use" and the browser keeps talking to the old process.
  Check `lsof -nP -iTCP:8000 -sTCP:LISTEN` before believing a 404.
- The healthcheck payload is `{"message": "OK"}`; assuming `{"status": "ok"}`
  type-checks fine and fails only at runtime.
