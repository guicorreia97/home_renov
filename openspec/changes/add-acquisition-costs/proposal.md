# Proposal: Acquisition costs

> **PART 6 of 8.** Fully planned: `design.md`, three delta specs and `tasks.md`
> are written. **Depends on PART 2**, and assumes both PART 1
> (`redesign-flip-desk-skin`) and PART 2 (`add-deal-and-property`) have
> archived — PART 1 authors the break-even and ratio figures this change
> corrects, and PART 2 makes every record deal-scoped. Independent of PARTs 3,
> 4 and 5. PARTs 7 and 8 depend on this one.

## Why

The mockup's Despesas tab opens with a card headed *"Custos de aquisição —
{total}"*, subtitled *"Fechados na escritura, além do preço de {price}"*: the
costs that close with the deed and are not the purchase price. In Portugal that
is IMT, Imposto do Selo, notary and registration, legal fees, and any agent
commission — each shown with the basis it was computed from.

The model has `purchase_price` and nothing else
(`backend/app/src/models/budget.py:27`). Every acquisition cost is therefore
either invisible or miscategorised as renovation spend — `PERMITS_AND_FEES`
(`app/src/models/expense.py:17`) is a works category, and putting IMT there
inflates the renovation budget with money that was never renovation.

This matters beyond bookkeeping: `projected_profit` subtracts only
`purchase_price` and works spend (`app/src/services/budget_service.py:84-95`),
so today **every profit figure the app shows is overstated by the entire cost of
buying the property.**

## What Changes

- **New `AcquisitionCost` model** per deal: kind (IMT, Imposto do Selo, notary
  and registration, legal, agent commission, other), amount, a human-readable
  basis string, and whether it is estimated or settled.
- **No derivation of the Portuguese statutory ones** — settled in `design.md`,
  Decision 1. IMT is a bracket table that varies by property use and region and
  is re-tabled most years; a rate held in source has no test that can tell it
  has gone stale, and a confidently wrong tax figure is worse than an empty
  field. Amounts are user-entered and authoritative; the basis is free text and
  is never parsed.
- **`projected_profit` subtracts acquisition costs** — a correction to an
  existing wrong number, and the reason this PART is worth more than its size.
  `break_even_sale_price`, `margin_percent` and `return_on_cost_percent` move
  with it, because a break-even price that disagreed with the profit above it
  would be worse than either being wrong alone.
- **Frontend**: the acquisition card PART 1 omitted, and a new line in tab 3's
  waterfall.

## Capabilities

**New:** `acquisition-costs` — what closes with the deed, how each cost is
recorded and evidenced, and how they total. What that total does to the profit
figures is `budget-summary`'s, below.

**Modified:**

- `budget-summary` — the cost base behind every derived figure gains the
  acquisition total: `projected_profit` subtracts it, `break_even_sale_price`
  includes it, and the two ratios are computed over the corrected base.
- `frontend-expenses` — the profit waterfall gains a line, and the expenses
  view gains the acquisition card.

## Impact

Small: one model, one repository, one router, plus a change to
`budget_service._projected_profit` and to the three figures derived from the
same cost base. No stored data is migrated — the new collection's absence is an
empty list.

The profit correction is a **behaviour change to an existing figure** — call it
out in the PR body, because a user who has been reading that number will see it
drop, by exactly the acquisition total. A deal with no acquisition cost recorded
is provably unchanged.

No follow-up outlives this change. PART 1's `budget-summary` spec defines
`break_even_sale_price` as `purchase_price + total_forecast`, which this change
falsifies; the `budget-summary` delta MODIFIES that requirement, so archiving
this change rewrites the sentence rather than leaving it to be corrected by
hand afterwards.

## Deletes from PART 1

Nothing structural. Adds the card PART 1 left out and corrects the waterfall.
