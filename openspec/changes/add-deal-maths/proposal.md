# Proposal: Deal maths — exit costs, thresholds and scenarios

> **PART 8 of 8.** Fully planned: `design.md`, two delta specs and `tasks.md`
> are written. The deltas assume PARTs 1, 2, 6 and 7 have archived —
> `redesign-flip-desk-skin` (the profit view and the derived summary figures),
> `add-deal-and-property` (the `deal_id` spine), `add-acquisition-costs` and
> `add-financing-and-equity` (the two halves of the cost base this one judges).
> **Do it last.** A sensitivity grid over an incomplete cost base is
> confidently wrong.

## Why

Three loose ends of the mockup are one idea: *what happens if this deal goes
differently than planned.*

The mockup's own controls say it — `worksCase` toggles between `estimativa` and
`orçamento`, and the sale price is a slider from 400k to 540k, not a fixed
number. The Lucro tab pairs a sensitivity matrix (sale price × works overrun)
with a warning that names a threshold the app has no concept of: *"Faltam
{gap} para cumprir a margem mínima do investidor — exige venda a {price} ou o
mesmo corte no custo."*

There are also exit costs. Selling has its own — agent commission, and in
Portugal potentially mais-valias — and `projected_profit` subtracts none of
them, so like PART 6's acquisition costs, **profit is overstated**, this time at
the other end of the deal.

PART 1 ships a break-even card, because break-even is one figure over a cost
base the API already has. The sensitivity grid was considered for PART 1 and
deliberately deferred here: nine what-if cells is scenario modelling, and until
PARTs 6 and 7 land every cell is wrong by the entire cost of buying and
financing the property. A confident-looking grid of wrong numbers is worse than
no grid.

## What Changes

- **New `ExitCosts`** per deal: agent commission (rate or amount), capital-gains
  treatment, any early-repayment charge on the loan, staging and legal.
  Subtracted in `projected_profit`. Settling the loan's outstanding balance is
  **not** among them — that is PART 7's transfer, not a cost, and the spec says
  so explicitly so it cannot be subtracted twice.
- **A `Scenario` model** — a named set of assumptions (sale price, works case,
  overrun) that can be compared against the base case, replacing the mockup's
  transient props with something that persists.
- **Investor thresholds**: a minimum acceptable margin per deal, the gap to it,
  the sale price that would meet it, and the break-even sale price — all
  computed server-side.
- **Frontend**: the sensitivity grid itself, the margin callout, the check-card
  row beside it, and a scenario switcher.

## Capabilities

**New:** `deal-maths` — exit costs, scenarios, thresholds, and what
break-even and minimum margin mean.

**Modified:** `budget-summary` (`projected_profit` subtracts the cost of selling,
break-even is solved rather than added at the target price, and the profit the
summary reports is the profit the deal's maths reports), `frontend-expenses`
(the Lucro tab's judgement layer).

## Impact

Medium backend. The genuine risk is presentational: a sensitivity grid is a
confident-looking object, and PARTs 6 and 7 must have landed or every cell in it
is wrong. Do not pull this one forward to make the screen look complete — that
is exactly the trade it was deferred to avoid.

## Deletes from PART 1

Nothing is removed. PART 1's break-even card gains a complete cost base, and
the Lucro tab gains the sensitivity grid PART 1 left out.
