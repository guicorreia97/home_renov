# Delta: Works phases

**Change ID:** `add-works-phases`
**Affects:** `backend/app/src/models/`, `backend/app/src/repositories/`,
`backend/app/src/services/`, `backend/app/api/endpoints/`, `frontend/src/api/`

> Written against the post-`add-deal-and-property` app (PART 2), which creates
> the `deal_id` spine a phase hangs off and the per-deal directory a phase is
> stored in, and against the post-`redesign-flip-desk-skin` summary (PART 1),
> whose per-category status breakdown this mirrors one level up. Both must
> archive before this delta does.

---

## Purpose

What a works phase is: the stage of the renovation a euro belongs to, as
distinct from the category of thing it bought. Covers how phases are ordered,
how an expense attaches to one, how spend and budget roll up to a phase, and
what happens to spend that names no phase at all.

## ADDED Requirements

### Requirement: A works phase is a named stage of one deal's renovation

The system SHALL model a **works phase** as one stage of the works on exactly
one deal — demolition, services, carpentry and so on. A phase SHALL carry a
name the user writes, a status drawn from a closed set covering not started, in
progress and complete, a position in the deal's sequence, and a colour drawn
from a closed palette defined in the design guide. It MAY carry a planned
budget and a planned start and end date; each of those MAY be unset.

The phase name SHALL be treated as user content. It SHALL NOT appear in any log
line — identifiers and counts may be logged, the name may not — and it SHALL NOT
be translated, because it is the user's words rather than a catalogue string.
The status is the opposite case: it is a closed value, and it SHALL be displayed
through a label looked up for the active language.

A phase SHALL belong to the deal it was created under and SHALL NOT be readable
or writable through another deal. Phases SHALL NOT be created for a deal
automatically: a deal begins with none, and a phase exists because the user
created it.

The colour SHALL be stored as the palette's name for that colour rather than as
a colour value, so that retuning the palette moves every phase with it, and
SHALL NOT be the only thing distinguishing one phase from another — the name
accompanies the colour wherever a phase is shown.

#### Scenario: Creating a phase
- GIVEN a deal with no phases
- WHEN a phase is created with a name and no budget and no dates
- THEN it is stored against that deal with the default status, a position at the
  end of the sequence and a colour from the palette
- AND its budget and dates read as unset rather than as zero or as today

#### Scenario: A phase set is not invented for a new deal
- GIVEN a newly created deal
- WHEN its phases are listed
- THEN the list is empty and the interface offers to create the first phase
- AND no phase named for a trade the user did not choose has been created

#### Scenario: A phase of another deal
- GIVEN a phase belonging to deal B
- WHEN it is requested, updated or deleted through deal A
- THEN the response is 404 and nothing is changed

#### Scenario: The phase name never reaches the logs
- GIVEN a phase is created, renamed, reordered or deleted
- WHEN the operation is logged
- THEN the log line carries the phase and deal identifiers and no phase name

#### Scenario: The name is the user's, the status is the app's
- GIVEN a phase the user named in Portuguese
- WHEN the display language is switched to English
- THEN the phase name is unchanged, character for character
- AND its status is shown through the English label for that status

### Requirement: Phases are ordered, and the order is the user's

The system SHALL keep the phases of a deal in an explicit order and SHALL return
them in it. The order SHALL NOT be derived from the name, from the creation
time, or from the planned dates — the sequence of a renovation is a fact about
the work, dates are optional, and phases overlap.

A newly created phase SHALL be appended to the end of the sequence. Reordering
SHALL be expressed as a single operation carrying the deal's phases in their new
order and applied as one write, so that no stored state ever has two phases
claiming one position or a gap in the sequence.

A reorder naming a set that is not exactly the deal's phases — one missing, one
repeated, or one belonging to another deal — SHALL be refused, and the stored
order SHALL be left exactly as it was.

#### Scenario: A new phase goes to the end
- GIVEN a deal with three phases
- WHEN a fourth is created
- THEN it is returned last, and the first three keep their order

#### Scenario: Reordering the sequence
- GIVEN a deal whose phases are ordered A, B, C
- WHEN they are reordered to C, A, B
- THEN listing them returns C, A, B
- AND every phase still holds a distinct position with no gap in the sequence

#### Scenario: A reorder that omits a phase
- GIVEN a deal with three phases
- WHEN a reorder naming only two of them is submitted
- THEN it is refused and the stored order is unchanged

#### Scenario: A reorder naming another deal's phase
- GIVEN deals A and B, each with phases
- WHEN a reorder for deal A names one of deal B's phases
- THEN it is refused and neither deal's order is changed

### Requirement: Each phase carries its own budget, and the gap is reported

A phase SHALL report a budgeted amount. In this change that figure is recorded
against the phase by the user and MAY be unset; a later change MAY derive it
from a finer-grained record instead. Either way, the rules below hold, because
they are about the relationship between the deal's budget and its phases' — not
about where a phase's own figure comes from.

The deal's planned budget SHALL remain the authority for what the works are
expected to cost, and the total of its phases' budgeted amounts SHALL NOT
overwrite it, replace it, or be written back to it.

The system SHALL report both the total budgeted across the deal's phases and the
part of the deal's planned budget not yet allocated, the latter as a signed
figure so that allocating more than the deal's budget is visible rather than
clamped at zero. Allocating more than the deal's planned budget SHALL NOT be
refused: the figure is reported, exactly as an exceeded budget is reported
rather than prevented.

