# Delta: Frontend — Expenses within a deal

**Change ID:** `add-deal-and-property`
**Affects:** `frontend/src/api/budget.ts`, `frontend/src/api/expenses.ts`,
`frontend/src/features/expenses/useExpensesData.ts`,
`frontend/src/features/expenses/ExpensesScreen.tsx`

> Written against the post-`redesign-flip-desk-skin` screen (PART 1). Three
> changes modify this capability — `add-i18n-pt-en`, PART 1, and this one — and
> this delta assumes the first two have landed: the message catalogue exists,
> and the screen is already three views inside a shell.

---

## MODIFIED Requirements

### Requirement: The budget can be set and changed from the UI

The three budget figures backing every summary number — `planned_budget`,
`purchase_price` and `target_sale_price` — are editable from the expenses screen.

These figures SHALL belong to the **selected deal**, and SHALL be read and
written through that deal's budget contract rather than through a single
application-wide budget. No figure SHALL be editable while no deal is selected.

#### Scenario: Setting a budget for the first time
- GIVEN a newly created deal whose budget returns all three figures as `null`
- WHEN the user opens the budget settings modal and enters a planned budget of
  `25000.00`
- THEN the update is sent for that deal with `planned_budget` as the string
  `"25000.00"`
- AND the summary strip re-renders with a real `budget_used_percent` rather than
  an empty figure

#### Scenario: Clearing a budget figure
- GIVEN the selected deal's budget has `target_sale_price` set
- WHEN the user empties that field and saves
- THEN the field is sent as `null`, not as `0` or `""`
- AND `projected_profit` returns to being absent rather than reading as a loss

#### Scenario: Rejecting an invalid amount
- GIVEN the budget settings modal is open
- WHEN the user enters `-500` or `12.345`
- THEN the field shows an inline error, the save button does not submit, and no
  request is made

#### Scenario: The update fails
- GIVEN the backend is unreachable
- WHEN the user saves the budget
- THEN an error is shown in the modal, the modal stays open with the user's input
  intact, and the previous summary values remain on screen

#### Scenario: Saving against one deal does not touch another
- GIVEN deals A and B both have budgets set
- WHEN the user edits deal A's planned budget and saves
- THEN deal B's budget is unchanged

### Requirement: Expense data loading reports its state

`useExpensesData` gains explicit `loading` and `error` state per request, covers
the budget, and re-fetches the summary after any mutation so a displayed
percentage can never be stale.

Every one of those requests SHALL be scoped to the selected deal, and the hook
SHALL NOT issue any of them before a deal is selected.

#### Scenario: The list is loading
- GIVEN the expenses screen has just mounted with a deal selected
- WHEN the request is in flight
- THEN a loading state renders rather than an empty table that reads as "no
  expenses"

#### Scenario: The list fails to load
- GIVEN the expense request for the selected deal returns a 500
- WHEN the screen renders
- THEN an error state with a retry action is shown, and the empty-state CTA is
  not shown in its place

#### Scenario: The summary follows a mutation
- GIVEN an expense is created, edited or deleted on the selected deal
- WHEN the mutation succeeds
- THEN that deal's summary is re-fetched and the strip reflects the new totals

#### Scenario: Switching deals reloads everything
- GIVEN deal A's expenses, budget and summary are displayed
- WHEN the user selects deal B
- THEN all three are re-fetched for deal B
- AND deal A's figures are not shown while deal B's are loading

#### Scenario: No deal selected
- GIVEN a fresh install with no deals
- WHEN the screen renders
- THEN no expense, budget or summary request is made

## ADDED Requirements

### Requirement: A late-arriving response for a deselected deal is discarded

Switching deals while requests are in flight SHALL NOT allow a slower response
for the previously selected deal to replace the newly selected deal's data.

#### Scenario: A slow response arrives after a switch
- GIVEN deal A's expense request is still in flight
- WHEN the user selects deal B and deal A's response then arrives
- THEN deal B's expenses remain displayed and deal A's response is discarded
