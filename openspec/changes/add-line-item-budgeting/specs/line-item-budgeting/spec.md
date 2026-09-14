# Delta: Line-item budgeting — orçamento, adjudicado, faturado, desvio

**Change ID:** `add-line-item-budgeting`
**Affects:** `backend/app/src/models/`, `backend/app/src/repositories/`,
`backend/app/src/services/budget_service.py`, `backend/app/api/endpoints/`,
`frontend/src/types/budget.ts`, `frontend/src/api/`

> Assumes **PART 1** (`redesign-flip-desk-skin`) has archived — it establishes
> that every displayed total is computed server-side in `Decimal` and that the
> client never does arithmetic on `Money`. Assumes **PART 2**
> (`add-deal-and-property`) has archived — every record here is addressed
> through `/deals/{deal_id}/…` and stored under that deal. Assumes **PART 3**
> (`add-works-phases`) has archived — a line item belongs to a phase, and a
> phase belongs to a deal.
>
> Everything here that touches a phase is expressed in terms of *behaviour* —
> "the line item names the phase it belongs to" — rather than in terms of PART 3's
> fields or routes, so that the two changes stay decoupled. Where a phase's
> budget figure comes from is the one question PART 3 deferred to a later change,
> and the `phases` delta in this change answers it.
>
> Does **not** assume **PART 4** (`add-contractors`). The contractor on a line
> item is free text here, exactly as `Expense.payee` is free text today
> (`backend/app/src/models/expense.py:58`), and PART 4 migrates both together.

---

## Purpose

What a *rubrica* is: one budgeted piece of work inside a works phase, carrying
the three money figures the budget table exists to show diverge — what was
planned, what has been promised to someone, and what has actually been billed.
This capability defines each of those precisely, states which is recorded and
which is derived, and fixes the arithmetic for the committed balance, the
forecast at completion and the variance, so that every figure on the screen has
exactly one definition and it lives on the server.

## ADDED Requirements

### Requirement: A line item is one budgeted piece of work inside a phase

The system SHALL model a **line item** (*rubrica*) as a single named piece of
work that is budgeted, awarded, invoiced and finished as a unit — "Pintura
interior — 2 demãos", "Cozinha — móveis e bancada", "Rede de águas e esgotos".

A line item SHALL belong to exactly one works phase, and through that phase to
exactly one deal. It SHALL carry a name, the phase it belongs to, a display
position within that phase, a status, the money figures defined below, and an
optional note.

A line item SHALL carry the contractor responsible for it as free text, which
MAY be unset while nobody has been chosen. It SHALL NOT require a contractor
record to exist, so that a line can be budgeted before anyone has been
approached.

A line item SHALL be reassignable to another phase in the same deal without
being deleted and recreated, so that its identity — and every expense attached
to it — survives the move.

#### Scenario: Creating a line item
- GIVEN a deal with a works phase
- WHEN a line item is created in that phase with a name and a budgeted amount
- THEN it is stored against that phase with the not-awarded status
- AND its awarded amount reads as zero and its invoiced amount as zero

#### Scenario: A line item with nobody appointed yet
- GIVEN a line item that has been budgeted but not awarded
- WHEN it is read
- THEN its contractor is absent rather than an invented name or an empty string
- AND the interface renders the absence explicitly, not as a blank cell

#### Scenario: Moving a line item between phases
- GIVEN a line item in the plastering phase with expenses attached to it
- WHEN it is reassigned to the painting phase
- THEN its identifier is unchanged and every attached expense is still attached
- AND both phases' rollups reflect the move

#### Scenario: A line item outside a deal
- WHEN a line item is requested through a deal that does not own it
- THEN the response is not-found, and no line item is returned

### Requirement: The three recorded money figures mean three different things

A line item SHALL carry three distinct monetary quantities, which SHALL NOT be
collapsed into one another. Each answers a different question, and the whole
purpose of the budget table is watching them diverge:

- **Budgeted** (*orçamento*) — the **plan**. What this work is expected to cost.
  It is entered by the user, is never derived from anything, and does not change
  when money moves. It is the baseline every variance is measured against.
- **Awarded** (*adjudicado*) — the **obligation**. The amount agreed with a
  contractor for this work. It is entered by the user when the work is awarded,
  and revised when a variation is agreed. It is a promise to pay, not a payment.
