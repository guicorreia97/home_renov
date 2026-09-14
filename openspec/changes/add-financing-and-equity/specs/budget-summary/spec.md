# Delta: Budget summary — the finance cost inside the profit

**Change ID:** `add-financing-and-equity`
**Affects:** `backend/app/src/models/budget.py`,
`backend/app/src/services/budget_service.py`, `backend/tests/`

> `budget-summary` is authored by `redesign-flip-desk-skin` (PART 1), which has
> not archived, so `openspec/specs/budget-summary/spec.md` does not exist yet.
> The MODIFIED block below is therefore copied from PART 1's delta rather than
> from the main spec, and `openspec validate` reports that as an
> archive-sequencing INFO until PART 1 archives. `add-deal-and-property`
> (PART 2) must archive too, since the summary is read per deal from then on.
>
> `add-acquisition-costs` (PART 6) modifies the same requirement to add its own
> term to the same cost base. The two edits are additive and independent —
> whichever lands second keeps the other's term — and the reconciliation
> identity in this change's `financing` delta fails loudly if either is dropped.
>
> The loan, its schedule, the exit settlement and equity belong to the
> `financing` delta in this change. Only the contract on `BudgetSummary` lives
> here, and it is asserted in one place: this file.

---

## MODIFIED Requirements

### Requirement: Profitability figures are derived from the targets

`BudgetSummary` SHALL report `margin_percent` (profit over target sale price),
`return_on_cost_percent` (profit over total cost) and `break_even_sale_price`
(the sale price at which `projected_profit` is exactly zero).

`projected_profit` SHALL subtract the finance cost to exit — the loan's interest
accrued plus its fees, as the `financing` capability derives it — and SHALL
subtract it exactly once. This is the only term financing adds. The figure SHALL
NOT subtract the exit settlement, the balance outstanding, the debt service or
the principal repaid: each of those is a transfer, and subtracting one would
charge the deal for repaying money it never counted as income. The exit
settlement is reported beside the profit sequence, by the `financing`
capability, and never inside it.

The finance cost SHALL join the cost base the three derived figures are taken
over, so that `break_even_sale_price` remains the price at which
`projected_profit` is zero and the two ratios remain consistent with the profit
stated above them.

Where a deal is financed and its target exit date is unset, the finance cost to
exit is unknowable. `projected_profit` SHALL then be absent, along with every
figure derived from it, rather than reported as a figure that silently omits the
finance cost.

Where a deal has no loan, every figure in this requirement SHALL hold the value
it held before financing existed.

Each SHALL be `None` when the inputs it needs are unset, exactly as
`projected_profit` and `budget_used_percent` already are — never `0`, which
would read as a real answer.

#### Scenario: The targets are set
- GIVEN a target sale price of `465000.00`, a purchase price of `300000.00` and
  a forecast of `120000.00`, on a deal with no loan
- WHEN the summary is requested
- THEN `projected_profit` is `45000.00`, `break_even_sale_price` is
  `420000.00`, and both ratios are reported

#### Scenario: No target sale price
- GIVEN `target_sale_price` is unset
- WHEN the summary is requested
- THEN `margin_percent` and `return_on_cost_percent` are `None`
- AND `break_even_sale_price` is still reported, since it does not depend on
  the sale price

#### Scenario: A zero cost base
- GIVEN no expenses and no purchase price
- WHEN the summary is requested
- THEN `return_on_cost_percent` is `None` rather than a division by zero

#### Scenario: A financed deal's profit carries its finance cost
- GIVEN a target sale price of `465000.00`, a purchase price of `280000.00`,
  acquisition costs of `15125.00`, works of `36750.00` and a finance cost to
  exit of `9125.56`
- WHEN the projected profit is computed
- THEN it is `123999.44`

#### Scenario: Break-even moves with the finance cost
- GIVEN a purchase price of `280000.00`, a forecast of `36750.00`, a finance
  cost to exit of `9125.56` and no acquisition costs recorded
- WHEN `break_even_sale_price` is requested
- THEN it is `325875.56`
- AND a target sale price set to exactly that figure yields a projected profit
  of zero

