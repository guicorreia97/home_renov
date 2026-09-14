# Delta: Frontend — Expenses grouped by works phase

**Change ID:** `add-works-phases`
**Affects:** `frontend/src/features/expenses/ExpensesScreen.tsx`,
`ExpenseTable.tsx`, `ExpenseRow.tsx`, `ExpenseFilters.tsx`, `ExpenseForm.tsx`,
`frontend/src/features/expenses/formTypes.ts`, `frontend/src/i18n/`

> Written against the post-`add-deal-and-property` screen (PART 2), and assumes
> `add-i18n-pt-en` (archived), **PART 1** and **PART 2** have archived. Both
> MODIFIED blocks below are copied from **PART 1's** delta
> (`openspec/changes/redesign-flip-desk-skin/specs/frontend-expenses/spec.md`),
> which authored them; PART 2 did not touch either.
>
> `### Requirement: The works budget view groups expenses by category` keeps its
> original name even though it now groups by phase. **PART 5**
> (`add-line-item-budgeting`) pins that exact header in its own delta so the two
> edits reconcile at archive rather than forking into two requirements; renaming
> it is a follow-up once both have archived. See `design.md` Decision 10.
>
> **The ledger requirement is also modified by PART 4** (`add-contractors`),
> independently and against the same PART 1 text: PART 4 turns the payee column
> into a contractor record, this change adds the phase column. The two edits do
> not overlap, but a MODIFIED block replaces the whole requirement, so whichever
> of the two archives second MUST re-copy the then-current block before
> archiving. Listed as a task in both changes.

---

## MODIFIED Requirements

### Requirement: The works budget view groups expenses by category

The budget view SHALL show a row of headline figures, then expenses grouped by
**works phase** — each group carrying a header with its subtotals, its share and
its budget, and the whole table closing with a grand total.

Grouping by phase rather than by category is the point of the view: a renovation
that is over budget is over budget in a phase, and the category an expense
carries says what the money bought, not which part of the job it was for.

Each group header SHALL show that phase's budgeted amount beside its spend, and
the proportion of the budget spent, as returned by the API. A phase with no
budget SHALL say so rather than show a proportion of nothing.

Expenses that name no phase SHALL be shown in their own group, clearly not a
phase, positioned after the phases and included in the grand total. The view
SHALL offer, from that group, the action that assigns a phase to them.

Each expense SHALL show its amount in the column matching its status: planned,
committed or paid. An expense carries one amount and one status, so it appears
in exactly one of the three.

Where the API reports the budget exceeded, the view SHALL say so in a callout
worded from the returned figures.

#### Scenario: Subtotals agree with the total
- GIVEN expenses across several phases, including a planned one and one with no
  phase
- WHEN the budget view renders
- THEN the group subtotals shown account for the grand total shown

#### Scenario: A filtered view
- GIVEN a phase is selected in the sidebar
- WHEN the budget view renders
- THEN only that group is shown, and its subtotals are unchanged from the
  unfiltered view

#### Scenario: Within budget
- GIVEN the API does not report the budget exceeded
- WHEN the view renders
- THEN no overrun callout is shown

#### Scenario: A phase over its own budget
- GIVEN a phase budgeted `4300.00` with `4980.00` of committed spend
- WHEN its group header renders
- THEN the proportion of budget spent is shown as greater than 100 and coloured
  as over budget
- AND the figure is the API's, not a division of two rendered cells

#### Scenario: Spend with no phase
- GIVEN a deal whose expenses include some that name no phase
- WHEN the budget view renders
- THEN those expenses appear in their own group after the phases, with the
  action that assigns a phase
- AND the group is visibly not one of the works phases

### Requirement: The ledger shows how each expense was settled and evidenced

The ledger view SHALL show, per expense: the date incurred, the description,
how it was paid, the payee, its document reference, its works phase and its
category, with the amount right-aligned and tabular.

