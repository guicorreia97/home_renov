# Proposal: Acquisition costs

> **PART 6 of 8.** Stub — `design.md`, delta specs and `tasks.md` get written
> when this is picked up. **Depends on PART 2.** Independent of everything else.

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
- **Optionally derive the Portuguese statutory ones.** IMT and IS are formulas
  over the purchase price. Deriving them is a real convenience and a real
  liability — rates change, and a wrong tax figure presented confidently is
  worse than an empty field. Settle this in `design.md`; default to
  user-entered with the formula as a suggestion, never a silent computation.
- **`projected_profit` subtracts acquisition costs** — a correction to an
  existing wrong number, and the reason this PART is worth more than its size.
- **Frontend**: the acquisition card PART 1 omitted, and a new line in tab 3's
  waterfall.

## Capabilities

**New:** `acquisition-costs` — what closes with the deed, how each is recorded
and evidenced, and how it enters the profit calculation.

**Modified:** `frontend-expenses` (the profit waterfall gains a line).

## Impact

Small: one model, one repository, one router, plus a change to
`budget_service._projected_profit`. The profit correction is a **behaviour
change to an existing figure** — call it out in the PR body, because a user who
has been reading that number will see it drop.

## Deletes from PART 1

Nothing structural. Adds the card PART 1 left out and corrects the waterfall.