#### Scenario: A financed deal with no exit date
- GIVEN a financed deal whose target exit date is unset
- WHEN the summary is requested
- THEN `projected_profit`, `margin_percent`, `return_on_cost_percent` and
  `break_even_sale_price` are each absent rather than computed without the
  finance cost

#### Scenario: The settlement is never a profit term
- GIVEN a financed deal whose balance outstanding at exit changes while its
  finance cost to exit is unchanged
- WHEN the summary is requested
- THEN `projected_profit` is the same figure as before
- AND no exit settlement, debt service or principal repaid has been subtracted
  from it

#### Scenario: A deal declared unfinanced is unaffected
- GIVEN a deal the user has declared unfinanced
- WHEN the summary is requested
- THEN no finance term is subtracted, and the profit, the break-even price and
  both ratios match the unfinanced calculation

## ADDED Requirements

### Requirement: The summary names the finance cost it subtracted

`BudgetSummary` SHALL report the finance cost to exit that `projected_profit`
subtracts as a money-valued figure of its own, so that the profit sequence a
consumer displays is reproducible from a single response rather than assembled
across two.

The figure SHALL be `0.00` only for a deal the user has **declared unfinanced**,
which is a genuine zero. Where no loan is recorded and no such declaration has
been made, the figure SHALL be absent rather than zero: an unfinanced deal and a
financed deal whose loan has not yet been entered are indistinguishable by their
records, and only the user can say which this is. It SHALL also be absent for a
financed deal whose target exit date is unset, matching the profit it belongs to.

It SHALL NOT be a second derivation of the same quantity: it is the value the
`financing` capability computes, computed once, and where both responses report
it they SHALL agree to the cent.

#### Scenario: The waterfall reconciles from one response
- GIVEN a financed deal whose finance cost to exit is `9125.56`
- WHEN the summary is requested
- THEN it reports `9125.56` as the finance cost within the projected profit
- AND the profit can be reproduced from the figures in that response alone,
  without the client performing arithmetic on `Money`

#### Scenario: Both responses agree
- GIVEN the summary and the deal's financing figures are both requested
- WHEN the finance cost to exit is read from each
- THEN the two are the same value, derived once rather than computed twice

#### Scenario: A deal declared unfinanced reports a real zero
- GIVEN a deal the user has declared unfinanced
- WHEN the summary is requested
- THEN the finance cost to exit is `0.00`, not absent

#### Scenario: A deal with no loan and no declaration
- GIVEN a deal with no loan recorded, which the user has not declared unfinanced
- WHEN the summary is requested
- THEN the finance cost to exit is absent, not `0.00`
- AND the cost base is reported as incomplete rather than complete

#### Scenario: A financed deal with no exit date
- GIVEN a financed deal whose target exit date is unset
- WHEN the summary is requested
- THEN the finance cost to exit is absent, not `0.00`

### Requirement: An absent profit states which input it is waiting on

Where `projected_profit` is absent, the summary SHALL state which of its inputs
is missing, so a consumer can name the input and offer the action that sets it
rather than reporting that the figure is unavailable.

An unset target sale price and an unset target exit date on a financed deal are
different causes and SHALL be distinguishable. Where more than one input is
missing, each SHALL be reported.

The summary SHALL NOT report a profit and a reason at the same time: the reason
exists only while the figure is absent.

#### Scenario: No target sale price
- GIVEN a deal whose target sale price is unset
- WHEN the summary is requested
- THEN `projected_profit` is absent and the stated reason names the target sale
  price

#### Scenario: A financed deal with no exit date
- GIVEN a financed deal with a target sale price set and no target exit date
- WHEN the summary is requested
- THEN `projected_profit` is absent and the stated reason names the target exit
  date, not the sale price

#### Scenario: Both inputs missing
- GIVEN a financed deal with neither a target sale price nor a target exit date
- WHEN the summary is requested
- THEN both inputs are reported as missing rather than only the first

#### Scenario: A profit that can be computed carries no reason
- GIVEN a deal whose inputs are all set
- WHEN the summary is requested
- THEN `projected_profit` is reported and no missing-input reason accompanies it
