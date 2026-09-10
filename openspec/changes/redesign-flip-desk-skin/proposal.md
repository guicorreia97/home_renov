# Proposal: The Flip Desk skin — visual system, shell and the panels we can feed

> **PART 1 of 8.** Four branches. Three are frontend-only; the fourth adds the
> derived totals the new panels need, server-side. PARTs 2–8 each light up
> panels this one deliberately leaves out; see `openspec/changes/` for the rest.

## Why

The app is one centred 1200px column: an `h1`, a budget strip, two filter
selects and a flat expense table (`frontend/src/features/expenses/ExpensesScreen.tsx:69`).
Everything the API computes is on screen at once, undifferentiated — the
`/budget/summary` endpoint returns thirteen fields and the strip shows six of
them in a row of equal weight. There is no navigation, no grouping, and no way
to look at the renovation as a budget rather than as a list of payments.

`Home_Renovation_looks_PT-PT/Flip Desk.dc.html` is a mockup of what this should
be: a desk. A sidebar that doubles as a filter, a header carrying the
assumptions the whole screen depends on, and three tabs that answer three
different questions — *what did we budget*, *what did we spend*, *what do we
make*. The mockup is also a much deeper product than this one, and that depth is
split across PARTs 2–8 rather than faked here.

Doing the visual system now is unusually cheap, and the reason is worth stating
because it will not be true again: **no component contains a raw hex or an
arbitrary Tailwind value, and no test asserts a class name** (`toHaveClass`
count across the suite: zero). Every component styles through semantic tokens
(`bg-surface`, `text-accent`, `rounded-card`) that resolve to custom properties
in `frontend/src/index.css:17-46`. Changing the values behind those names
reskins all fifteen components without editing one of them. Once the surface is
five screens instead of one, the same swap is a week.

## What Changes

Four sequenced branches, each independently green.

### 1a — Retokenise (`feat/flip-desk-tokens`)

- **`docs/design-system-guide.md` is rewritten first** and remains canonical;
  code mirrors it (the instruction at `frontend/src/index.css:1-9`). Palette
  moves from warm terracotta to the mockup's near-black and mint; typography
  from Inter to Space Grotesk with IBM Plex Mono for every figure.
- **`frontend/src/index.css`** — custom-property values swap. `--border`
  becomes `rgba(255,255,255,.07)`; since the palette is no longer opaque hex,
  some `-soft` tokens become real alpha rather than the precomputed blends they
  are today (`index.css:41-44`). Text alphas are **derived from the guide's
  4.5:1 contrast rule**, not copied from the mockup — see `design.md`.
- **`frontend/tailwind.config.js`** — `fontFamily.sans` → Space Grotesk, new
  `fontFamily.mono` → IBM Plex Mono, retuned `fontSize` roles, radii `card`
  12→10 and `input`/`button` 8→7.
- **`frontend/index.html`** — the Inter `<link>` becomes Space Grotesk +
  IBM Plex Mono. Same mechanism, same CDN, **no new dependency**.
- **Mono numerals** applied where figures render: `BudgetSummaryStrip.tsx`,
  `ExpenseRow.tsx`, `RemainingBudgetConclusion.tsx`.

Layout does not change on this branch. The existing screen simply comes out in
the new skin, which is what makes it reviewable on its own.

### 1b — Derived totals (`feat/summary-derived-totals`) — the only backend work

`Money` is a string in the client and stays one: `frontend/src/types/money.ts`
types it that way so `total + expense.amount` is a type error rather than a
rounding bug, and `openspec/specs/frontend-expenses/spec.md:55-58` makes it
normative — "No code path applies `Number()`, `parseFloat`, or arithmetic to a
`Money` value". Summing, comparing and forecasting happen server-side; that is
what `/budget/summary` is for.

The new panels need figures nobody computes yet, so the server computes them:

- **Per-category `planned` / `pending` / `paid`**, so tab 1 can show group
  subtotals. Today `by_category` returns one committed amount per category
  (`backend/app/src/services/budget_service.py:97-108`).
- **Category share of committed spend**, for the sidebar rail.
- **Margin on sale** and **return on cost**, for tab 3.
- **Break-even sale price** — `purchase_price + total_forecast`.

All in `Decimal`, quantised by the existing `Money` discipline
(`app/src/models/money.py:9-20`), all covered by pytest. No new route: this
extends `BudgetSummary` and the service behind it.

### 1c — The shell (`feat/flip-desk-shell`)

New `frontend/src/features/shell/`: `AppShell`, `Sidebar`, `DeskHeader`,
`TabNav`. `App.tsx:60` renders `AppShell`; the healthcheck gate at
`App.tsx:22-44` is untouched.

