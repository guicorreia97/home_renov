# frontend — agent notes

Scoped rules for the React + TypeScript client. The root `AGENTS.md` still
applies; this adds what is only true here. `CLAUDE.md` is a symlink to this file.

**Status: scaffolded, no screens yet.** The Vite app, the Tailwind token layer
and the `src/` folders below all exist. Build screens inside them — do not
re-scaffold, do not invent a different structure, and do not fake API data to
move on.

## Stack

Vite + React 18 + TypeScript (strict) + Tailwind CSS. npm. Dev server on
`:5173` — the backend only allows that origin (`allow_origins=["http://localhost:5173"]`
in `backend/app/api/main.py`), so do not change the port without changing CORS.

## Layout

| Path | Purpose |
|---|---|
| `src/api/` | Typed API client. The **only** place `fetch` is called. |
| `src/components/` | Reusable presentational components. |
| `src/features/<name>/` | A screen and the pieces only it uses (`budget/`, `expenses/`). |
| `src/types/` | Types mirroring the backend Pydantic models. |
| `src/lib/` | Small helpers (formatting, hooks). |
| `tailwind.config.js` | The design tokens as Tailwind classes. Mirrors the guide. |
| `src/index.css` | The same tokens as CSS custom properties, plus base styles. |

## Commands

Run from `frontend/`.

| Command | What it does |
|---|---|
| `npm install` | Install dependencies. |
| `npm run dev` | Dev server on :5173. Backend must run separately (`make run`). |
| `npm run build` | Production build — this also type-checks. |
| `npx tsc --noEmit` | Type-check only. |
| `npm run lint` | oxlint — includes the `jsx-a11y` accessibility rules (rule 6). |

**Done means `npm run build` and `npx tsc --noEmit` both pass.** The root
`make check` covers the backend only; it says nothing about this folder.

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

## API contract (current)

Base URL from `VITE_API_URL`, default `http://localhost:8000`.

| Endpoint | Notes |
|---|---|
| `GET /healthcheck` | Liveness. |
| `GET /budget`, `PUT /budget` | The single budget. |
| `GET /budget/summary` | Totals — prefer this over computing them client-side. |
| `GET /expenses`, `POST /expenses` | List and create. |
| `GET|PATCH|DELETE /expenses/{id}` | Single expense. |

Money crosses the wire in the backend's `Money` shape (`app/src/models/money.py`)
— read it before formatting currency; do not do float math on amounts.

## Delegation

UI work is delegated: spawn `ui-builder` for any component, screen, or styling
change (`.claude/agents/ui-builder.md`). Use `explorer` to locate things instead
of opening files into the main context.

## Recurrent errors

Append here when a mistake happens twice. One line each.

- The dev server port is pinned by backend CORS — changing it breaks every
  request with an opaque browser error, not a 4xx.
