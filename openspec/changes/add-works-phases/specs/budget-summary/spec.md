# Delta: Budget summary — the deal's per-phase figures

**Change ID:** `add-works-phases`
**Affects:** `backend/app/src/models/budget.py`,
`backend/app/src/services/budget_service.py`, `backend/tests/`,
`frontend/src/types/budget.ts`

> Assumes **PART 1** (`redesign-flip-desk-skin`) has archived — it authors this
> capability. Assumes **PART 2** (`add-deal-and-property`) has archived — the
> summary is served once per deal.
>
> Reconciled against the sibling deltas on this capability. This delta uses
> **ADDED only**: it introduces per-phase figures and does not restate
> *Every displayed total is computed server-side* (PART 5 modifies that) or
> *Profitability figures are derived from the targets* (PARTs 6, 7 and 8 modify
> that). Nothing here collides with them.
>
> **PART 5** (`add-line-item-budgeting`) adds a `works_budget` object to this
> same response, holding **line-item** rollups for the whole deal. The figures
> here are **phase** rollups and are a different cut of the same expenses; PART 5
> states explicitly that this change's per-phase blocks are untouched by it.
> Neither derives the other.
>
> This delta specifies the **contract** — which per-phase figures the summary
> carries, what they are named and what shape they cross the wire in. What a
> phase *is*, how it is ordered, budgeted and deleted, is specified in this
> change's `phases` delta and is not restated here.

---

## ADDED Requirements

### Requirement: The summary carries the deal's per-phase figures

`BudgetSummary` SHALL report, per phase, the planned, pending and paid amounts,
the committed total, and that phase's share of the deal's committed works spend.

Every one of those figures SHALL be computed server-side in exact decimals and
consumed as returned, in keeping with the rule that no client sums, subtracts,
divides or compares `Money` to produce a figure it shows. Money-valued members
SHALL cross the wire as decimal strings and the share SHALL cross as a number,
matching how `budget_used_percent` is already returned
(`backend/app/src/models/budget.py:56`).

Each phase's figures SHALL carry enough to identify the phase without a second
request — its name, its position and its colour — matching how deals are listed.

The per-category figures SHALL be unchanged by this. Category and phase are
different questions about the same expense — what the money bought, and which
part of the job it was for — and both SHALL remain answerable.

#### Scenario: A phase holds all three statuses
- GIVEN a phase with a paid expense of `100.00`, a pending one of `50.00` and a
  planned one of `25.00`
- WHEN the summary is requested
- THEN that phase reports `paid` `100.00`, `pending` `50.00`, `planned` `25.00`
  and a committed total of `150.00`

#### Scenario: Phase subtotals reconcile with the deal's totals
- GIVEN expenses across several phases, including at least one PLANNED expense
  and at least one expense with no phase
- WHEN the per-phase figures and the unphased figures are summed
- THEN `planned` sums to the deal's `total_planned`, `paid` to its `total_paid`,
  and `planned + pending + paid` to its `total_forecast`

#### Scenario: A phase identifies itself
- GIVEN a rail showing every phase with its spend
- WHEN the summary is requested
- THEN each phase's figures arrive with that phase's name, position and colour
- AND no second request is needed to render the rail

#### Scenario: Categories still report
- GIVEN expenses carrying both a category and a phase
- WHEN the summary is requested
- THEN the per-category figures are exactly what they were before phases existed
- AND the per-phase figures are reported alongside them

#### Scenario: Amounts and shares stay distinguishable on the wire
- GIVEN a phase reporting both a committed total and a share of deal spend
- WHEN the response is read
- THEN the amount is a decimal string and the share is a number

### Requirement: The summary reports each phase's proportion of budget spent

The summary SHALL report, per phase, the proportion of that phase's budgeted
amount taken up by its committed spend. The figure SHALL be returned as a number
rather than as a decimal string, so that no formatter can render it as currency —
matching how `budget_used_percent` is already returned.

The proportion SHALL be absent when the phase has no budgeted amount, never zero,
because a phase that has not been costed has no proportion to report. It SHALL
NOT be capped at 100: a phase that has overspent reports more than its whole
budget, so that the overrun is visible rather than hidden behind a full bar.

The colour applied to that figure SHALL come from the budget thresholds already
documented in the design guide. The system SHALL NOT report a second per-phase
over-budget flag alongside it, which would give two places to disagree about
when a phase is in trouble.

#### Scenario: Half the budget spent
- GIVEN a phase budgeted `10000.00` with `5000.00` of committed spend
- WHEN the summary is requested
- THEN it reports `50` as that phase's proportion of budget spent

#### Scenario: A phase with no budget
- GIVEN a phase with committed spend and no budgeted amount
- WHEN the summary is requested
- THEN the proportion is absent rather than `0` or `100`

#### Scenario: A phase that has overspent
- GIVEN a phase budgeted `4300.00` with `4980.00` of committed spend
- WHEN the summary is requested
- THEN the proportion is reported as greater than `100`, not capped

#### Scenario: A budgeted phase with nothing spent
- GIVEN a phase budgeted `3000.00` with no expenses
- WHEN the summary is requested
- THEN the proportion is `0`, which is a real answer rather than a missing one

### Requirement: Spend with no phase is reported, never hidden

Expenses naming no phase SHALL be reported by the summary as their own group, and
SHALL be included in the deal's totals. They SHALL NOT be folded into any named
phase and SHALL NOT be left out of the figures, so that per-phase subtotals and
the deal's grand total always account for one another.

The group SHALL be absent when every expense has a phase, rather than rendered
as a zero row.

#### Scenario: Unphased spend reconciles
- GIVEN a deal with `30000.00` of phased spend and `2000.00` with no phase
- WHEN the summary is requested
- THEN the unphased group reports `2000.00`
- AND the deal's committed total is `32000.00`, accounting for both

#### Scenario: Everything is phased
- GIVEN a deal where every expense names a phase
- WHEN the summary is requested
- THEN no unphased group is reported

#### Scenario: Expenses recorded before phases existed
- GIVEN a deal whose expenses were all recorded before this change
- WHEN the summary is requested
- THEN every one of them is reported in the unphased group
- AND every total is exactly what it was before this change
