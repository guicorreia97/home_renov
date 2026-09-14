# Delta: Frontend — Expenses inside the shell

**Change ID:** `redesign-flip-desk-skin`
**Affects:** `frontend/src/features/expenses/ExpensesScreen.tsx`,
`ExpenseTable.tsx`, `ExpenseRow.tsx`, `BudgetSummaryStrip.tsx`

> Written against the post-`add-i18n-pt-en` screen. Both changes modify this
> capability; this one assumes the message catalogue exists and that no
> user-visible string is a literal in a component.

---

## MODIFIED Requirements

### Requirement: Money never becomes a JavaScript number

Amounts SHALL cross the wire as strings and stay strings for the whole of their
life in the client. No code path SHALL apply `Number()`, `parseFloat`, or
arithmetic to a `Money` value; formatting operates on the string.

This extends to every figure the new views display. Group subtotals, grand
totals, category shares, margin, return on cost and the break-even price are
**read from `GET /budget/summary`**, never computed in the client from the
expense list — including when a filter is active, where a client-side sum would
be the obvious shortcut.

#### Scenario: Editing an expense preserves its exact amount
- GIVEN an expense of `1234.50`
- WHEN the user opens it for editing and saves without touching the amount
- THEN the `PATCH` body carries `"1234.50"` byte-identical to what was received

#### Scenario: A trailing-zero amount survives display
- GIVEN an amount of `100.00`
- WHEN it is rendered in the table
- THEN it displays with both decimal places, not as `100`

#### Scenario: A subtotal is never summed in the browser
- GIVEN a grouped table showing per-category subtotals
- WHEN the view renders
- THEN each subtotal is a value returned by the API
- AND no arithmetic is applied to any `Money` value to produce it

## ADDED Requirements

### Requirement: The works budget view groups expenses by category

The budget view SHALL show a row of headline figures, then expenses grouped by
category — each group carrying a header with its subtotals and a share, and the
whole table closing with a grand total.

Each expense SHALL show its amount in the column matching its status: planned,
committed or paid. An expense carries one amount and one status, so it appears
in exactly one of the three.

Where the API reports the budget exceeded, the view SHALL say so in a callout
worded from the returned figures.

#### Scenario: Subtotals agree with the total
- GIVEN expenses across several categories, including a planned one
- WHEN the budget view renders
- THEN the group subtotals shown account for the grand total shown

#### Scenario: A filtered view
- GIVEN a category is selected in the sidebar
- WHEN the budget view renders
- THEN only that group is shown, and its subtotals are unchanged from the
  unfiltered view

#### Scenario: Within budget
- GIVEN the API does not report the budget exceeded
- WHEN the view renders
- THEN no overrun callout is shown

### Requirement: The ledger shows how each expense was settled and evidenced

The ledger view SHALL show, per expense: the date incurred, the description,
how it was paid, the payee, its document reference and its category, with the
amount right-aligned and tabular.

An expense with no document reference SHALL render the absence explicitly, not
as an empty cell that reads as a rendering fault.

The ledger SHALL keep the existing loading, error, empty and
filtered-empty states and the existing row actions for editing and deleting.

#### Scenario: An expense without an invoice reference
- GIVEN an expense whose `invoice_reference` is unset
- WHEN the ledger renders
- THEN that cell shows an explicit placeholder

#### Scenario: The filter matches nothing
- GIVEN a category filter matching no expense
- WHEN the ledger renders
- THEN the filtered-empty state is shown, distinct from the never-added-one
  state, and the row actions are not rendered

### Requirement: The profit view states the deal's arithmetic

The profit view SHALL show headline figures, then the calculation as a
sequence — target sale price, less purchase price, less forecast works cost,
giving the projected profit — followed by the margin, the return on cost and
the break-even sale price.

Every figure SHALL come from the API. The view SHALL NOT show a profit
projection derived from an incomplete cost base without the reader being able
to see which costs it contains.

#### Scenario: No target sale price
- GIVEN `target_sale_price` is unset
- WHEN the profit view renders
- THEN it states that no target sale price is set and offers the action that
  sets one
- AND no profit, margin or return figure is shown, in place of a zero

#### Scenario: A negative projection
- GIVEN the projected profit is negative
- WHEN the view renders
- THEN it is shown in the danger colour with its sign, never as an absolute
  value
