# Delta: Budget summary — the cost base gains acquisition

**Change ID:** `add-acquisition-costs`
**Affects:** `backend/app/src/models/budget.py`,
`backend/app/src/services/budget_service.py`, `backend/tests/`

> This delta assumes `redesign-flip-desk-skin` (PART 1) and
> `add-deal-and-property` (PART 2) have archived. PART 1 **authors** this
> capability and the three figures corrected below — `break_even_sale_price`,
> `margin_percent` and `return_on_cost_percent` — so the requirement modified
> here is copied from PART 1's delta, which is the latest text for it; PART 2
> modifies this capability not at all and only scopes the summary to one deal.
> If PART 1's text changes before it lands, the copy below must be re-synced.

---

## MODIFIED Requirements

### Requirement: Profitability figures are derived from the targets

`BudgetSummary` SHALL report `margin_percent` (profit over target sale price),
`return_on_cost_percent` (profit over total cost) and `break_even_sale_price`
(`purchase_price + acquisition_total + total_forecast`).

Break-even SHALL be computed over the same cost base as the profit figure it
sits beside, because break-even is by definition the sale price at which the
projected profit is zero. A break-even price that omitted acquisition costs
while profit subtracted them would put two figures on one screen that cannot
both be true, and the more precise-looking one would be the wrong one.

The ratios SHALL be computed from the corrected profit: `margin_percent` over
the target sale price, and `return_on_cost_percent` over the total cost — the
purchase price, the combined acquisition total and the forecast works cost
together. Both SHALL be returned as numbers, never as decimal strings.

Each SHALL be `None` when the inputs it needs are unset, exactly as
`projected_profit` and `budget_used_percent` already are — never `0`, which
would read as a real answer.

#### Scenario: The targets are set
- GIVEN a target sale price of `465000.00`, a purchase price of `300000.00`, a
  forecast of `120000.00` and no acquisition cost recorded
- WHEN the summary is requested
- THEN `projected_profit` is `45000.00`, `break_even_sale_price` is
  `420000.00`, and both ratios are reported

#### Scenario: Break-even moves with the acquisition total
- GIVEN a purchase price of `280000.00`, a forecast of `50000.00` and
  acquisition costs totalling `15125.00`
- WHEN the summary is requested
- THEN `break_even_sale_price` is `345125.00`, not `330000.00`
- AND a target sale price set to exactly that figure yields a projected profit
  of zero

#### Scenario: The ratios follow the corrected base
- GIVEN a deal whose projected profit has been reduced by an acquisition total
- WHEN the margin and return-on-cost ratios are requested
- THEN both are computed from the corrected profit
- AND the return is taken over a cost base that includes the acquisition total,
  never over the purchase price and works forecast alone

#### Scenario: No target sale price
- GIVEN `target_sale_price` is unset
- WHEN the summary is requested
- THEN `margin_percent` and `return_on_cost_percent` are `None`
- AND `break_even_sale_price` is still reported and still includes the
  acquisition total, since neither depends on the sale price

#### Scenario: A zero cost base
- GIVEN no expenses, no purchase price and no acquisition costs
- WHEN the summary is requested
- THEN `return_on_cost_percent` is `None` rather than a division by zero

## ADDED Requirements

### Requirement: Projected profit subtracts acquisition costs

**BREAKING — a correction to an existing figure.** The projected profit for a
deal is today the target sale price less the purchase price less the forecast
works cost, and therefore ignores the entire cost of buying the property. It
SHALL become the target sale price less the purchase price, less the combined
acquisition total, less the forecast works cost.

The figure SHALL keep its existing name and its existing place in the response.
This is the same quantity, computed correctly — not a second figure beside the
old one — because leaving both would let a reader choose the flattering one.

The correction SHALL move no renovation figure: the committed, planned and
forecast expense totals, the per-category breakdown, the remaining budget, the
budget-used percentage and the over-budget flag SHALL each report exactly what
they reported before, because acquisition money was never renovation money.

Profit SHALL remain undefined where it is undefined today: absent without a
target sale price, rather than reported as a loss.

#### Scenario: Profit falls by the acquisition total
- GIVEN a target sale price of `465000.00`, a purchase price of `280000.00`, a
  forecast works cost of `50000.00` and acquisition costs totalling `15125.00`
- WHEN the summary is requested
- THEN the projected profit is `119875.00`, not `135000.00`
- AND it falls by exactly the acquisition total and by nothing else

#### Scenario: No acquisition costs recorded
- GIVEN a deal with no acquisition cost recorded
- WHEN the summary is requested
- THEN the projected profit is exactly what it was before this change
- AND the correction is visible only where there is something to correct

#### Scenario: The renovation figures do not move
- GIVEN a deal with a planned budget and expenses recorded
- WHEN an acquisition cost is recorded for that deal
- THEN the forecast total, the per-category totals, the remaining budget, the
  budget-used percentage and the over-budget flag are unchanged

#### Scenario: No target sale price
- GIVEN `target_sale_price` is unset
- WHEN the summary is requested
- THEN the projected profit is absent rather than zero or negative
- AND the acquisition totals are still reported, since they do not depend on
  the sale price

### Requirement: The summary carries the deal's acquisition totals

`BudgetSummary` SHALL carry the deal's acquisition figures alongside its
renovation figures — the combined total, the settled portion, the estimated
portion, and the per-kind breakdown — on the same response the profit and
budget views already fetch. A consumer SHALL NOT have to make a second request
to place an acquisition total next to the profit it was subtracted from, which
would make it possible to hold two figures fetched at different moments.

The money-valued figures SHALL be `Decimal` server-side, quantised to two
places half-up by the existing `Money` types, and SHALL cross the wire as
strings under the rule that already forbids a client from summing money.

Each of the three totals SHALL be present and zero when a deal has no
acquisition cost recorded, never omitted, so that a consumer never has to read
an absent figure as nothing. What those totals contain, and how the per-kind
breakdown is grouped, is specified in `acquisition-costs`.

#### Scenario: The totals ride on the existing summary
- GIVEN a deal with acquisition costs recorded
- WHEN the summary is requested
- THEN the combined, settled and estimated acquisition totals and the per-kind
  breakdown are all on that one response
- AND no second endpoint has to be called to obtain them

#### Scenario: Nothing recorded yet
- GIVEN a deal with no acquisition cost recorded
- WHEN the summary is requested
- THEN the settled, estimated and combined acquisition totals are each zero
- AND they are reported as zero rather than omitted

### Requirement: The cost base behind a profit figure is disclosed

Because the profit figure changes meaning with this change, the summary SHALL
expose enough for a consumer to state which costs a projection contains: the
purchase price, the acquisition total split by state, and the forecast works
cost SHALL each be available as their own figures rather than only as their
sum, so that the profit sequence is reproducible from the response alone.

A projection whose acquisition base is empty SHALL be distinguishable from one
whose acquisition costs have been recorded and total zero-so-far, so that an
unfilled cost base is never read as a complete one.

#### Scenario: The waterfall can be itemised
- GIVEN a deal with a purchase price, acquisition costs and a works forecast
- WHEN the summary is requested
- THEN each of those three figures is separately available, and their
  relationship to the projected profit is reproducible from the response alone

#### Scenario: An empty acquisition base is visible as empty
- GIVEN a deal with a target sale price and no acquisition cost recorded
- WHEN a profit projection is presented
- THEN the absence of any recorded acquisition cost is discoverable from the
  response, rather than appearing as a completed base totalling zero
