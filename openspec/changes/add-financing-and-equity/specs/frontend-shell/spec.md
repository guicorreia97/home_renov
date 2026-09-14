# Delta: Frontend — The shell states the leverage and the equity

**Change ID:** `add-financing-and-equity`
**Affects:** `frontend/src/features/shell/Sidebar.tsx`,
`frontend/src/features/shell/DeskHeader.tsx`

> Two earlier PARTs author the requirements modified here, and neither has
> archived yet, so both blocks below are copied from those changes' deltas
> rather than from `openspec/specs/frontend-shell/spec.md`, which does not exist
> yet.
>
> "The header carries the renovation's assumptions" is copied from
> `add-deal-and-property` (PART 2), which already modified
> `redesign-flip-desk-skin`'s (PART 1) original — this delta is written against
> PART 2's text and adds the fourth assumption to it. "The sidebar reports the
> budget position" is copied from PART 1, which is still its only author.
>
> Both PART 1 and PART 2 must therefore archive before this delta.

---

## MODIFIED Requirements

### Requirement: The header carries the renovation's assumptions

The header SHALL show the purchase price, the planned budget and the target
sale price together, plus the two primary actions — recording an expense and
editing the targets — which open the existing modals.

Where the deal is financed, the header SHALL also carry the credit: the
principal drawn and the annual rate, both as returned by the API. The rate SHALL
be rendered at the precision it is held at, not rounded to whole or single
decimal percents, since a spread is quoted in thousandths. Where the deal has no
loan, the header SHALL show no credit item at all rather than a zero principal
or a zero rate.

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

#### Scenario: The credit is shown on a financed deal
- GIVEN a deal financed with a principal of `252000.00` at `3.010` percent
- WHEN the header renders
- THEN the principal and the rate are shown together as the deal's credit
- AND the rate reads as `3,010%` in the active locale rather than as `3%`

#### Scenario: An all-cash deal shows no credit
- GIVEN a deal with no loan
- WHEN the header renders
- THEN no credit item appears, and no zero principal or zero rate is rendered in
  its place

### Requirement: The sidebar reports the budget position

The sidebar footer SHALL lead with the equity committed to the deal — the user's
own cash in it — and SHALL state what that figure is composed of, from the
components the API returns. It SHALL NOT state a composition the API did not
report, so that a component this application cannot yet source is absent from
the caption rather than implied by it.

The footer SHALL continue to report the budget position beneath the equity: the
remaining budget and the percentage used, coloured by the thresholds in
`docs/design-system-guide.md` — success below 80%, warning from 80% to under
90%, danger at 90% or above or whenever the API reports the budget exceeded.

Where the API reports equity as absent, the footer SHALL say why — the purchase
price is unset — and offer the action that sets it, rather than showing a zero.

#### Scenario: No budget set
- GIVEN `planned_budget` is unset
- WHEN the footer renders
- THEN it states that no budget is set and offers the action that sets one,
  rather than showing a zero or a blank

#### Scenario: Over budget
- GIVEN the API reports the budget exceeded
- WHEN the footer renders
- THEN the figure is shown in the danger colour

#### Scenario: Equity leads the footer
- GIVEN the API reports equity invested with its components
- WHEN the footer renders
- THEN the equity figure is the footer's headline and its caption names the
  components the API returned
- AND no arithmetic is applied to any returned amount to produce either

#### Scenario: Equity cannot be computed
- GIVEN the deal's purchase price is unset and the API reports equity as absent
- WHEN the footer renders
- THEN it states that the purchase price is needed and offers the action that
  sets it, rather than rendering `0`