While the figure is one the user records, a phase with no budget SHALL report it
as unset, never as zero, so that "not costed yet" and "costed at nothing" stay
distinguishable.

#### Scenario: A budget allocated across phases
- GIVEN a deal with a planned budget of `50000.00`
- AND phases budgeted `20000.00`, `15000.00` and `5000.00`
- WHEN the summary is requested
- THEN the total allocated to phases is `40000.00` and the unallocated figure is
  `10000.00`

#### Scenario: Over-allocation is reported, not refused
- GIVEN a deal with a planned budget of `50000.00`
- WHEN its phases are budgeted to a total of `56000.00`
- THEN the allocation is stored
- AND the unallocated figure is reported as `-6000.00` rather than as zero

#### Scenario: A phase with no budget
- GIVEN a phase that has not been costed
- WHEN it is read
- THEN its planned budget is absent rather than `0.00`
- AND it contributes nothing to the total allocated across phases

#### Scenario: No deal budget set
- GIVEN a deal whose planned budget is unset
- WHEN the summary is requested
- THEN the total allocated across phases is still reported
- AND the unallocated figure is absent rather than negative

### Requirement: An expense records which works phase it belongs to

An expense MAY name the works phase it belongs to. The field SHALL be optional,
so that an expense can be recorded before the user has decided which phase it
belongs to, and so that every expense recorded before phases existed stays valid
exactly as stored.

An expense SHALL only name a phase belonging to the same deal. A request naming
a phase that does not exist, or one belonging to another deal, SHALL be refused
with a 400, and SHALL create or change nothing.

The system SHALL NOT infer a phase for an expense from its category, its room,
its payee or its description. An expense has the phase the user gave it, or none.

#### Scenario: Recording an expense against a phase
- GIVEN a deal with a phase
- WHEN an expense is created naming that phase
- THEN it is stored against that phase and returned with it

#### Scenario: Recording an expense without a phase
- WHEN an expense is created naming no phase
- THEN it is stored, and its phase reads as unset rather than as a default phase

#### Scenario: A phase belonging to another deal
- GIVEN deal A and a phase belonging to deal B
- WHEN an expense on deal A is created naming that phase
- THEN the response is 400, and no expense is created

#### Scenario: A category is not a phase
- GIVEN an expense whose category is `labour` and whose room is `kitchen`
- WHEN it is stored with no phase named
- THEN it stays unphased
- AND no phase is assigned to it from either value

> The per-phase figures the summary carries — the status split, the share of
> deal spend, the proportion of budget spent, and the unphased group — are
> specified in this change's `budget-summary` delta, which owns the
> `BudgetSummary` contract. This capability specifies what a phase is and how it
> behaves; it does not restate what the summary response carries.

### Requirement: Money spent is not a statement about work done

The proportion of a phase's budget taken up by its spend describes **money**, and
the system SHALL NOT present it as a statement about how much of the work is
physically done. The two routinely disagree — a deposit paid before anything
starts, work finished and not yet billed — and this change reports only the
money, because that is what it can derive from the records it holds.

How far the work itself has got SHALL be carried by the phase's status until a
later change records it as a figure of its own. No label, bar or caption SHALL
describe the money figure as progress.

#### Scenario: Money spent is not work done
- GIVEN a phase budgeted `10000.00` whose only expense is a `5000.00` deposit
  paid before any work started
- WHEN the phase is read
- THEN the proportion of budget spent is `50`
- AND nothing reports the work as half done

#### Scenario: Work done without a bill
- GIVEN a phase whose work is substantially complete but not yet invoiced
- WHEN the phase is read
- THEN the proportion of budget spent is low
- AND nothing reports the work as barely started

### Requirement: An expense without a phase stays a first-class record

An expense naming no phase SHALL remain fully valid and fully counted. Being
unphased SHALL NOT be a defect state: no expense SHALL be rejected, hidden, or
auto-assigned to a phase because it names none.

How the summary reports unphased spend as its own group is specified in this
change's `budget-summary` delta.

#### Scenario: An expense is recorded with no phase
- GIVEN a deal with phases defined
- WHEN an expense is recorded naming none of them
- THEN it is stored, valid, and counted in the deal's totals
- AND no phase is assigned to it

#### Scenario: Expenses recorded before phases existed
- GIVEN a deal whose expenses were all recorded before this change
- WHEN the deal is read
- THEN every one of them is still valid and unphased
- AND every total is exactly what it was before this change

### Requirement: Deleting a phase releases its expenses rather than deleting them

Deleting a phase SHALL NOT delete the expenses that name it. Those expenses
SHALL become unphased, keeping their identifiers, amounts and every other field
unchanged. A phase is a way of grouping the ledger; it is not the ledger.

The system SHALL make the number of expenses a deletion would release knowable
before the deletion happens, so that the interface can state the consequence
rather than discovering it afterwards.

#### Scenario: Deleting a phase that has spend against it
- GIVEN a phase with four expenses against it
- WHEN the phase is deleted
- THEN the phase is gone and all four expenses still exist
- AND all four are reported in the unphased group with their amounts unchanged

#### Scenario: The consequence is known in advance
- GIVEN a phase with four expenses against it
- WHEN the interface asks what deleting it would affect
- THEN it is told four expenses would be released

#### Scenario: Other phases are untouched
- GIVEN a deal with three phases
- WHEN one is deleted
- THEN the other two keep their expenses, their budgets and their relative order
