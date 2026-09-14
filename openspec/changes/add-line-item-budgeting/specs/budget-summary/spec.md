# Delta: Budget summary — the deal's works figures

**Change ID:** `add-line-item-budgeting`
**Affects:** `backend/app/src/models/budget.py`,
`backend/app/src/services/budget_service.py`, `backend/tests/`,
`frontend/src/types/budget.ts`

> Assumes **PART 1** (`redesign-flip-desk-skin`) has archived — it authors this
> capability, and the MODIFIED block below is copied from its delta
> (`openspec/changes/redesign-flip-desk-skin/specs/budget-summary/spec.md`),
> which is the latest text for that requirement. Assumes **PART 2**
> (`add-deal-and-property`) has archived — the summary is served once per deal,
> per its requirement that "every total, remaining figure and per-category total
> covers that deal's expenses alone". **PART 2 ships no `budget-summary` delta**,
> so the route correction from `/budget/summary` to
> `/deals/{deal_id}/budget/summary` lands here, exactly as this change's
> `frontend-expenses` delta absorbs the edit PART 3 never wrote. Assumes
> **PART 3** (`add-works-phases`) has archived — its per-phase blocks on this
> same summary are untouched here.
>
> This delta specifies the **contract**: which figures the summary carries, what
> they are named, what shape they cross the wire in, and what does not change.
> The arithmetic behind them — how a committed balance, a forecast at completion
> and the two variances are derived — is specified once, in this change's
> `line-item-budgeting` delta, and is not restated here.
>
> Does **not** assume **PART 4** (`add-contractors`), which adds no figure to
> this response.

---

## MODIFIED Requirements

### Requirement: Every displayed total is computed server-side

`GET /deals/{deal_id}/budget/summary` SHALL return every deal-level aggregate
the UI displays. No client may sum, subtract, divide or compare `Money` values
to produce a figure it shows — `Money` crosses the wire as a string and is
converted to a number only at the final formatting step.

All money-valued figures SHALL be `Decimal`, quantised to two places half-up by
the existing `Money` types. Ratios SHALL be returned as numbers, not as decimal
strings, so no formatter can mistake a percentage for currency.

Figures belonging to a single line item or a single works phase SHALL be served
by the endpoints that own those records rather than by the summary, and SHALL be
derived on the server under these same rules. The guarantee is about **where a
figure is computed**, not about which response carries it: a client SHALL NOT
reach a displayed figure by arithmetic, whichever endpoint it came from. The
summary SHALL carry one figure for every deal-level total a panel shows, so that
no screen has to add up a list to fill in its own header.

#### Scenario: A total the UI needs does not exist
- GIVEN a panel needs a sum, share or ratio over `Money`
- WHEN it is implemented
- THEN the figure is added to `BudgetSummary` and computed in the service
- AND the client renders the returned value without arithmetic

#### Scenario: Exactness survives aggregation
- GIVEN expenses of `0.10` and `0.20`
- WHEN they are totalled
- THEN the total is exactly `0.30`

#### Scenario: A deal-level figure a panel shows
- GIVEN the works budget view shows a deal-wide forecast and variance
- WHEN the view renders
- THEN both arrive from the summary already derived
- AND neither is summed in the client from the line items the table lists

#### Scenario: A figure belonging to one line
- GIVEN a line item's own forecast and variance
- WHEN they are displayed
- THEN they arrive from the line-item response rather than from the summary
- AND they are still computed on the server, never in the client

## ADDED Requirements

### Requirement: The summary carries the deal's works figures in a nested object

`BudgetSummary` SHALL carry a nested **`works_budget`** object holding the
deal-level line-item figures, so that the two vocabularies on this one response
cannot be read for each other.

`works_budget` SHALL carry, for the whole deal:

- `budgeted` — the sum of the line items' budgeted amounts.
- `awarded` — the sum of the line items' awarded amounts.
- `invoiced` — the sum of the line items' invoiced amounts.
- `outstanding_commitment` — what is awarded and not yet invoiced.
- `forecast` — the sum of the per-line forecasts at completion.
- `forecast_variance` — forecast less budgeted, always reported.
- `settled_variance` — invoiced less budgeted, reported only when every line
  item in the deal is closed, and absent otherwise.
- `unassigned_invoiced` — invoiced spend attached to no line item.
- `percent_invoiced` — invoiced over budgeted, absent when budgeted is zero.

Each SHALL be derived by the rules this change's `line-item-budgeting`
capability fixes. This requirement fixes their names, their home and their wire
shape; nothing here re-derives them, and the two capabilities SHALL NOT both
state the arithmetic.

Money-valued members SHALL cross the wire as decimal strings, and
`percent_invoiced` SHALL cross as a number — the precedent is
`budget_used_percent` (`backend/app/src/models/budget.py:56`), not the money
fields beside it. `settled_variance` and `percent_invoiced` SHALL be nullable,
and a client SHALL NOT substitute zero for either.