- **Invoiced** (*faturado*) — the **settled fact**. What has actually been
  billed for this work. It is **derived** from the expenses attached to the line
  item and SHALL NOT be entered by hand.

Budgeted and awarded SHALL be non-negative amounts, defaulting to zero for
awarded. All three SHALL be exact decimal amounts under the project's existing
two-place half-up money rules.

A line item whose status is *not awarded* SHALL have an awarded amount of zero.
The system SHALL reject an attempt to record an award on a line item that is
marked as not awarded, because "not awarded, 3.300 €" is a contradiction a user
can otherwise create by accident and never notice.

#### Scenario: The three figures are independent
- GIVEN a line item budgeted at `7500.00`
- WHEN `7500.00` is awarded to a contractor and `5400.00` has been invoiced
- THEN the line reports budgeted `7500.00`, awarded `7500.00` and invoiced
  `5400.00` as three separate figures
- AND none of the three is inferred from another

#### Scenario: An award above the budget
- GIVEN a line item budgeted at `4300.00`
- WHEN the award is revised to `4980.00` after a variation
- THEN the budgeted amount stays `4300.00`
- AND the awarded amount is `4980.00`, so the gap between plan and obligation
  stays visible rather than being absorbed by editing the budget

#### Scenario: An award on a line marked not awarded
- GIVEN a line item whose status is not awarded
- WHEN an awarded amount greater than zero is submitted without changing the
  status
- THEN the request is rejected with a validation error
- AND the stored line item is unchanged

#### Scenario: Invoiced cannot be typed
- WHEN a request attempts to set a line item's invoiced amount directly
- THEN the request is rejected
- AND the invoiced amount continues to be derived from the attached expenses

### Requirement: Committed money is what is awarded and not yet invoiced

The system SHALL derive a line item's **committed** (*comprometido*) amount as
the part of its award that has not yet been billed:

```
committed = max(awarded − invoiced, 0)
```

Committed and invoiced are therefore **disjoint**: money moves out of committed
as it moves into invoiced, and adding the two never double-counts. A line whose
award has been fully billed SHALL report a committed amount of zero.

The clamp at zero SHALL apply when more has been invoiced than was awarded. A
negative "still to be billed" is meaningless; the overbilling stays visible in
the invoiced amount and in the variance, and SHALL NOT be hidden by a negative
commitment.

**This word already means something else in this codebase.**
`BudgetSummary.total_committed` is the sum of expenses whose status is PENDING
or PAID (`backend/app/src/services/budget_service.py:41-44`), documented as
"Paid plus invoiced-but-unpaid" (`backend/app/src/models/budget.py:52`) and as
"Committed spend is PENDING + PAID" (`backend/app/src/models/expense.py:41-45`).
That figure is the deal's **invoiced** total in this capability's vocabulary,
not its committed total. The collision is resolved on the response itself — the
existing field keeps its meaning and the new quantity is exposed as
`outstanding_commitment` — and that is specified once, in this change's
`budget-summary` delta, which owns the `BudgetSummary` contract.

#### Scenario: Awarded, nothing billed yet
- GIVEN a line item awarded `3300.00` with nothing invoiced
- WHEN it is read
- THEN its committed amount is `3300.00`
- AND its invoiced amount is `0.00`

#### Scenario: Partly billed
- GIVEN a line item awarded `7500.00` against which `5400.00` has been invoiced
- WHEN it is read
- THEN its committed amount is `2100.00`
- AND committed plus invoiced equals the award exactly

#### Scenario: Fully billed
- GIVEN a line item awarded `4980.00` against which `4980.00` has been invoiced
- WHEN it is read
- THEN its committed amount is `0.00`, not a negative figure

#### Scenario: Billed beyond the award
- GIVEN a line item awarded `2000.00` against which `2400.00` has been invoiced
- WHEN it is read
- THEN its committed amount is `0.00`
- AND its invoiced amount is `2400.00`, so the excess is visible rather than
  netted away

### Requirement: Invoiced money rolls up from expenses and is never typed twice

A line item's invoiced amount SHALL be the sum of the amounts of the expenses
attached to it whose status is PENDING or PAID. An expense whose status is
PLANNED SHALL NOT contribute to it.

