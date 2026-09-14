# Delta: Frontend — the seven-column rubrica table

**Change ID:** `add-line-item-budgeting`
**Affects:** `frontend/src/features/expenses/`, `frontend/src/types/budget.ts`,
`frontend/src/api/`

> Five changes modify this capability. In order: `add-i18n-pt-en` (archived),
> **PART 1** `redesign-flip-desk-skin`, **PART 2** `add-deal-and-property`,
> **PART 3** `add-works-phases`, **PART 4** `add-contractors`, and then this one.
>
> The two MODIFIED blocks below were copied from **PART 1's** delta
> (`openspec/changes/redesign-flip-desk-skin/specs/frontend-expenses/spec.md`),
> which is the latest text for both — PART 1 authored them, PART 2 touched
> neither, and **PART 3 ships no `frontend-expenses` delta at all** (it writes
> `phases` and `frontend-shell` only, moving the sidebar rail from categories to
> phases there). So this change is the sole editor of both requirements, and the
> re-grouping of the budget table from categories to phases lands here.
>
> PART 4 had produced only its proposal, so its intended edit — resolving the
> contractor column to a record — is not folded in; the column reads free text
> here, per `design.md` Decision 8.
>
> `### Requirement: The works budget view groups expenses by category` keeps its
> original name even though it now groups line items by phase, so the MODIFIED
> header matches the text PART 1 archives. Renaming it is a follow-up once this
> has archived.

---

## MODIFIED Requirements

### Requirement: The works budget view groups expenses by category

The budget view SHALL show a row of headline figures, then the deal's **line
items grouped by works phase** — each group carrying a header with its
subtotals and a share, and the whole table closing with a grand total.

Each line item SHALL occupy one row showing seven columns: its name, the
contractor responsible for it, and then its budgeted, committed, invoiced and
variance amounts, and its status. The four money columns SHALL come from the
API as computed values; none is derived in the client.

The view SHALL state what the committed column means — awarded and not yet
invoiced — beside the table, because the distinction between an obligation and
an invoice is the one the table exists to show and it is not self-evident from
the heading alone.

A line item with no contractor, no award or no invoices SHALL render each
absence explicitly rather than as an empty cell that reads as a rendering fault.
A variance that is withheld because the line is still open SHALL render as an
explicit "not yet settled" placeholder, never as a zero.

Invoiced spend that is attached to no line item SHALL be shown in its own row
with the action that attaches it, so that the table reconciles with the ledger
rather than appearing to lose money.

Where the API reports the works budget exceeded, the view SHALL say so in a
callout worded from the returned figures.

#### Scenario: Subtotals agree with the total
- GIVEN line items across several phases, including one not yet awarded
- WHEN the budget view renders
- THEN the group subtotals shown account for the grand total shown

#### Scenario: A filtered view
- GIVEN a phase is selected in the sidebar
- WHEN the budget view renders
- THEN only that group is shown, and its subtotals are unchanged from the
  unfiltered view

#### Scenario: The four money columns are read, not computed
- GIVEN a line item budgeted `7500.00`, committed `2100.00` and invoiced
  `5400.00`
- WHEN its row renders
- THEN each figure is the string returned by the API
- AND the variance cell is the returned variance, not the result of subtracting
  two other cells

#### Scenario: An open line's variance
- GIVEN a line item still in progress, for which the API reports no settled
  variance
- WHEN its row renders
- THEN the variance cell shows an explicit placeholder
- AND it does not show `0`, a dash that reads as zero, or the difference between
  the invoiced and budgeted cells

#### Scenario: A line nobody has been appointed to
- GIVEN a line item with no contractor and no award
- WHEN its row renders
- THEN the contractor and committed cells each render an explicit placeholder
- AND the budgeted cell still shows the planned amount

#### Scenario: Spend with no line item
- GIVEN a deal whose expenses are all unattached
- WHEN the budget view renders
- THEN the unattached total is shown in its own row with the action that
  attaches it
- AND the view does not show an empty table beside a ledger full of spend

#### Scenario: Within budget
- GIVEN the API does not report the works budget exceeded
- WHEN the view renders
- THEN no overrun callout is shown

### Requirement: Money never becomes a JavaScript number

Amounts cross the wire as strings and stay strings for the whole of their life in
the client. No code path SHALL apply `Number()`, `parseFloat`, or arithmetic to a
`Money` value; formatting operates on the string.

This extends to every figure the new views display. Group subtotals, grand
totals, category shares, margin, return on cost and the break-even price SHALL be
**read from the deal's budget summary**, never computed in the client from the
expense list — including when a filter is active, where a client-side sum would
be the obvious shortcut.

It extends with particular force to the budget table's four money columns. A
client SHALL NOT compute a variance as one rendered column minus another, SHALL
NOT compute a committed balance as an award minus an invoiced total, and SHALL
NOT compute a forecast at all. Each arrives from the API already derived.

#### Scenario: Editing an expense preserves its exact amount
- GIVEN an expense of `1234.50`
- WHEN the user opens it for editing and saves without touching the amount
- THEN the `PATCH` body carries `"1234.50"` byte-identical to what was received

#### Scenario: A trailing-zero amount survives display
- GIVEN an amount of `100.00`
- WHEN it is rendered in the table
- THEN it displays with both decimal places, not as `100`

#### Scenario: A subtotal is never summed in the browser
- GIVEN a grouped table showing per-phase subtotals
- WHEN the view renders
- THEN each subtotal is a value returned by the API
- AND no arithmetic is applied to any `Money` value to produce it

#### Scenario: A variance is never subtracted in the browser
- GIVEN a line item row showing budgeted, committed, invoiced and variance
- WHEN the view renders
- THEN the variance is the API's value
- AND changing only the API's variance field changes the rendered cell, proving
  it is not derived from its neighbours

## ADDED Requirements

### Requirement: The overrun callout names the phases driving the overrun

Where the deal is forecast to exceed its works budget, the callout SHALL name
the phases responsible and state each one's figures, rather than reporting only
that a threshold was crossed.

It SHALL be driven by the phases with the largest forecast variance, ordered by
that variance, and SHALL quote the forecast and the budget it is being compared
against so the reader can see the size of the gap rather than being asked to
trust it. Every figure in the callout SHALL come from the API.

The callout SHALL NOT appear when the API reports no forecast overrun, and SHALL
NOT be driven by the deal-wide over-budget flag alone — that flag answers a
different question, about total spend against the deal's planned budget, and can
be false while a phase is badly overrun.

#### Scenario: A forecast overrun with an identifiable driver
- GIVEN a deal forecast at `51800.00` against a works budget of `50000.00`
- AND one phase forecast at `13000.00` against a budget of `12000.00`
- WHEN the budget view renders
- THEN the callout states the overrun and names that phase with both figures

#### Scenario: No forecast overrun
- GIVEN a deal whose forecast does not exceed its works budget
- WHEN the view renders
- THEN no overrun callout is shown, whatever the deal-wide over-budget flag says

#### Scenario: Overrun in a phase while the deal is within its planned budget
- GIVEN a phase forecast above its own budget
- AND a deal whose total forecast is within its planned budget
- WHEN the view renders
- THEN the phase overrun is still surfaced rather than hidden by the deal-level
  flag

#### Scenario: The callout reads in the active language
- GIVEN an overrun and the display language set to `pt-PT`
- WHEN the callout renders
- THEN its wording and its number formatting are Portuguese, with no English
  copy and no untranslated key
