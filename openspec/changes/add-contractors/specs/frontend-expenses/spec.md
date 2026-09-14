# Delta: Frontend — The payee becomes a contractor

**Change ID:** `add-contractors`
**Affects:** `frontend/src/api/expenses.ts`,
`frontend/src/features/expenses/ExpenseForm.tsx`,
`frontend/src/features/expenses/ExpenseRow.tsx`,
`frontend/src/features/expenses/useExpensesData.ts`,
`frontend/src/features/expenses/validation.ts`, `frontend/src/i18n/`

> Written against the post-`add-deal-and-property` screen (PART 2). Four changes
> modify this capability before this one — `add-i18n-pt-en`, PART 1 and PART 2 —
> and this delta assumes all three have archived. Two of the requirements below
> are not in `openspec/specs/frontend-expenses/spec.md` yet: **Expense data
> loading reports its state** is copied from PART 2's delta, which last modified
> it, and **The ledger shows how each expense was settled and evidenced** is
> copied from PART 1's delta, which authored it.

---

## MODIFIED Requirements

### Requirement: Expense data loading reports its state

`useExpensesData` gains explicit `loading` and `error` state per request, covers
the budget, and re-fetches the summary after any mutation so a displayed
percentage can never be stale.

Every one of those requests SHALL be scoped to the selected deal, and the hook
SHALL NOT issue any of them before a deal is selected.

The hook SHALL also load the contractors the screen needs to resolve an
expense's attribution to a name. That list is not deal-scoped, so it SHALL NOT
be re-fetched on a deal switch; a failure to load it SHALL NOT blank the ledger,
which still has every expense it needs apart from one column's label.

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

#### Scenario: Contractors are not re-fetched per deal
- GIVEN the contractor list has loaded and deal A is selected
- WHEN the user selects deal B
- THEN the expenses, budget and summary are re-fetched and the contractor list
  is not

#### Scenario: The contractor list fails to load
- GIVEN the expense list loads and the contractor request returns a 500
- WHEN the ledger renders
- THEN the expenses are still shown, with the contractor column reporting that
  the name is unavailable rather than the whole table failing

### Requirement: The ledger shows how each expense was settled and evidenced

The ledger view SHALL show, per expense: the date incurred, the description,
how it was paid, the contractor it was paid to, its document reference and its
category, with the amount right-aligned and tabular.

The contractor SHALL be shown as the name on the referenced record, resolved
from the contractor list rather than from any text stored on the expense. Two
expenses paid to one contractor SHALL therefore read identically, which is the
observable point of the change.

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

#### Scenario: One contractor reads identically on every row
- GIVEN three expenses attributed to the same contractor
- WHEN the ledger renders
- THEN all three show that contractor's name, spelled the same way

#### Scenario: A renamed contractor updates every row
- GIVEN expenses attributed to a contractor whose name is then corrected
- WHEN the ledger is re-read
- THEN every one of those rows shows the corrected name, with no expense edited

## ADDED Requirements

### Requirement: The contractor is chosen from a list, not typed

The expense form SHALL offer the contractor as a selection from the contractors
the application holds. It SHALL NOT accept a typed name as the attribution,
because free text is what this change removes.

The form SHALL offer an action that creates a contractor without leaving the
expense being recorded: a party is often first met at the moment its invoice is
entered, and forcing the user elsewhere to create it would lose the half-filled
form. A contractor created that way SHALL become the form's selection.

The field SHALL be required, and submitting with no contractor selected SHALL
show an inline message and make no request, consistent with the form's other
required fields.

Every string this introduces — the field label, the create action, the empty
state and the validation message — SHALL come from the message catalogue in both
supported languages, and SHALL fit the modal's fixed width in Portuguese.

#### Scenario: Selecting an existing contractor
- GIVEN contractors exist
- WHEN the user opens the expense form and chooses one
- THEN the submitted request carries that contractor's identifier, not its name

#### Scenario: Creating a contractor from the form
- GIVEN the expense form is open and half filled in
- WHEN the user creates a new contractor through the form's action
- THEN the contractor is created, becomes the selection, and the values already
  entered are still in the form

#### Scenario: No contractor selected
- GIVEN the expense form with every other field valid
- WHEN the user submits without choosing a contractor
- THEN an inline message is shown and no request is made

#### Scenario: No contractors exist yet
- GIVEN a store with no contractors
- WHEN the expense form opens
- THEN it states that none exist and offers the create action, rather than
  showing an empty selection that appears broken

#### Scenario: The field in Portuguese
- GIVEN the display language is `pt-PT`
- WHEN the expense form renders
- THEN the contractor label, create action and validation message read in
  Portuguese and fit the modal without clipping

### Requirement: The budget view attributes each line to a contractor

The works budget view SHALL show, against each expense, the contractor it was
paid to, resolved from the contractor record rather than from text on the
expense.

Where the API reports spend per contractor for the selected deal, the view SHALL
render those figures as returned. It SHALL NOT sum an expense list in the
browser to produce a contractor's total, under the existing rule that no `Money`
value is arithmetic in the client.

#### Scenario: The contractor column is populated
- GIVEN expenses attributed to two contractors
- WHEN the budget view renders
- THEN each row shows the name of the contractor it is attributed to

#### Scenario: A per-contractor total is never summed in the browser
- GIVEN a view showing what a contractor has been paid on this deal
- WHEN it renders
- THEN the figure is one the API returned
- AND no arithmetic is applied to any `Money` value to produce it