The new commitment figure SHALL be named `outstanding_commitment`. The bare word
`committed` SHALL NOT be introduced as a new field name on this response,
because it already names a different quantity here.

#### Scenario: The works figures arrive with the summary
- GIVEN a deal with line items across several phases
- WHEN its budget summary is requested
- THEN the response carries a `works_budget` object with every field above
- AND a panel showing the deal's works totals needs no second request

#### Scenario: A deal with no line items yet
- GIVEN a deal that has no line items
- WHEN its budget summary is requested
- THEN `works_budget` is still present, and every figure summed over its line
  items — `budgeted`, `awarded`, `invoiced`, `outstanding_commitment` and
  `forecast` — is `0.00` rather than absent
- AND `unassigned_invoiced` still reports that deal's invoiced spend, which is
  the whole of it
- AND `percent_invoiced` is absent rather than zero

#### Scenario: Ratios and amounts stay distinguishable on the wire
- GIVEN a `works_budget` reporting both an invoiced amount and a percent
  invoiced
- WHEN the response is read
- THEN the amount is a decimal string and the percent is a number

#### Scenario: A withheld settled variance
- GIVEN a deal in which one line item is closed and one is still in progress
- WHEN the summary is requested
- THEN `works_budget.settled_variance` is absent
- AND `works_budget.forecast_variance` is still reported

### Requirement: The existing spend totals keep their names, meanings and values

`total_paid`, `total_committed`, `total_planned` and `total_forecast` SHALL keep
the names, definitions and values they have today
(`backend/app/src/services/budget_service.py:41-45`,
`backend/app/src/models/budget.py:48-51`). Adding the works figures SHALL change
none of them, and SHALL NOT change `remaining_budget`, `budget_used_percent`,
`over_budget`, `projected_profit`, `expense_count` or `by_category` either.

In particular `total_committed` SHALL continue to mean paid plus
invoiced-but-unpaid — every expense whose status is PENDING or PAID — even
though the works vocabulary arriving beside it uses "committed" for the opposite
side of that line, the part of an award that has **not** been billed. The two
senses meet on one response and neither moves: the existing field keeps the
meaning its consumers already depend on (`frontend/src/types/budget.ts:46-47`),
and the new quantity is named `outstanding_commitment` so that no reader has to
infer which sense is meant.

An existing field SHALL NOT be renamed to resolve the collision. A rename is the
loudest possible redefinition of a meaning this change has undertaken to leave
alone.

#### Scenario: The existing totals are unchanged
- GIVEN a deal with a paid expense of `100.00`, a pending one of `50.00` and a
  planned one of `25.00`
- WHEN the summary is requested
- THEN `total_paid` is `100.00`, `total_committed` is `150.00`, `total_planned`
  is `25.00` and `total_forecast` is `175.00`
- AND each is exactly what it was on the same expenses before this change

#### Scenario: Both senses of committed on one response
- GIVEN a deal whose only line item is awarded `7500.00`, against which
  `5400.00` has been invoiced, and no other expense exists
- WHEN the summary is requested
- THEN `total_committed` is `5400.00` — what has been billed
- AND `works_budget.outstanding_commitment` is `2100.00` — what has not
- AND neither figure is derived from the other

### Requirement: The works figures reconcile with the expense totals beside them

`works_budget.invoiced` plus `works_budget.unassigned_invoiced` SHALL equal
`total_committed` on every response, for every deal, in every state.

This is the one point where the two vocabularies are required to meet, and it is
the proof that nothing has been double-counted or lost: every PENDING or PAID
expense is either attached to a line item and counted once in the works invoiced
total, or unattached and counted once in the unassigned total. A PLANNED expense
SHALL contribute to neither, exactly as it contributes to neither
`total_committed` today (`backend/app/src/services/budget_service.py:41-44`).

The reconciliation SHALL be covered by a test rather than left as a property a
reader is expected to notice. The states that break it are states no test of the
line-item arithmetic alone would produce.

#### Scenario: Attached and unattached spend reconcile
- GIVEN a deal with attached invoiced expenses, unattached invoiced expenses and
  at least one PLANNED expense
- WHEN the summary is requested
- THEN `works_budget.invoiced` plus `works_budget.unassigned_invoiced` equals
  `total_committed`
- AND the PLANNED expense is counted in `total_planned` and in neither of the two

#### Scenario: A deal that has not adopted line items
- GIVEN a deal with `36750.00` of invoiced expenses and no line items
- WHEN the summary is requested
- THEN `works_budget.invoiced` is `0.00` and `works_budget.unassigned_invoiced`
  is `36750.00`
- AND their sum is `total_committed`, so the view reconciles with the ledger
  rather than appearing to have lost the spend

#### Scenario: Deleting a line item moves spend without losing it
- GIVEN a deal whose works figures reconcile
- WHEN a line item with expenses attached to it is deleted
- THEN those expenses move from `works_budget.invoiced` into
  `works_budget.unassigned_invoiced`
- AND `total_committed` is unchanged and the reconciliation still holds
