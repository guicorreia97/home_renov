# Delta: Frontend — Expenses & Budget

**Change ID:** `complete-expenses-ui`
**Affects:** `frontend/src/features/expenses/`, `frontend/src/components/`,
`frontend/package.json`, `frontend/vite.config.ts`, `docs/testing-guide.md`

---

## ADDED

### Requirement: The budget can be set and changed from the UI

The three budget figures backing every summary number — `planned_budget`,
`purchase_price` and `target_sale_price` — are editable from the expenses screen
via the existing `GET|PUT /budget` contract. No new endpoint is introduced.

#### Scenario: Setting a budget for the first time
- GIVEN a fresh install where `GET /budget` returns all three figures as `null`
- WHEN the user opens the budget settings modal and enters a planned budget of
  `25000.00`
- THEN `PUT /budget` is called with `planned_budget` as the string `"25000.00"`
- AND the summary strip re-renders with a real `budget_used_percent` rather than
  an empty figure

#### Scenario: Clearing a budget figure
- GIVEN a budget with `target_sale_price` set
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

---

### Requirement: An empty budget states its emptiness

A summary strip with no budget set explains that and offers the way to fix it,
rather than rendering blank figures that read as zero.

#### Scenario: No budget configured
- GIVEN `GET /budget` returns all figures as `null`
- WHEN the expenses screen renders
- THEN the strip shows an explicit "no budget set" state with the settings
  trigger, and does not display `0%` or `£0.00`

---

### Requirement: Money never becomes a JavaScript number

Amounts cross the wire as strings and stay strings for the whole of their life in
the client. No code path applies `Number()`, `parseFloat`, or arithmetic to a
`Money` value; formatting operates on the string.

#### Scenario: Editing an expense preserves its exact amount
- GIVEN an expense of `1234.50`
- WHEN the user opens it for editing and saves without touching the amount
- THEN the `PATCH` body carries `"1234.50"` byte-identical to what was received

#### Scenario: A trailing-zero amount survives display
- GIVEN an amount of `100.00`
- WHEN it is rendered in the table
- THEN it displays with both decimal places, not as `100`

---

### Requirement: The frontend has an automated test suite

`frontend/` gains Vitest with React Testing Library and happy-dom, run by `npm
test`. happy-dom rather than jsdom because jsdom does not implement
`HTMLDialogElement.showModal`, which `Modal` depends on.
The API client is mocked at the `fetch` boundary — the one place `fetch` is
called — so tests never hit a live backend. The convention is documented in
`docs/testing-guide.md`.

#### Scenario: Running the suite
- GIVEN a clean checkout with dependencies installed
- WHEN `npm test` is run from `frontend/`
- THEN the suite runs against happy-dom and passes without a backend running

#### Scenario: Coverage of the feature
- GIVEN the expenses feature and the five shared components
- WHEN the suite runs
- THEN every file in `frontend/src/features/expenses/` and each of `Button`,
  `TextField`, `SelectField`, `Modal` and `Badge` is exercised by at least one
  behavioural test

---

### Requirement: A modal stays open until the user dismisses it

Dismissal is driven by the `cancel` event, never `close`. `close()` queues its
event instead of dispatching it, so under StrictMode's mount/cleanup/remount the
queued event arrives after the listener is re-attached and the modal dismisses
itself on open. Focus trapping, focus restoration and modal semantics come from
the native `<dialog>` and are not reimplemented.

#### Scenario: Opening the expense form
- GIVEN the expenses screen in a StrictMode build
- WHEN the user clicks "Add expense"
- THEN the modal opens and remains open, and the form is interactive

#### Scenario: Keyboard dismissal
- GIVEN the expense form modal is open
- WHEN the user presses `Escape`
- THEN `onClose` fires exactly once, the modal unmounts, and focus returns to the
  control that opened it

#### Scenario: The dialog is named
- GIVEN any modal is open
- WHEN its accessible name is queried
- THEN it is the modal's visible title, via `aria-labelledby`

---

## MODIFIED

### Requirement: Expense data loading reports its state

`useExpensesData` currently fetches and re-fetches. It gains explicit `loading`
and `error` state per request, and extends to cover the budget, re-fetching the
summary after any mutation so a displayed percentage can never be stale.

#### Scenario: The list is loading
- GIVEN the expenses screen has just mounted
- WHEN the request is in flight
- THEN a loading state renders rather than an empty table that reads as "no
  expenses"

#### Scenario: The list fails to load
- GIVEN `GET /expenses` returns a 500
- WHEN the screen renders
- THEN an error state with a retry action is shown, and the empty-state CTA is
  not shown in its place

#### Scenario: The summary follows a mutation
- GIVEN an expense is created, edited or deleted
- WHEN the mutation succeeds
- THEN `GET /budget/summary` is re-fetched and the strip reflects the new totals

---

### Requirement: The untracked expenses UI becomes reviewed, committed code

The 12 files under `frontend/src/features/expenses/` and the five shared
components ship as reviewed and tested code, in conventional commits, after a
`reviewer` pass against `AGENTS.md` and the design system.

#### Scenario: A design-system violation is found
- GIVEN the reviewer finds a hard-coded color absent from
  `docs/design-system-guide.md`
- WHEN the change is prepared for commit
- THEN the value is replaced with an existing token, or the token is added to the
  guide first — never invented inline

---

## REMOVED

(None — no existing requirement is retired. Every backend route, model and test
stands unchanged.)
