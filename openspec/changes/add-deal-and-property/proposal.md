# Proposal: The deal and property spine

> **PART 2 of 8.** Fully planned: `design.md`, three delta specs and `tasks.md`
> are written. **Do this one first among PARTs 2–8**; see Sequencing. The
> `frontend-shell` delta assumes PART 1 has archived, since that change is the
> capability's author.

## Why

`Flip Desk.dc.html` puts the property at the top of every screen — `Rua das
Amoreiras 42, 3.º Dto · Lisboa · 118 m² · T3 · 1974`, a status pill reading
`OBRA · MÊS 5 DE 8`, and a sidebar nav offering `Negócios em análise (9)`.
None of it exists. There is no property, no deal, no timeline, and by design
exactly one of everything: `Budget` is documented as "Single-user,
single-property: exactly one budget exists, and it is created empty on first
read rather than by an explicit POST" (`backend/app/src/models/budget.py:21-23`).

The decision has been taken to become **multi-deal**. This is the change that
does it.

## Sequencing — why this is urgent rather than merely next

Every PART after this one hangs off a `deal_id`: phases belong to a deal, line
items to a phase, acquisition costs and financing to a deal, expenses to a deal.
Build any of them against the single-deal assumption and this stops being a
feature and becomes a migration — of five models, four repositories, ten routes
and every stored JSON file, with data already in them.

Right now the domain is two models and two repositories. **This is the cheapest
this change will ever be**, and it gets monotonically more expensive with each
PART that lands ahead of it.

## What Changes

- **New `Deal` and `Property` models.** Property: address, locality, area m²,
  typology (`T0`–`T5+`), year built. Deal: the property, a status
  (`em análise` / `proposta` / `aquisição` / `obra` / `venda` / `fechado`),
  acquisition and target-exit dates, and a works window that yields the
  mockup's `MÊS 5 DE 8`.
- **`deal_id` becomes a first-class key** on `Expense` and `Budget`. `Budget`
  stops being a singleton — one per deal, still created empty on first read.
- **Routes become deal-scoped**: `/deals`, `/deals/{id}`, and the existing
  expense and budget routes move under `/deals/{deal_id}/…`. Ten routes today
  (`backend/app/api/endpoints/`); this reshapes most of them.
- **Storage migration.** The JSON repositories hold flat collections
  (`app/src/repositories/json_store.py`). Existing data must land in a default
  deal rather than being orphaned — a migration path, not a wipe.
- **Frontend**: a deal switcher, the pipeline screen behind the sidebar's
  `Negócios em análise`, and the property meta chips PART 1 left out of the
  header. The sidebar's nav list — which PART 1 deliberately omitted because
  there were no destinations — becomes real here.

## Capabilities

**New:** `deals` — what a deal and its property are, how deals are listed and
selected, and what belongs to a deal rather than to the app.

**Modified:** `frontend-expenses`, `frontend-shell` (nav gains destinations;
the header gains real property meta and a real project-month pill).

## Impact

Largest backend change of the eight. Touches every model, both repositories,
nearly every route, and the whole test suite. **Human review required** — it
changes the storage layer and its on-disk format (agent-loop rule).

**It also rewrites the product line in `AGENTS.md`/`CLAUDE.md`**: "single-user,
local-first" survives, "no accounts, no auth, no marketplace" survives,
**single-property does not**. Rule 8 — that edit goes in its own commit, and
only when the user asks for it.

## Deletes from PART 1

The `over_budget` status pill stand-in, and the "no nav list" decision.
