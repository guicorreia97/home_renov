# Delta: Frontend — The rail becomes the works phases

**Change ID:** `add-works-phases`
**Affects:** `frontend/src/features/shell/Sidebar.tsx`,
`frontend/src/features/shell/TabNav.tsx`,
`frontend/src/features/expenses/ExpensesScreen.tsx`

> Written against the post-`add-deal-and-property` shell (PART 2), and assumes
> **PARTs 1 and 2 have archived**. Neither requirement below is in
> `openspec/specs/frontend-shell/spec.md` yet: that capability is authored by
> PART 1 (`redesign-flip-desk-skin`), and **The sidebar navigates between deals**
> is copied from PART 2's delta, which added it.
>
> PART 1 built the rail out of expense categories and wrote the constraint that
> it "SHALL NOT be labelled as works phases, which do not exist yet". This change
> is what makes that label legitimate, so that requirement is discharged here —
> removed and replaced rather than edited, because its subject changes entirely
> and every one of its scenarios is about categories. See `design.md` Decision 10.
>
> Because the `frontend-shell` main spec does not exist yet, `openspec validate
> --strict` reports an INFO that archive would refuse this delta. That is the
> expected and correct signal for this sequencing — see `design.md` Risks.

---

## MODIFIED Requirements

### Requirement: Three tabs divide the screen

The main region SHALL offer exactly three views — a works budget, an expense
ledger, and a profit projection — with one active at a time. The active tab is
visually distinct and exposed to assistive technology as selected.

The phase filter SHALL persist across tab switches, so a phase selected in the
rail stays selected when the view changes. Moving between the budget view and the
ledger while looking at one phase is the ordinary way of asking "what was
budgeted for this, and what has actually been paid against it" — losing the
filter in between would break that question in half.

#### Scenario: Switching views
- GIVEN the ledger is active
- WHEN the user selects the profit view
- THEN the profit view renders, the ledger does not, and the profit tab is
  marked selected

#### Scenario: The filter survives a switch
- GIVEN a phase is selected in the rail
- WHEN the user switches tabs
- THEN that phase is still selected and the new view is filtered by it

### Requirement: The sidebar navigates between deals

The sidebar SHALL offer the deals the application holds as destinations, showing
for each enough to tell them apart — the property address and the deal's status —
and SHALL mark which one is currently selected.

Selecting a deal SHALL change what the whole shell displays. The phase filter
SHALL NOT survive the switch: a phase belongs to exactly one deal, so a phase
selected against one deal's works does not exist against another's, and carrying
the selection across would filter by a phase the new deal does not have.

The sidebar SHALL offer the action that creates a new deal.

#### Scenario: Switching deals from the sidebar
- GIVEN several deals exist and one is selected
- WHEN the user selects a different deal
- THEN the header, the phase rail and the active view all show the newly
  selected deal
- AND the newly selected deal is marked as selected

#### Scenario: The filter does not survive a switch
- GIVEN a phase is selected in the rail
- WHEN the user switches to another deal
- THEN no phase filter is active and the full ledger for the new deal is shown
- AND the rail lists the new deal's phases, not the previous deal's

#### Scenario: No deals yet
- GIVEN a fresh install with no deals
- WHEN the shell renders
- THEN the sidebar states that no deal exists and offers the create action,
  rather than rendering an empty destination list

#### Scenario: The pipeline count is real
- GIVEN four deals are being evaluated
- WHEN the sidebar renders
- THEN any count it shows against that group is four, taken from the deals the
  API returned and not from a placeholder

## REMOVED Requirements

### Requirement: The sidebar rail filters by category

**Reason**: The rail was built from expense categories because works phases did
not exist, and the requirement said so in its own text — it "SHALL be labelled
for the categories it lists" and "SHALL NOT be labelled as works phases, which do
not exist yet". Phases exist as of this change, so the constraint that made the
category rail a stand-in is discharged. Every scenario in the requirement is
about selecting and clearing a category, so it is replaced rather than edited.

