# Delta: Frontend — The shell gains destinations

**Change ID:** `add-deal-and-property`
**Affects:** `frontend/src/features/shell/Sidebar.tsx`,
`frontend/src/features/shell/DeskHeader.tsx`, `frontend/src/App.tsx`

> Written against the post-`redesign-flip-desk-skin` shell (PART 1), which
> creates this capability. PART 1 deliberately shipped no nav list, because one
> screen existed and there were no destinations to offer. This change creates the
> destinations, so that decision is reversed here rather than in PART 1.

---

## MODIFIED Requirements

### Requirement: The header carries the renovation's assumptions

The header SHALL show the purchase price, the planned budget and the target
sale price together, plus the two primary actions — recording an expense and
editing the targets — which open the existing modals.

The header SHALL also identify the deal being looked at: the property's address
and its characteristics, and a status indicator carrying the deal's status and,
where the deal has a works window, its progress through that window. The
over-budget flag SHALL remain visible, but SHALL NOT be the only thing the status
indicator conveys.

Any assumption that is unset SHALL be shown as unset and offer the action that
sets it. None may render as zero.

#### Scenario: Targets are unset on a fresh deal
- GIVEN a newly created deal with no budget configured
- WHEN the header renders
- THEN each unset assumption reads as unset and points at editing the targets

#### Scenario: Recording an expense from the header
- GIVEN the shell is rendered with a deal selected
- WHEN the user activates the expense action
- THEN the existing expense form modal opens, recording against that deal

#### Scenario: The header identifies the deal
- GIVEN a deal whose property has an address, area, typology and year built
- WHEN the header renders
- THEN the address and those characteristics are shown

#### Scenario: Works progress is shown
- GIVEN a deal in works, in month five of a planned eight
- WHEN the header renders
- THEN the status indicator states the deal's status and its progress through
  the works window

#### Scenario: A deal with no works window
- GIVEN a deal being evaluated, with no works window
- WHEN the header renders
- THEN the status is shown without a month-of-window figure, rather than with a
  zero or a first month

## ADDED Requirements

### Requirement: The sidebar navigates between deals

The sidebar SHALL offer the deals the application holds as destinations, showing
for each enough to tell them apart — the property address and the deal's status —
and SHALL mark which one is currently selected.

Selecting a deal SHALL change what the whole shell displays. The category filter
SHALL NOT survive the switch: a category selected against one deal's spend is
meaningless against another's.

The sidebar SHALL offer the action that creates a new deal.

#### Scenario: Switching deals from the sidebar
- GIVEN several deals exist and one is selected
- WHEN the user selects a different deal
- THEN the header, the category rail and the active view all show the newly
  selected deal
- AND the newly selected deal is marked as selected

#### Scenario: The filter does not survive a switch
- GIVEN a category is selected in the rail
- WHEN the user switches to another deal
- THEN no category filter is active and the full ledger for the new deal is shown

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
