# Delta: Phases gain a budget basis

**Change ID:** `add-line-item-budgeting`
**Affects:** `backend/app/src/models/`,
`backend/app/src/services/budget_service.py`

> Assumes **PART 3** (`add-works-phases`) has archived — it is this capability's
> author, and it defines what a phase is, how it is ordered and how expenses
> attach to one.
>
> PART 3 deliberately left one question open for this change. Its requirement
> *Each phase carries its own budget, and the gap is reported* says: "In this
> change that figure is recorded against the phase by the user and MAY be unset;
> **a later change MAY derive it from a finer-grained record instead**. Either
> way, the rules below hold, because they are about the relationship between the
> deal's budget and its phases' — not about where a phase's own figure comes
> from."
>
> This delta is that later change, and it answers only that one question: the
> finer-grained record is the line item. Everything PART 3 specifies about the
> relationship between a deal's planned budget and its phases' allocations —
> the total allocated, the signed unallocated figure, over-allocation being
> reported rather than refused — is untouched and continues to hold. This delta
> adds requirements rather than modifying PART 3's, because PART 3's own text
> already accommodates the change.

---

## ADDED Requirements

### Requirement: A phase's budgeted amount is derived from its line items

Once a phase contains line items, its budgeted amount SHALL be the sum of their
budgeted amounts, and that SHALL be the figure reported wherever PART 3 requires
a phase to report one — including in the total allocated across the deal's
phases and in the deal's unallocated figure.

A phase SHALL NOT also carry a separately recorded phase-level budget once it
has line items. Two budget figures for one phase disagree the moment a line item
is added, edited or deleted, and there is no rule saying which of them a variance
should be measured against — which would make every variance in the phase
ambiguous about its own baseline. The line items are the finer-grained record
and the one a user actually maintains, so they are the source of truth.

A phase with **no line items** SHALL report its budgeted amount as **unset**,
never as zero, preserving PART 3's distinction between "not costed yet" and
"costed at nothing". Its other rollups — invoiced, committed and the rest — are
genuine sums over an empty set and SHALL be reported as `0.00`.

The deal's planned budget SHALL remain the authority for what the works are
expected to cost. Deriving a phase's budget from its line items SHALL NOT
overwrite the deal's planned budget or be written back to it.

#### Scenario: A phase with line items
- GIVEN a phase containing line items budgeted `7500.00`, `2800.00` and
  `1700.00`
- WHEN the phase is read
- THEN its budgeted amount is `12000.00`
- AND no second, separately recorded phase budget is reported

#### Scenario: Adding a line item moves the phase budget
- GIVEN a phase budgeted `12000.00` across its line items
- WHEN a line item budgeted `3300.00` is added to it
- THEN the phase's budgeted amount becomes `15300.00` without any separate edit
- AND the deal's unallocated figure falls by `3300.00`

#### Scenario: A phase with no line items yet
- GIVEN a newly created phase containing no line items
- WHEN it is read
- THEN its budgeted amount is unset rather than `0.00`
- AND it contributes nothing to the total allocated across the deal's phases

#### Scenario: The deal's planned budget is not rewritten
- GIVEN a deal with a planned budget of `50000.00`
- WHEN its phases' line items are budgeted to a total of `56000.00`
- THEN the deal's planned budget is still `50000.00`
- AND the unallocated figure is reported as `-6000.00`, exactly as PART 3
  requires for a directly recorded allocation

### Requirement: Physical progress and invoiced progress are reported separately

A phase SHALL report how much of it has been executed and how much of it has
been invoiced as two distinct figures, and SHALL NOT present either as the
other.

Percent executed describes the physical state of the work and is a judgement a
person records. Percent invoiced is `invoiced ÷ budgeted` and is derived from
the money. They routinely disagree — work done and not yet billed, or a deposit
paid before anything has started — and that disagreement is informative. Showing
one under the other's label converts a useful signal into a wrong number.

Both SHALL be returned as numbers rather than money strings, and each SHALL be
absent rather than zero when the input it needs is missing.

#### Scenario: Work done but not yet billed
- GIVEN a phase recorded as 65% executed whose line items are budgeted
  `12000.00` with `8600.00` invoiced
- WHEN the phase is read
- THEN it reports 65 percent executed and approximately 72 percent invoiced as
  two separate figures

#### Scenario: A deposit before any work
- GIVEN a phase recorded as 0% executed with a deposit already invoiced
- WHEN the phase is read
- THEN percent executed is 0 and percent invoiced is greater than zero
- AND neither figure is adjusted to agree with the other

#### Scenario: No budget to measure against
- GIVEN a phase with no line items and therefore no budgeted amount
- WHEN the phase is read
- THEN percent invoiced is absent rather than zero or a division by zero
- AND percent executed is still reported
