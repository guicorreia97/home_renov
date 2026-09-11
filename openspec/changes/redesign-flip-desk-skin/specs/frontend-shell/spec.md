# Delta: Frontend — The application shell

**Change ID:** `redesign-flip-desk-skin`
**Affects:** `frontend/src/features/shell/`, `frontend/src/App.tsx`,
`frontend/src/features/expenses/ExpensesScreen.tsx`

---

## Purpose

How the app is navigated: the persistent sidebar and the filter rail inside it,
the header carrying the assumptions every figure depends on, and the tab set
that splits the screen into a budget view, a ledger and a profit view.

## ADDED Requirements

### Requirement: The app renders inside a full-height shell

The single centred column SHALL be replaced by a full-height layout: a fixed
258px sidebar, and a main region holding the header, the tab bar and the active
view. The main region scrolls; the sidebar and header do not scroll with it.

The healthcheck gate SHALL be unchanged — the shell renders only once the API
is reachable, so a broken base URL still surfaces as a clear message rather
than as a half-drawn desk.

#### Scenario: The API is unreachable
- GIVEN `GET /healthcheck` fails
- WHEN the app loads
- THEN the existing connection-failure message renders, and no shell is drawn

#### Scenario: Long content
- GIVEN a view taller than the viewport
- WHEN the user scrolls
- THEN the sidebar and header stay in place and only the view scrolls

### Requirement: The sidebar rail filters by category

The sidebar SHALL list every category with committed spend, each showing a
swatch, its name, its committed total and its share — all from
`GET /budget/summary`, none computed in the client.

Selecting a row SHALL set the screen's existing category filter rather than
introduce a second filtering mechanism. A selected row is visibly selected, and
a clear action removes the filter.

The rail SHALL be labelled for the categories it lists. It SHALL NOT be
labelled as works phases, which do not exist yet.

#### Scenario: Selecting a category
- GIVEN spend across several categories
- WHEN the user selects one in the rail
- THEN the active view shows only that category's expenses
- AND the rail row is marked selected

#### Scenario: Clearing the filter
- GIVEN a category is selected
- WHEN the user activates the clear action
- THEN every expense is shown again and no row is marked selected

#### Scenario: Nothing spent yet
- GIVEN no expenses exist
- WHEN the sidebar renders
- THEN it states that no spend has been recorded, rather than rendering an
  empty list

### Requirement: The sidebar reports the budget position

The sidebar footer SHALL show the remaining budget and the percentage used,
coloured by the thresholds in `docs/design-system-guide.md` — success below
80%, warning from 80% to under 90%, danger at 90% or above or whenever the API
reports the budget exceeded.

#### Scenario: No budget set
- GIVEN `planned_budget` is unset
- WHEN the footer renders
- THEN it states that no budget is set and offers the action that sets one,
  rather than showing a zero or a blank

#### Scenario: Over budget
- GIVEN the API reports the budget exceeded
- WHEN the footer renders
- THEN the figure is shown in the danger colour

### Requirement: The header carries the renovation's assumptions

The header SHALL show the purchase price, the planned budget and the target
sale price together, plus a status indicator driven by the API's over-budget
flag, and the two primary actions — recording an expense and editing the
targets — which open the existing modals.

Any assumption that is unset SHALL be shown as unset and offer the action that
sets it. None may render as zero.

#### Scenario: Targets are unset on a fresh install
- GIVEN no budget has been configured
- WHEN the header renders
- THEN each unset assumption reads as unset and points at editing the targets

#### Scenario: Recording an expense from the header
- GIVEN the shell is rendered
- WHEN the user activates the expense action
- THEN the existing expense form modal opens

### Requirement: Three tabs divide the screen

The main region SHALL offer exactly three views — a works budget, an expense
ledger, and a profit projection — with one active at a time. The active tab is
visually distinct and exposed to assistive technology as selected.

The category filter SHALL persist across tab switches, so a category selected
in the rail stays selected when the view changes.

#### Scenario: Switching views
- GIVEN the ledger is active
- WHEN the user selects the profit view
- THEN the profit view renders, the ledger does not, and the profit tab is
  marked selected

#### Scenario: The filter survives a switch
- GIVEN a category is selected in the rail
- WHEN the user switches tabs
- THEN that category is still selected and the new view is filtered by it