PLANNED is excluded because a planned expense is an estimate, not an invoice —
nothing has been billed. This is the same exclusion `_by_category` already
applies (`backend/app/src/services/budget_service.py:98-108`); under this
capability the exclusion stops being incidental and becomes the definition:
*faturado* means a document exists, whether or not it has been paid.

An expense SHALL be attachable to at most one line item, and the attachment MAY
be absent — not every expense is works, and an expense recorded before its line
item existed has none.

An expense attached to a line item SHALL be reported under that line item's
phase. It SHALL NOT be possible for an expense to be attached to a line item in
one phase while being recorded against a different phase.

#### Scenario: Two invoices against one line
- GIVEN a line item with a paid expense of `3000.00` and a pending expense of
  `2400.00` attached
- WHEN the line item is read
- THEN its invoiced amount is `5400.00`

#### Scenario: A planned expense does not count as invoiced
- GIVEN a line item with a planned expense of `1200.00` attached and nothing
  else
- WHEN the line item is read
- THEN its invoiced amount is `0.00`
- AND the planned expense is still listed against the line item

#### Scenario: Attaching an expense updates the rollup immediately
- GIVEN a line item reporting `2150.00` invoiced
- WHEN a paid expense of `1250.00` is attached to it
- THEN the next read reports `3400.00` invoiced, and the phase and deal rollups
  move by the same amount

#### Scenario: An expense's phase follows its line item
- GIVEN an expense attached to a line item in the plastering phase
- WHEN the expense is read
- THEN the phase it is reported under is the plastering phase
- AND a request recording it against a different phase is rejected

### Requirement: The forecast at completion is the worst of plan, obligation and fact

The system SHALL derive a **forecast at completion** for every line item — what
the work is now expected to end up costing.

For a line item that is **not closed**:

```
forecast = max(budgeted, awarded, invoiced)
```

which is equivalently `max(budgeted, invoiced + committed)`, since
`invoiced + committed` is `max(awarded, invoiced)` by the committed definition.

For a line item that is **closed**:

```
forecast = invoiced
```

The two branches exist for different reasons and SHALL both be kept. While work
is outstanding, you will pay at least what you agreed, at least what has already
been billed, and there is no evidence yet that you will beat the plan — so the
forecast is the largest of the three, and an unawarded line still forecasts its
budget rather than zero. Once a line is closed the plan and the award are
history and the invoices are the whole truth, so the forecast is what was
actually billed; keeping the maximum there would pin every finished line to its
budget forever and permanently overstate the cost of the deal.

The forecast SHALL be derived, never stored, so that it cannot drift from the
figures it is computed from.

#### Scenario: Budget still governs
- GIVEN an open line item budgeted `3800.00`, awarded `2850.00`, invoiced
  `2150.00`
- WHEN it is read
- THEN its forecast is `3800.00`

#### Scenario: The award has overtaken the budget
- GIVEN an open line item budgeted `2700.00`, awarded `2750.00`, invoiced
  `1250.00`
- WHEN it is read
- THEN its forecast is `2750.00`, not `2700.00`

#### Scenario: Nothing awarded yet
- GIVEN an open line item budgeted `1200.00` with nothing awarded and nothing
  invoiced
- WHEN it is read
- THEN its forecast is `1200.00`, not `0.00`

#### Scenario: A closed line forecasts what it cost
- GIVEN a closed line item budgeted `4300.00` with `4980.00` invoiced
- WHEN it is read
- THEN its forecast is `4980.00`

#### Scenario: A closed line that came in under budget
- GIVEN a closed line item budgeted `1200.00` with `1120.00` invoiced
- WHEN it is read
- THEN its forecast is `1120.00`, not `1200.00`

### Requirement: Variance is reported as a settled fact or as a forecast, never as a mixture

The system SHALL derive two distinct variances for every line item, and SHALL
keep them distinguishable wherever they are displayed:

- **Settled variance** — `invoiced − budgeted`. It SHALL be reported **only for
  a closed line item**, and SHALL be absent for any line item still open.
- **Forecast variance** — `forecast − budgeted`. It SHALL always be reported.

