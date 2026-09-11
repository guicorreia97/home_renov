# Proposal: Works phases

> **PART 3 of 8.** Stub — `design.md`, delta specs and `tasks.md` get written
> when this is picked up. **Depends on PART 2** (a phase belongs to a deal).
> **Blocks PART 5** (rubricas live inside phases).

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

- **New `Phase` model**: name, order, planned budget, start and end dates,
  status. Belongs to a deal.
- **`Expense` gains `phase_id`** — nullable at first so existing expenses stay
  valid, with a backfill path from `room`/`category` where it can be inferred.
- **Routes**: CRUD under `/deals/{deal_id}/phases`, and per-phase rollups in the
  budget summary (spend, share, percent executed) computed **server-side**, per
  `frontend-expenses`'s rule that totals are never recalculated in the browser.
- **Frontend**: the sidebar rail becomes the real `FASES DE OBRA` — swatch,
  name, `spent / budget`, percent — and the filter it drives becomes a phase
  filter. The ledger gains its `FASE` column. Tab 1's table groups by phase
  instead of category.

## Capabilities

**New:** `phases` — what a phase is, how spend rolls up to it, how it is
budgeted and ordered.

**Modified:** `frontend-shell` (the rail's meaning and label), `frontend-expenses`
(grouping basis, the new column, the filter).

## Impact

New model, repository, service and router; `Expense` and its summary change.
The frontend rail, filter and both tables change. Moderate test churn.

Once phases carry their own budgets, per-phase variance becomes answerable —
which is what PART 5 needs to fill `DESVIO`.

## Deletes from PART 1

The `CATEGORIAS` rail stand-in and the monochrome-ramp swatch decision — with
real phases, a per-phase colour is identity the user assigns, not decoration
the app invents, so `design.md` Decision 3 should be revisited here.
