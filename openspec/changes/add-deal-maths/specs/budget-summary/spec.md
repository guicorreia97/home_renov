# Delta: Budget summary — the cost of selling closes the cost base

**Change ID:** `add-deal-maths`
**Affects:** `backend/app/src/models/budget.py`,
`backend/app/src/services/budget_service.py`, `backend/tests/`,
`frontend/src/types/budget.ts`

> `budget-summary` is authored by `redesign-flip-desk-skin` (PART 1), which has
> not archived, so `openspec/specs/budget-summary/spec.md` does not exist yet.
> The MODIFIED block below is copied from PART 1's delta rather than from the
> main spec, and `openspec validate` reports that as an archive-sequencing INFO
> until PART 1 archives. `add-deal-and-property` (PART 2) must archive too,
> since the summary is read per deal from then on.
>
> **This delta is the last of four to touch the same requirement, and is written
> against a profit that already carries the other three's terms.**
> `add-acquisition-costs` (PART 6) adds the combined acquisition total,
> `add-financing-and-equity` (PART 7) adds the finance cost to exit, and
> `add-line-item-budgeting` (PART 5) restates the summary's scope for a deal.
> The cost base stated below is the complete one — purchase, acquisition, works,
> finance and now exit — and the scenarios PARTs 6 and 7 added to this
> requirement are carried forward here rather than dropped. A MODIFIED block
> replaces the whole requirement, so if either of those changes edits its own
> copy before it lands, this one must be re-copied before archiving; that is a
> task in this change (`tasks.md` 10.5), as it is in theirs.
>
> Exit costs themselves — what they are, how a rate and its VAT are recorded,
> the three-state coverage of each cost component, the minimum margin, the
> scenarios and the sensitivity grid — belong to the `deal-maths` delta in this
> change. Only the contract on `BudgetSummary` lives here.

---

## MODIFIED Requirements

### Requirement: Profitability figures are derived from the targets

`BudgetSummary` SHALL report `margin_percent` (profit over target sale price),
`return_on_cost_percent` (profit over total cost) and `break_even_sale_price`
(the sale price at which `projected_profit` is exactly zero).

`projected_profit` SHALL subtract the deal's exit costs — what it costs to sell
the property, as the `deal-maths` capability derives them — in addition to the
purchase price, the combined acquisition total, the forecast works cost and the
finance cost to exit. With this change the cost base is closed at both ends of
the deal: buying, renovating, financing and selling are all inside the figure.
Nothing that increases what a sale yields SHALL be modelled as a negative cost,
so adding a term can only lower the profit.

Because an exit cost may be a rate over the sale price rather than a fixed
amount, `break_even_sale_price` SHALL be solved for, not obtained by adding the
exit costs computed at the target price to the cost base. The two differ by the
commission on the gap between the two prices, and the second is wrong. The
reported price SHALL satisfy its defining property: evaluating the deal at it
SHALL give a projected profit of zero when rounded to the cent.

The two ratios SHALL be computed from that same profit over that same cost base,
so that no two figures on one screen disagree about what the deal costs.

Each SHALL be `None` when the inputs it needs are unset, exactly as
`projected_profit` and `budget_used_percent` already are — never `0`, which
would read as a real answer.

#### Scenario: The targets are set
- GIVEN a target sale price of `465000.00`, a purchase price of `300000.00` and
  a forecast of `120000.00`, on a deal with no loan, no acquisition cost and no
  exit cost recorded
- WHEN the summary is requested
- THEN `projected_profit` is `45000.00`, `break_even_sale_price` is
  `420000.00`, and both ratios are reported

#### Scenario: Profit falls by the cost of selling
- GIVEN a cost base of `370000.00` before exit costs and a target sale price of
  `465000.00`
- AND an agency commission of `6%` of the sale price, VAT included
- WHEN the summary is requested
- THEN `projected_profit` is `67100.00`, not `95000.00`
- AND `margin_percent` is `14.43`

#### Scenario: Break-even is solved, not added at the target price
- GIVEN the same cost base and commission
- WHEN `break_even_sale_price` is requested
- THEN it is `393617.02`
- AND a target sale price set to exactly that figure yields a projected profit
  of `0.00`
- AND it differs from the cost base plus the commission computed at the target
  sale price, which is the answer this requirement forbids

#### Scenario: No target sale price
- GIVEN `target_sale_price` is unset
- WHEN the summary is requested
- THEN `margin_percent` and `return_on_cost_percent` are `None`
- AND `break_even_sale_price` is still reported, and still carries the exit
  costs, since neither depends on the target