Settled variance is withheld while a line is open because `invoiced − budgeted`
on unfinished work is not a variance — it is how much of the budget has not been
billed yet, and it reads as "under budget" for every line that has merely not
been invoiced. Presenting that as a saving is the specific error this rule
exists to prevent.

**A positive variance means over budget.** This is the opposite sign convention
to the existing `remaining_budget`, which is `planned_budget − total_forecast`
and is positive when there is money left
(`backend/app/src/models/budget.py:55-57`). Both SHALL keep their own
convention, each SHALL be named so the convention is unambiguous, and the two
SHALL NOT be rendered by a component that assumes one sign means one thing.

#### Scenario: A closed line over budget
- GIVEN a closed line item budgeted `4300.00` with `4980.00` invoiced
- WHEN it is read
- THEN its settled variance is `+680.00`
- AND the interface presents it as an overrun

#### Scenario: A closed line under budget
- GIVEN a closed line item budgeted `1200.00` with `1120.00` invoiced
- WHEN it is read
- THEN its settled variance is `-80.00`
- AND the interface presents it as a saving

#### Scenario: An open line has no settled variance
- GIVEN an open line item budgeted `7500.00` with `5400.00` invoiced
- WHEN it is read
- THEN its settled variance is absent rather than `-2100.00`
- AND its forecast variance is `0.00`, because the forecast still equals the
  budget

#### Scenario: An open line already known to overrun
- GIVEN an open line item budgeted `2700.00` and awarded `2750.00`
- WHEN it is read
- THEN its forecast variance is `+50.00`
- AND its settled variance is still absent

#### Scenario: The two sign conventions do not collide
- GIVEN a deal that is forecast to exceed its planned budget
- WHEN the summary is read
- THEN `remaining_budget` is negative and the works forecast variance is
  positive, both describing the same overrun

### Requirement: Line-item figures roll up to the phase and to the deal

The system SHALL report the same seven figures — budgeted, awarded, invoiced,
committed, forecast, forecast variance and settled variance — aggregated over a
phase's line items and over the whole deal's line items.

Every aggregate SHALL be the sum of the corresponding per-line figures, computed
over line items rather than recomputed from the aggregate inputs. In particular
the forecast total SHALL be the sum of the per-line forecasts, so that one
line's slack cannot absorb another line's overrun.

A settled variance SHALL be reported for a phase or a deal only when **every**
line item in it is closed, for the same reason it is withheld from an open line.

The system SHALL also report a **percent invoiced** for each phase and for the
deal — invoiced over budgeted. It SHALL be returned as a number, not as a money
string, so no formatter can render it as currency, and it SHALL be absent rather
than zero when the budgeted amount is zero.

#### Scenario: A phase total is the sum of its lines
- GIVEN a phase with lines budgeted `7500.00`, `2800.00` and `1700.00`
- WHEN the phase rollup is read
- THEN its budgeted total is `12000.00`

#### Scenario: One line's slack does not absorb another's overrun
- GIVEN a phase with an open line budgeted `3800.00` forecasting `3800.00` and
  an open line budgeted `2700.00` awarded `2750.00`
- WHEN the phase rollup is read
- THEN its forecast total is `6550.00`
- AND it is not `6500.00`, which is what comparing the phase's combined budget
  against its combined commitments would give

#### Scenario: A deal-level forecast overrun
- GIVEN a deal whose line items are budgeted `50000.00` in total and forecast
  `51800.00` in total
- WHEN the summary is read
- THEN the works forecast variance is `+1800.00`
- AND the deal is reported as forecast to exceed its works budget

#### Scenario: A phase with work still open
- GIVEN a phase in which one line is closed and one is still in progress
- WHEN the phase rollup is read
- THEN its settled variance is absent
- AND its forecast variance is still reported

#### Scenario: Percent invoiced without a budget
- GIVEN a phase whose line items are all budgeted at zero
- WHEN the phase rollup is read
- THEN percent invoiced is absent rather than zero or a division by zero

### Requirement: Expenses not attached to a line item are reported, not dropped

The deal's works figures SHALL account for every expense, including those with
no line item attached. The system SHALL report the invoiced total of unattached
expenses as its own figure, distinct from the line-item totals.