**Migration**: Replaced by **The sidebar rail filters by works phase** below,
which keeps the rail's shape — swatch, name, figures, a selected row and a clear
action — and changes what it lists and what it filters. The category filter is
not lost: it moves to the ledger's own filter row, where a category select
already exists, so both questions the data answers stay answerable. See
`design.md` Decision 9.

## ADDED Requirements

### Requirement: The sidebar rail filters by works phase

The sidebar SHALL list the selected deal's works phases in the user's order, each
showing its colour, its name, its spend against its budget, and the proportion of
that budget spent — all from the API, none computed in the client.

The rail SHALL be labelled as the works phases it lists. Where spend exists that
names no phase, the rail SHALL show it as a final entry that is visibly not one
of the phases, so that money is never invisible in the one place the user looks
to find it.

Selecting a row SHALL filter the active view to that phase; a selected row is
visibly selected, and a clear action removes the filter. Selecting the unphased
entry SHALL filter to the spend that names no phase.

A phase's colour SHALL NOT be the only thing that distinguishes it: the name is
shown beside it wherever the colour is. The proportion of budget spent SHALL be
coloured by the thresholds in `docs/design-system-guide.md`, the same thresholds
the sidebar footer already uses, so that two figures on one screen never disagree
about when spending is in trouble.

#### Scenario: Selecting a phase
- GIVEN a deal with spend across several phases
- WHEN the user selects one in the rail
- THEN the active view shows only that phase's expenses
- AND the rail row is marked selected

#### Scenario: Clearing the filter
- GIVEN a phase is selected
- WHEN the user activates the clear action
- THEN every expense is shown again and no row is marked selected

#### Scenario: The rail is ordered by the works sequence
- GIVEN phases the user has ordered demolition, services, finishes
- WHEN the rail renders
- THEN they appear in that order, not alphabetically and not by how much was
  spent

#### Scenario: Spend with no phase
- GIVEN a deal with expenses that name no phase
- WHEN the rail renders
- THEN an entry for unphased spend is shown, distinct from the phases
- AND selecting it filters the view to exactly those expenses

#### Scenario: A phase with no budget
- GIVEN a phase with spend and no budgeted amount
- WHEN its row renders
- THEN it shows its spend and states that it has no budget, rather than showing
  a percentage against a zero budget

#### Scenario: No phases yet
- GIVEN a deal for which no phase has been created
- WHEN the sidebar renders
- THEN it states that no phase exists and offers the action that creates one,
  rather than rendering an empty list or a set of phases nobody chose

### Requirement: Phases are created, ordered and removed where they are listed

The shell SHALL offer creating a phase, renaming it, changing its colour and
budget, reordering the sequence and deleting a phase, from the place the phases
are listed.

Reordering SHALL be operable from the keyboard, not by pointer dragging alone,
so that the order — which carries meaning, since it is the sequence of the work —
is not editable only by users who can drag.

The colour SHALL be chosen from the closed palette in the design guide. The
interface SHALL NOT offer a free colour picker, because a colour outside that
palette bypasses the design system and can collide with the colours that carry
status.

Deleting a phase SHALL state how many expenses the deletion would release before
it happens, and SHALL make clear that those expenses are kept. A deletion that
would release spend SHALL require confirmation.

#### Scenario: Creating a phase
- GIVEN a deal with no phases
- WHEN the user creates one from the sidebar
- THEN it appears in the rail and becomes available to filter by

#### Scenario: Reordering from the keyboard
- GIVEN a deal with three phases and no pointer in use
- WHEN the user moves the last phase up using the keyboard
- THEN the order changes and the new order is announced to assistive technology

#### Scenario: Deleting a phase that has spend
- GIVEN a phase with four expenses against it
- WHEN the user deletes it
- THEN the confirmation states that four expenses will be kept and become
  unphased
- AND after confirming, those four appear under the rail's unphased entry

#### Scenario: The colour comes from the palette
- GIVEN the phase editor is open
- WHEN the user changes a phase's colour
- THEN the choices are the palette's colours
- AND no arbitrary colour value can be entered
