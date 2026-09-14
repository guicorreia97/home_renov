# Proposal: Works phases

> **PART 3 of 8. Fully planned** — `design.md`, three delta specs and `tasks.md`
> are written. Assumes **PART 1** (`redesign-flip-desk-skin`) and **PART 2**
> (`add-deal-and-property`) have archived: PART 1 authors the `frontend-shell`
> capability and the per-status breakdown this change mirrors one level up,
> PART 2 the `deal_id` spine a phase hangs off and the per-deal directory it is
> stored in. **Blocks PART 5** (rubricas live inside phases), which was planned
> in parallel against this proposal — where the two meet, see `design.md`
> Decisions 4 and 10.

## Why

The mockup's sidebar is organised by `FASES DE OBRA` — Demolições, Redes,
Alvenarias, Carpintarias and so on — each with its own budget, its own spend,
and a percentage executed. The phase is the mockup's primary organising idea:
it groups the budget table, it colours the ledger's `FASE` column, and it is
what the sidebar filters by.

No such concept exists. `Expense` has a free-text `room` field
(`backend/app/src/models/expense.py:61`) and an `ExpenseCategory` enum
(`:9-22`), and PART 1 uses that category as the sidebar rail precisely because
it is the closest thing available — labelled `CATEGORIAS`, not `FASES`, so the
label would not promise a semantic the data didn't carry.

Category and phase are genuinely different. *Materials* is what you bought;
*Redes* is which part of the job it was for. A renovation is tracked by the
second, and a renovation that is over budget is over budget **in a phase**.

## What Changes

- **New `Phase` model**: a user-written name, an explicit position, a status from
  a closed set, a colour from a closed identity palette, an optional budget and
  optional planned dates. Belongs to a deal. No deal is seeded with a starter set
  of phases (`design.md` Decision 1).
- **`Expense` gains `phase_id`** — nullable, so existing expenses stay valid and
  a payment can be recorded before its phase is decided. **There is no backfill.**
  A phase cannot be inferred from `room` or `category` — *materials* says what was
  bought, not which part of the job it was for — and a wrong phase silently
  misstates which phase is over budget. Existing spend lands in an explicit
  unphased group and is assigned by the user (`design.md` Decision 6).
- **Routes**: CRUD under `/deals/{deal_id}/phases` plus a whole-sequence reorder,
  and per-phase rollups in the budget summary — spend by status, share, the
  phase's budget and the proportion of it spent, the unphased group, and the gap
  between the deal's budget and the total allocated to phases — all computed
  **server-side**, per `frontend-expenses`'s rule that totals are never
  recalculated in the browser.
- **Frontend**: the sidebar rail becomes the real `FASES DE OBRA` — swatch,
  name, `spent / budget`, proportion spent — and the filter it drives becomes a
  phase filter, while the category filter stays in the ledger's own filter row.
  The ledger gains its `FASE` column. Tab 1's table groups by phase instead of
  category.

## Capabilities

**New:** `phases` — what a phase is, how spend rolls up to it, how it is
budgeted and ordered.

**Modified:** `frontend-shell` (the rail's meaning and label), `frontend-expenses`
(grouping basis, the new column, the filter), `budget-summary` (the summary
carries the per-phase status split, each phase's share and proportion of budget
spent, and the unphased group).

## Impact

New model, repository, service and router; `Expense` and its summary change.
The frontend rail, filter and both tables change. Moderate test churn.

**Human review required** — this adds a collection to the on-disk format and a
field to every expense written from here on. The addition itself is safe, but
rolling back is not free: `ExpenseCreate` forbids unknown fields, so a stored
`phase_id` fails validation on a build that predates this change. The rollback
is the pre-upgrade `expenses.json`, not a revert (`design.md` Risks).

`docs/design-system-guide.md` gains a phase identity palette, and its rule that
colour means status is amended to admit identity — the one deliberate deviation
here, taken in the guide first and mirrored in code.

Once phases carry their own budgets, per-phase variance becomes answerable —
which is what PART 5 needs to fill `DESVIO`.

## Deletes from PART 1

The `CATEGORIAS` rail stand-in, whose requirement said in its own text that it
must not be labelled as works phases "which do not exist yet" — discharged here,
removed and replaced rather than edited (`design.md` Decision 10).

PART 1's monochrome-ramp swatch decision is **revisited and partly reversed**.
A phase's colour is identity the user assigns, so the ramp gives way to a closed
palette of identity hues — but PART 1's reason for the ramp survives intact, so
that palette **excludes every hue that carries status**. Green cannot mean "this
phase" in the rail and "under budget" two inches away (`design.md` Decision 5).