An expense that is not attached to a line item SHALL NOT silently disappear from
the works budget view. A budget table showing `0` while the ledger shows real
spend is a reconciliation failure that no test of the line-item arithmetic alone
would catch, and it is the state every existing deal is in immediately after
this change ships.

The equation that proves it — the attached and unattached invoiced totals adding
up to the deal's committed spend — is specified in this change's
`budget-summary` delta, where both sides of it are fields on one response.

#### Scenario: Expenses exist but no line items do
- GIVEN a deal with `36750.00` of invoiced expenses and no line items
- WHEN the summary is read
- THEN the line-item invoiced total is `0.00`
- AND the unattached invoiced total is `36750.00`

#### Scenario: The works view accounts for unattached spend
- GIVEN a deal with both attached and unattached invoiced expenses
- WHEN the works budget view renders
- THEN the unattached spend is shown in its own row with the action that
  attaches it
- AND it is not omitted, and not folded into a phase it does not belong to

### Requirement: A line item's status is set explicitly and never inferred

A line item SHALL carry a status drawn from a closed set: **not awarded**,
**awarded**, **in progress** and **closed**. The status SHALL be set by the user
and SHALL NOT be inferred from the money figures.

Money does not answer the question the status asks. An award with nothing yet
billed and a job that has stalled look identical in the figures; only a person
knows that a line is finished and that no further invoice is coming. Because the
settled variance and the forecast branch both depend on *closed*, inferring the
status from the amounts would make those figures depend circularly on
themselves.

Closing a line item SHALL be possible while its invoiced amount differs from its
awarded amount, since that difference is exactly the variance the closure
publishes.

#### Scenario: Money moving does not change the status
- GIVEN a line item whose status is awarded
- WHEN an expense is attached to it
- THEN its status is still awarded until a user changes it

#### Scenario: Closing a line publishes its variance
- GIVEN an in-progress line item budgeted `4300.00` with `4980.00` invoiced and
  no settled variance reported
- WHEN it is marked closed
- THEN its settled variance becomes `+680.00`
- AND its forecast becomes `4980.00`

#### Scenario: An unknown status
- WHEN a line item is submitted with a status outside the closed set
- THEN the request is rejected with a validation error

### Requirement: Deleting a line item never deletes an expense

Deleting a line item SHALL detach the expenses attached to it, leaving each
expense stored and readable with its amount, date and identifier unchanged.

A line item is a plan and may be deleted when the plan was wrong. An invoice is
a fact about money that has been billed, and SHALL NOT be destroyed as a side
effect of correcting a plan.

#### Scenario: Deleting a line item with invoices against it
- GIVEN a line item with three expenses attached, one paid
- WHEN the line item is deleted
- THEN all three expenses still exist with their identifiers and amounts
  unchanged
- AND each is reported as unattached

#### Scenario: The deal's invoiced total survives the deletion
- GIVEN a deal whose total invoiced spend is `36750.00`
- WHEN one of its line items is deleted
- THEN the deal's total invoiced spend across attached and unattached expenses
  is still `36750.00`

### Requirement: Every line-item figure is computed server-side in exact decimals

Committed, forecast, both variances, percent invoiced and every phase and deal
rollup SHALL be computed on the server as exact decimals under the project's
existing two-place half-up money rules, and returned ready to display.

No client SHALL derive any of them. In particular a client SHALL NOT compute a
variance as one displayed column minus another, which is the single most
tempting piece of arithmetic in the whole table and the one that would
reintroduce floating-point money to a codebase that types it as a string
precisely to make that impossible.

Money-valued figures SHALL cross the wire as decimal strings and ratios as
numbers, keeping the two shapes distinct.

#### Scenario: Exactness survives the rollup
- GIVEN line items invoiced `0.10` and `0.20`
- WHEN the phase rollup is read
- THEN its invoiced total is exactly `0.30`

#### Scenario: A variance is never subtracted in the browser
- GIVEN the budget table showing budgeted, committed, invoiced and variance
- WHEN it renders
- THEN the variance shown is the value returned by the API
- AND no arithmetic is applied to any money value to produce it

#### Scenario: Ratios and amounts are distinguishable
- GIVEN a phase rollup reporting both a percent invoiced and an invoiced amount
- WHEN the response is read
- THEN the percent is a number and the amount is a decimal string
