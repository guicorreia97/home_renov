# Delta: Budget summary — derived figures

**Change ID:** `redesign-flip-desk-skin`
**Affects:** `backend/app/src/models/budget.py`,
`backend/app/src/services/budget_service.py`, `backend/tests/`

---

## Purpose

The figures the server derives from expenses and targets, and the guarantee
that the client never recomputes one. Money is an exact decimal end to end;
every sum, share and ratio on a screen traces to a value computed here in
`Decimal`, never to arithmetic in a browser.

## ADDED Requirements

### Requirement: Every displayed total is computed server-side

`GET /budget/summary` SHALL return every aggregate the UI displays. No client
may sum, subtract, divide or compare `Money` values to produce a figure it
shows — `Money` crosses the wire as a string and is converted to a number only
at the final formatting step.

All money-valued figures SHALL be `Decimal`, quantised to two places half-up by
the existing `Money` types. Ratios SHALL be returned as numbers, not as decimal
strings, so no formatter can mistake a percentage for currency.

#### Scenario: A total the UI needs does not exist
- GIVEN a panel needs a sum, share or ratio over `Money`
- WHEN it is implemented
- THEN the figure is added to `BudgetSummary` and computed in the service
- AND the client renders the returned value without arithmetic

#### Scenario: Exactness survives aggregation
- GIVEN expenses of `0.10` and `0.20`
- WHEN they are totalled
- THEN the total is exactly `0.30`

### Requirement: Category totals are broken down by status

`CategoryTotal` SHALL carry `planned`, `pending` and `paid` amounts alongside
its existing committed `amount`, and a `share` of committed spend.

The existing `amount` field SHALL keep its current meaning — committed spend,
excluding PLANNED — so that adding the breakdown changes nothing for an
existing consumer.

#### Scenario: A category holds all three statuses
- GIVEN a category with a paid expense of `100.00`, a pending one of `50.00`
  and a planned one of `25.00`
- WHEN the summary is requested
- THEN that category reports `paid` `100.00`, `pending` `50.00`, `planned`
  `25.00`, and `amount` `150.00`

#### Scenario: Group subtotals reconcile with the grand total
- GIVEN expenses across several categories, **including at least one PLANNED**
- WHEN the per-category figures are summed across all categories
- THEN `planned` sums to `total_planned`, `paid` to `total_paid`, and
  `planned + pending + paid` to `total_forecast`

#### Scenario: Shares are reported, not derived downstream
- GIVEN committed spend split `750.00` / `250.00` across two categories
- WHEN the summary is requested
- THEN the categories report shares of `75` and `25`
- AND a category with no committed spend reports a share of `0`, never a
  division by zero

### Requirement: Profitability figures are derived from the targets

`BudgetSummary` SHALL report `margin_percent` (profit over target sale price),
`return_on_cost_percent` (profit over total cost) and `break_even_sale_price`
(`purchase_price + total_forecast`).

Each SHALL be `None` when the inputs it needs are unset, exactly as
`projected_profit` and `budget_used_percent` already are — never `0`, which
would read as a real answer.

#### Scenario: The targets are set
- GIVEN a target sale price of `465000.00`, a purchase price of `300000.00` and
  a forecast of `120000.00`
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