#### Scenario: A financed deal with no exit date
- GIVEN a financed deal whose target exit date is unset
- WHEN the summary is requested
- THEN `projected_profit`, `margin_percent`, `return_on_cost_percent` and
  `break_even_sale_price` are each absent rather than computed without the
  finance cost

#### Scenario: A zero cost base
- GIVEN no expenses and no purchase price
- WHEN the summary is requested
- THEN `return_on_cost_percent` is `None` rather than a division by zero

## ADDED Requirements

### Requirement: The summary names the exit costs it subtracted

`BudgetSummary` SHALL report the exit-cost total that `projected_profit`
subtracts as a money-valued figure of its own, so that the profit sequence a
consumer displays is reproducible from a single response rather than assembled
across two. This follows the rule `add-financing-and-equity` established for the
finance cost: a term inside the profit is named beside it.

The figure SHALL be `0.00` for a deal with no exit cost recorded — a genuine
zero — and SHALL be absent wherever the profit it belongs to is absent, so the
two are never readable in contradiction.

It SHALL NOT be a second derivation of the same quantity: it is the value the
`deal-maths` capability computes, computed once. The per-kind breakdown, the
rate and VAT rate behind a commission, the taxable gain behind a capital-gains
figure and the basis each cost applies to remain in `deal-maths`. The summary
carries the one total the waterfall needs, never the records behind it.

#### Scenario: The waterfall reconciles from one response
- GIVEN a deal whose exit costs total `27900.00` at its target sale price
- WHEN the summary is requested
- THEN it reports `27900.00` as the exit costs within the projected profit
- AND the profit sequence can be reproduced from the figures on that response
  alone, without the client performing arithmetic on `Money`

#### Scenario: Nothing recorded yet
- GIVEN a deal with no exit cost recorded
- WHEN the summary is requested
- THEN the exit-cost total is `0.00`, not absent

#### Scenario: A rate-based cost follows the target sale price
- GIVEN an exit cost expressed as a rate over the sale price
- WHEN the deal's target sale price is changed and the summary is requested again
- THEN the reported exit-cost total changes with it
- AND no derived amount has been written back to the stored exit-cost record

#### Scenario: An absent profit takes the figure with it
- GIVEN a financed deal whose target exit date is unset
- WHEN the summary is requested
- THEN the exit-cost total is absent, matching the absent profit

### Requirement: One projected profit exists per deal, and both responses report it

`projected_profit` SHALL be computed exactly once per deal, by one service, over
one cost base. The budget summary and the deal's maths SHALL both report that
same value and SHALL agree to the cent. Neither SHALL derive it independently: a
second implementation of the same arithmetic gives two figures that agree until
the day they do not, and the screen offers no way to tell which one is wrong.

Where the cost base is incomplete, the summary SHALL mark `projected_profit`,
both ratios and `break_even_sale_price` as computed over an incomplete cost base
and SHALL name the components missing — extending to the finance and exit
components the disclosure `add-acquisition-costs` established for the acquisition
component. A profit figure a consumer can read without its caveat is the figure
this sequence of changes exists to stop reporting.

The summary SHALL NOT report that a deal **meets** a minimum-margin threshold.
It reports arithmetic; the verdict, and the rule withholding a favourable one
over an incomplete cost base, belong to `deal-maths`.

The summary SHALL NOT carry the rest of the judgement layer either: the
three-state coverage of every cost component, the exit-cost breakdown, the
minimum margin and its threshold figures, the saved scenarios and the
sensitivity grid SHALL be requested from `deal-maths`. The summary is refetched
after every expense mutation, and recomputing a nine-cell sensitivity grid on
each receipt edit is work nobody asked for.

#### Scenario: The two responses agree
- GIVEN a deal with acquisition costs, finance costs and exit costs recorded
- WHEN the summary and the deal's maths are both requested
- THEN `projected_profit` is identical in both
- AND it was derived once rather than computed twice

#### Scenario: The summary marks an incomplete cost base
- GIVEN a deal whose acquisition costs have not been entered and not been
  declared absent
- WHEN the summary is requested
- THEN the profit, the ratios and the break-even price are each marked as
  computed over an incomplete cost base
- AND the acquisition component is named as the one missing

#### Scenario: The verdict is not on the summary
- GIVEN a deal carrying a minimum margin its profit clears
- WHEN the summary is requested
- THEN no threshold, no shortfall, no required sale price and no met-threshold
  verdict is reported on it
- AND the margin itself is still reported

#### Scenario: The grid is not on the summary
- GIVEN an expense is created, edited or deleted
- WHEN the summary is re-fetched in response
- THEN no sensitivity grid, scenario evaluation or threshold solve is computed
  to answer it