- **Sidebar, 258px.** Brand block, then a rail built from the per-category
  figures — swatch, name, committed total, share — **labelled `CATEGORIAS`, not
  `FASES DE OBRA`**, because phases do not exist until PART 3 and a label should
  not promise a semantic we don't have. Clicking a row sets the **existing**
  `filters.category` state (`ExpensesScreen.tsx:59-65`) — this wires into that
  filter, it does not add a second one. Footer shows `remaining_budget` and
  `budget_used_percent` on the existing thresholds
  (`design-system-guide.md:48-59`).
- **No nav list.** One screen exists, so there are no destinations and no dead
  links. The pipeline nav arrives with PART 2.
- **Header.** Title, an assumptions strip (`Aquisição` / `Orçamento` /
  `Venda alvo` from `purchase_price`, `planned_budget`, `target_sale_price`),
  and a status pill driven by `over_budget`. Two buttons open components that
  **already exist**: `BudgetSettingsModal` and `ExpenseFormModal`.

### 1d — The three tabs (`feat/flip-desk-panels`)

- **Orçamento de obra** — KPI row, then expenses grouped by category with
  columns `RUBRICA · FORNECEDOR · PLANEADO · COMPROMETIDO · PAGO · ESTADO`,
  group subtotals from 1b, and a grand total. An expense carries one amount and
  one status, so each line lands in exactly one money column. An amber callout
  fires on `over_budget`, worded from real figures.
- **Despesas** — KPI row, then the ledger: `DATA · DESCRIÇÃO` + payment-method
  badge · `FORNECEDOR · DOC. · CATEGORIA · VALOR`, plus a total row. This is
  today's `ExpenseTable.tsx` restyled with two more columns
  (`invoice_reference`, `payment_method`), keeping its existing error, loading,
  empty and filtered-empty states (`ExpenseTable.tsx:31-65`) and its row
  actions.
- **Lucro projetado** — KPI row, a waterfall (venda alvo − aquisição − custo de
  obra = lucro líquido, the result being `projected_profit`, which the backend
  already computes), margin and return from 1b, and a break-even card.

**Non-goals.** No mock or placeholder data — a panel the API cannot feed is not
built here, it arrives with its PART. Nothing is labelled with a semantic the
data doesn't carry. No backend change beyond 1b's derived figures: no new
entity, no new route, no storage-format change. Specifically deferred: property
meta and the deal pipeline (PART 2), the phase rail and the `FASE` column
(PART 3), `EMPREITEIRO` as an entity (PART 4), the per-line `ORÇAMENTO`/`DESVIO`
columns and the forecast callout (PART 5), the acquisition card (PART 6), the
financing card and `CAPITAL PRÓPRIO` (PART 7), and the sensitivity grid,
minimum-margin threshold and scenarios (PART 8).

## Capabilities

### New Capabilities

- `frontend-shell`: how the app is navigated — the persistent sidebar and its
  filter rail, the header that carries the renovation's assumptions, and the
  tab set that divides the screen into budget, ledger and profit views.
- `budget-summary`: the derived figures the server computes over expenses and
  targets, and the guarantee that the client never recomputes one.

### Modified Capabilities

- `frontend-expenses`: the screen is specified as a single centred column with
  one flat table. It becomes three views inside a shell, and its table gains
  grouping and two columns. **This change's delta assumes `add-i18n-pt-en` has
  landed** — both changes modify this capability, and this one is written
  against the post-i18n text.

## Impact

**Backend.** `BudgetSummary` gains fields and `budget_service.py` gains the
functions behind them, with pytest coverage. No new route, no new model, no
change to what is stored on disk — so this does **not** trip the agent-loop's
human-review-before-a-storage-change rule.

**Code.** New `frontend/src/features/shell/`. Rewrites
`docs/design-system-guide.md`, `frontend/src/index.css`,
`frontend/tailwind.config.js`, `frontend/index.html`, and
`frontend/src/App.tsx`. Restructures `ExpensesScreen.tsx` and
`ExpenseTable.tsx`; touches `BudgetSummaryStrip.tsx`, `ExpenseRow.tsx` and
`RemainingBudgetConclusion.tsx`.

**Tests.** Existing tests must pass **unchanged through 1a** — a break there
means something is coupled to a token value that shouldn't be, which is a
finding, not a fixup. New pytest coverage for every derived figure in 1b. New
Vitest coverage for the shell: rail-to-filter wiring, tab switching, grouped
subtotals reconciling with the grand total, and both locales.

**Dependencies.** None. Fonts load through the `<link>` already in
`index.html:12`.

**Docs.** `docs/design-system-guide.md` is substantially rewritten, including
two deliberate deviations from rules it currently states — see `design.md`.