The phase SHALL be shown as its name, accompanied by its colour rather than
carried by the colour alone, so the ledger cross-references the rail without
depending on colour perception to do it.

An expense with no document reference SHALL render the absence explicitly, not
as an empty cell that reads as a rendering fault. An expense with no phase SHALL
do the same, and SHALL offer no phase name it does not have.

The ledger SHALL keep the existing loading, error, empty and
filtered-empty states and the existing row actions for editing and deleting.

#### Scenario: An expense without an invoice reference
- GIVEN an expense whose `invoice_reference` is unset
- WHEN the ledger renders
- THEN that cell shows an explicit placeholder

#### Scenario: The filter matches nothing
- GIVEN a filter matching no expense
- WHEN the ledger renders
- THEN the filtered-empty state is shown, distinct from the never-added-one
  state, and the row actions are not rendered

#### Scenario: An expense with no phase
- GIVEN an expense that names no phase
- WHEN the ledger renders
- THEN its phase cell shows an explicit placeholder
- AND the row is still shown, with its amount in the total

#### Scenario: The phase is not carried by colour alone
- GIVEN expenses across several phases
- WHEN the ledger renders
- THEN each row states its phase's name
- AND removing colour from the view still tells the rows apart

## ADDED Requirements

### Requirement: Recording an expense names the works phase it belongs to

The expense form SHALL offer the works phase as a selection from the selected
deal's phases, in the user's order, with an explicit choice meaning no phase.
The field SHALL NOT be required: an expense can be recorded before the user has
decided which phase it belongs to.

The form SHALL NOT preselect a phase, and SHALL NOT choose one from the
expense's category, room or description. A phase the user did not choose would
misstate which part of the job the money went to, which is the mistake this
whole change exists to make impossible.

Where the deal has no phases, the field SHALL say so and offer the action that
creates one, rather than rendering an empty selection that appears broken.

Every string this introduces SHALL come from the message catalogue in both
supported languages and SHALL fit the modal's fixed width in Portuguese. The
phase's own name SHALL be rendered as the user typed it, in both languages,
because it is their content and not a catalogue string.

#### Scenario: Recording an expense against a phase
- GIVEN a deal with phases
- WHEN the user opens the expense form and chooses one
- THEN the submitted request carries that phase's identifier

#### Scenario: Recording an expense without a phase
- GIVEN the expense form with every other field valid
- WHEN the user submits without choosing a phase
- THEN the expense is created, and no phase is inferred for it

#### Scenario: No phases exist yet
- GIVEN a deal for which no phase has been created
- WHEN the expense form opens
- THEN it states that none exist and offers the create action
- AND the expense can still be recorded without one

#### Scenario: The field in Portuguese
- GIVEN the display language is `pt-PT`
- WHEN the expense form renders
- THEN the phase label and its no-phase option read in Portuguese and fit the
  modal without clipping
- AND each phase name reads exactly as the user typed it

### Requirement: Spend already recorded can be assigned to a phase

The screen SHALL offer a way to give a phase to expenses that already have none,
both from an expense's own edit form and from the unphased group in the budget
view. This is the only path by which existing spend becomes phased: nothing
assigns a phase automatically.

Assigning a phase SHALL update the expense and nothing else — no amount, no
date, no status and no category changes as a side effect — and the view's
figures SHALL be re-read from the API afterwards rather than adjusted in place.

#### Scenario: Assigning a phase from the ledger
- GIVEN an expense with no phase
- WHEN the user edits it and chooses a phase
- THEN the expense is updated with that phase
- AND its amount, date, status and category are unchanged

#### Scenario: The figures follow the assignment
- GIVEN the budget view showing an unphased group
- WHEN an expense from it is assigned to a phase
- THEN the per-phase subtotals and the unphased group are re-read from the API
- AND no subtotal is adjusted by arithmetic in the client

#### Scenario: Nothing is assigned without the user
- GIVEN a deal with phases and expenses that name none
- WHEN the screen renders and is left alone
- THEN no expense acquires a phase
