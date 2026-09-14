# Design: Works phases

## Context

See `proposal.md` — Why. The constraints that shape the approach:

- **The `deal_id` spine is PART 2's, and a phase hangs off it unchanged.** Deals
  are addressed as a path prefix, storage is a directory per deal
  (`data/<env>/deals/<deal_id>/`), `deal_id` is the first parameter of every
  repository method, and an unknown deal is a 404 rather than an implicit
  create. This change adds a third collection to that directory and nothing else
  to the spine.
- **The closest thing to a phase today is the wrong thing.** `Expense` carries a
  free-text `room` (`backend/app/src/models/expense.py:61`) and an
  `ExpenseCategory` enum (`:9-22`). PART 1 built the sidebar rail from the
  category precisely because it was the nearest available, and wrote the
  constraint that the rail "SHALL NOT be labelled as works phases, which do not
  exist yet".
- **Every displayed total is computed server-side.** `Money` is `Decimal` in
  Python and a string on the wire (`app/src/models/money.py:1-20`), and the
  client is forbidden arithmetic on it. The per-category breakdown this change
  mirrors lives at `budget_service.py:97-108`, where `_by_category` **excludes
  PLANNED** while `total_forecast` includes it — the trap any parallel
  per-phase rollup has to avoid repeating.
- **Three sibling PARTs write to requirements this change writes to.** PART 4
  edits the same ledger requirement, PART 5 adds to this change's own `phases`
  capability and pins one requirement header byte-identical, and both were
  planned while this change was still a stub. Decisions 4 and 10 exist because
  of that.
- **This changes the on-disk format**, so it needs human review before merge
  (agent-loop rule), the same gate PART 2 tripped.

## Goals / Non-Goals

**Goals:**
- A phase is a real record with a name, an order, a budget and spend that rolls
  up to it, so "over budget" becomes answerable about a part of the job rather
  than only about the whole renovation.
- The sidebar rail's label stops being a stand-in and starts being true.
- Every per-phase figure is computed server-side in `Decimal`, including the
  ratios, so no client divides one `Money` by another.
- Nothing is assigned a phase that the user did not assign.
- The shape PART 5 attaches to is settled here, so line items land without a
  second migration of phases.

**Non-Goals:**
- Line items, awarded-versus-invoiced amounts, variance or forecast-at-
  completion. Those are PART 5, and this change deliberately stops short of them.
- A physical-progress percentage per phase (Decision 4).
- A timeline or Gantt view. Phase dates are recorded and shown back in the phase
  editor; nothing draws a schedule from them yet.
- Replacing `room` or `ExpenseCategory`. Both remain; they answer different
  questions (Decision 9).
- Seeding a deal with a starter set of phase names (Decision 1).

## Decisions

### 1. A phase is a record the user creates per deal, not a fixed enum

**Chosen:** phases are per-deal records with a user-written name, created by the
user. A new deal starts with none.

An enum would have been far cheaper — translatable through the existing
catalogue mechanism, no repository, no routes, no ordering problem. It fails on
the two things the rail needs: a phase carries its own budget, and every
renovation divides differently. A fixed list would either be wrong for most
deals or so long that it is noise.

**Rejected:** seeding each new deal with the mockup's seven phases. It looks
helpful and is the same mistake PART 1 refused under "no mock data" — names the
user did not choose, rendered in the same type as the ones they did, and then
deleted one at a time. A template the user explicitly applies is a reasonable
later feature; it is not this change, and it is worth noting that a template
becomes far more valuable once PART 5 gives phases line items to carry.

**Consequence:** the phase name is user content. It is never logged (rule 4,
which already forbids addresses and contractor details) and never translated —
unlike the phase's status, which is a closed value and gets a catalogue label.
The name is capped at 80 characters, matching `room`
(`app/src/models/expense.py:61`), because it has to render in a 258px rail.

### 2. Order is an explicit position, and a reorder moves the whole sequence

**Chosen:** each phase holds a position the server maintains. Creating appends.
Reordering is one operation carrying the deal's phases in their new order,
applied as a single write, and refused unless the set it names is exactly the
deal's phases.

**Rejected:** ordering by name, creation time or planned start date. Demolition
precedes painting as a fact about the work; names sort alphabetically, creation
order is whatever the user typed first, and dates are optional and overlap.

**Rejected:** a `position` field on the ordinary update. Moving a phase from
fifth to second renumbers four others; expressing that as four separate updates
means four writes and a window in which the stored order is inconsistent. One
whole-sequence operation has no such window, and the all-or-nothing validation
makes a partial reorder impossible to express by accident.

**Rejected:** fractional or lexicographic ranks. They are the right answer for
concurrent drag-and-drop by several users; this is a single-user local-first app
where dense integers stay readable in the JSON file.

### 3. Both budgets exist, and the gap between them is reported, never balanced

The deal has a `planned_budget`. Each phase gets a budgeted amount. The obvious
question is which one wins.

**Chosen:** both, with the deal's budget remaining the authority for the works
total, and the difference between it and the sum of the phases reported as a
signed figure. Over-allocation is shown, not refused.

A flip is budgeted the way it is financed: top-down first — "fifty thousand for
the works" — and then broken into phases as quotes arrive. Forcing the two to
agree means either refusing to save a phase budget mid-allocation, or silently
rewriting a figure the user typed. Both are worse than showing the gap. This is
the same posture the codebase already takes with `over_budget`, which reports an
exceeded budget rather than preventing it.

**Rejected:** the deal budget becomes the sum of its phases. It breaks
`remaining_budget` and `budget_used_percent` for any deal that has no phases
yet, and it removes the ability to state a target before knowing the breakdown.

**Rejected:** phases carry no budget; only the deal does. Then the rail cannot
show `spent / budget`, which is most of what the rail is for, and PART 5 has no
per-phase basis to attach to.

### 4. The rail's percentage is money, and "percent executed" is left to PART 5

The mockup's rail shows a per-phase `pct` that is authored by hand and is
**physical** progress: its first phase reads 100% while its money shows 3.720 €
invoiced against 3.500 € budgeted. Money and progress are different figures.

**Chosen:** this change reports only the money — the proportion of a phase's
budgeted amount its committed spend has taken up — and carries how far the work
has actually got in the phase's three-value **status**. The spec says in as many
words that the money figure is not a statement about work done.

**Rejected:** a user-typed completion percentage. It is a number nothing
verifies, rendered beside figures that trace to records — the objection PART 1
raised against mock data, in miniature.

**Rejected:** deriving the status from spend. A phase with money against it is
not finished, and a phase with no expenses may well be underway.

**This decision was changed after PART 5 was planned in parallel.** PART 5's
`phases` delta defines **percent executed** as physical progress a person
records, and **percent invoiced** as the money ratio. An earlier draft of this
change used "percent executed" for the money figure, which would have put two
contradictory definitions of one term into one capability. The money figure here
is therefore named for what it is — the proportion of budget spent — and the
word "executed" is left free for PART 5 to define. PART 5's split is the better
model and this change is deliberately a subset of it, not a competitor.

### 5. Phase colour is identity the user assigns, from a closed non-status palette

PART 1 Decision 3 chose a monochrome accent ramp for category swatches over the
mockup's seven hues, on the grounds that the guide says "color means *status*,
not decoration" (`docs/design-system-guide.md:12`), and left an explicit note:
*"Revisit at PART 3: once phases are real and a user names and colours them, the
colour is identity the user assigns rather than decoration the app invents."*

Revisited, and the revisit lands part-way rather than wholesale.

**Chosen:** a phase carries a colour the user picks from a **closed palette
defined in the design guide**, and that palette **excludes every hue that
carries status** — no accent green, no warning amber, no danger red. The colour
is stored as the palette's name for it, never as a colour value.

Identity is a real job here that a monochrome ramp cannot do: the same phase has
to be recognisable in the rail, in the budget view's group headers and in the
ledger's phase column, and scanning seventeen ledger rows for one phase is
exactly what a colour is good for. But PART 1's objection does not evaporate
because a user picked the hue — green would still mean "under budget" two inches
away in the same viewport. Excluding the status hues keeps both meanings intact.

**Rejected:** the mockup's seven hues as-is. Two of them (`#4fd39a`, `#e0a985`)
are the accent green and a near-miss of the warning amber.

**Rejected:** keeping the monochrome ramp, now ordered by position. It is
honest, but a ramp of one hue at stepped opacity is precisely what fails when
the job is telling seven things apart at a glance in three different places.

**Rejected:** a free colour picker. It bypasses the design system (rule 7) and
can reintroduce a status hue by hand.

**Consequence:** `docs/design-system-guide.md` gains the identity palette, and
the sentence at `:12` must be amended to say colour means status *or identity*,
with identity drawn from a closed set that excludes every status hue. The guide
changes first and the code mirrors it, as in PART 1's task 1.1.

### 6. `phase_id` is optional, and nothing is ever inferred

**Chosen:** the expense's phase is nullable, must name a phase of the same deal,
and is never guessed. A request naming an unknown or another deal's phase is
refused with a 400 and writes nothing.

**This corrects the stub proposal**, which proposed "a backfill path from
`room`/`category` where it can be inferred". There is no such inference to be
had: `materials` says what was bought, not which part of the job it was for, and
`room` is free text. A wrong phase does not announce itself — it silently
misstates which part of the renovation is over budget, which is the exact defect
this change exists to remove. Existing expenses therefore land unphased, are
visible as their own group, and are assigned by the user.

**Rejected:** requiring the phase. It would make recording a payment impossible
until the user has modelled the works, and would invalidate every stored expense.

**On the status code:** 400 rather than 404, because the request is not
addressing the phase as its resource — the expense is — and rather than 422,
which is where schema validation already lands. It matches `EmptyUpdateError`,
the existing cross-field refusal (`app/src/exceptions.py:13-17`).

### 7. Deleting a phase releases its expenses; it never deletes them

**Chosen:** deletion detaches. The expenses survive unchanged and reappear in
the unphased group, and the interface states how many will be released before
the user confirms.

**Rejected:** cascading the delete to the expenses. A phase is a way of grouping
the ledger; the ledger is the money record. Deleting a mis-created phase must
never be able to destroy payments.

**Rejected:** refusing to delete while expenses reference the phase. It turns
fixing a typo'd phase into reassigning forty expenses first, and the detach is
recoverable in a way a deletion is not.

### 8. Per-phase rollups ride on the deal's budget summary and carry phase identity

**Chosen:** the summary gains per-phase figures, the unphased group, the total
budgeted across phases and the unallocated remainder. Each phase's figures
arrive with that phase's name, position and colour.

This follows PART 2's precedent for the deals list — "each carrying enough to
identify it without a second request" — and keeps PART 1's rule that the rail
reads from one place. The alternative, having the client join the phases list
against a figures list, puts a join in the browser for no gain.

The CRUD routes under `/deals/{deal_id}/phases` remain the write surface. The
per-category figures are untouched, and a test asserts they are: category and
phase are different questions and both stay answerable.

**Forward compatibility:** PART 5 attaches expenses to line items, at which point
a phase's figures are reachable through the line item instead of directly. The
rollup contract does not change, because it is computed server-side — consumers
of `by_phase` are unaffected by where the service reads the attachment from.

### 9. The rail filters by phase; the category filter moves, it does not die

PART 1 wired the rail to the screen's existing `filters.category`
(`frontend/src/features/expenses/ExpensesScreen.tsx:62-69`,
`formTypes.ts:27-30`). The rail now drives a phase filter instead.

**Chosen:** the filter state gains a phase alongside status and category; the
rail sets the phase; the ledger's existing filter row keeps its category select.
Both remain answerable, which is the whole distinction the proposal draws —
*materials* is what you bought, *Redes* is which part of the job it was for.

**Rejected:** replacing the category filter with the phase filter. It would
delete a working feature to make room for a new one, and the per-category
figures PART 1 added to the summary would lose their only consumer.

### 10. Two requirements change meaning, and they take two different delta forms

Both PART 1's rail requirement and PART 1's budget-view grouping requirement have
names that state the thing this change replaces. OpenSpec offers `RENAMED`, and
it works — archive applies `RENAMED` before `MODIFIED`
(`dist/core/specs-apply.js`, "Apply operations in order"). They still get
different treatment, for reasons outside the tooling.

**The grouping requirement keeps its header byte-identical.** PART 5 pins
`### Requirement: The works budget view groups expenses by category` in its own
delta and says why: *"The name is retained deliberately so that PART 3's edit and
this one reconcile at archive instead of forking into two requirements."*
Renaming it here would leave PART 5's `MODIFIED` naming a header that no longer
exists, and archive throws on that. Renaming is a follow-up once both have
archived.

**The rail requirement is removed and replaced.** Nothing references it, its
subject changes completely, and every one of its three scenarios is about
selecting and clearing a *category*. A `MODIFIED` cannot fix that: archive
refuses a modified block that drops a scenario the current spec still has
(`specs-apply.js` MODIFIED step; `validator.js` `findScenarioLossIssues`), so
keeping the requirement would mean keeping a scenario named "Selecting a
category" describing the selection of a phase. `REMOVED` with a Reason and a
Migration says what actually happened and leaves a correctly-named requirement
behind.

### 11. Storage and routes follow PART 2's spine exactly

`data/<env>/deals/<deal_id>/phases.json`, an array, through the existing
`JsonStore` with its temp-file-then-`os.replace` write (`json_store.py:10-40`).
A `PhaseRepository` protocol with `deal_id` as the first parameter of every
method, per PART 2 Decision 3. Routes at `/deals/{deal_id}/phases`, with the
whole-sequence reorder as its own operation under that prefix.

No migration runs: phases start empty and `phase_id` starts unset, so every
stored expense stays valid as written. This is additive, which is what makes it
the cheap half of the on-disk change — and see Risks for the half that is not.

## Risks / Trade-offs

- **This changes the on-disk format**, so it needs human review before merge
  (agent-loop rule). → Flagged as a task rather than assumed.
- **Rolling back after a phase is recorded is not free.** `ExpenseCreate` sets
  `extra="forbid"` (`app/src/models/expense.py:52`), so an expense record
  carrying `phase_id` fails validation on a build that predates this change —
  the stored data outlives the code that understands it. → The rollback is
  restoring the pre-upgrade `expenses.json` per deal, not just reverting the
  commit; stated in the Migration Plan.
- **PART 4 modifies the same ledger requirement, independently.** A `MODIFIED`
  block replaces the whole requirement, so whichever of PART 3 and PART 4
  archives second silently reverts the other's edit unless it re-copies the
  current block first. The two edits do not overlap — PART 4 turns the payee into
  a contractor, this adds the phase column — so the merge is mechanical once
  someone does it. → A task in this change; PART 4 lists the mirror task.
- **PART 5 supersedes where a phase's budget figure comes from.** It replaces a
  recorded phase budget with the sum of the phase's line items, and its delta
  adds that as a new requirement rather than editing this one, because this text
  did not exist when it was planned. Read together after both archive, "a phase
  with no budget reports it as unset" and "a phase with no line items reports
  `0.00`" describe two regimes of one field. → This change's requirement is
  written so the surrounding rules hold whatever the figure's source is, and
  reconciling the two texts is an explicit task in both changes.
- **`openspec validate --strict` reports two INFO lines** — that archive would
  refuse the `frontend-shell` delta (its main spec does not exist until PART 1
  archives) and the `frontend-expenses` delta (its modified requirement is
  PART 1's, not yet in the main spec). **Both are expected and correct for this
  sequencing**; they disappear when PART 1 archives, and the deltas must not be
  restructured to silence them. PART 2 and PART 5 carry the same signal.
- **A closed palette of cool hues is hard to tell apart with deuteranopia**, and
  six of them more so. → The name accompanies the colour everywhere the colour
  appears — rail, group header and ledger cell — and the spec makes that
  normative rather than leaving it to the implementation.
- **The guide rewrite is the deliverable, not the CSS.** `scripts/harness-check.sh`
  compares docs to hooks and the frontend layout table to the tree, but it cannot
  see a token that disagrees with the guide. PART 1 flagged the same gap. → Guide
  first, code second, and the palette table is reviewed as part of the diff.
- **Portuguese, plus user-typed names, in a fixed 258px rail.** Phase names are
  arbitrary text where the guide's copy rules assume catalogue strings. → The
  name is capped at 80 characters and the rail wraps rather than ellipsises,
  per the guide's "absorbed by layout, never by shrinking" rule; checked in both
  locales at 1280px.
- **The ledger grows a seventh column** and already scrolls inside its own
  container at 800px minimum width (PART 1). → The phase column carries a name
  and a small swatch, not a second badge, and the column set is checked in
  `pt-PT` where it is widest.

## Migration Plan

1. **Backend, additive first**: the `Phase` model, `PhaseRepository`, the JSON
   implementation under the deal's directory, and the routes — green on its own,
   with no expense touched.
2. **Backend, the attachment**: `phase_id` on the expense with its same-deal
   validation, then the per-phase rollups in `BudgetService.summary()`.
3. **Design guide**: the identity palette and the amendment to the colour rule,
   before any component uses a swatch.
4. **Frontend**: API client and types, then the rail and its management actions,
   then the grouped budget view, the ledger column and the form field.
5. **Reconcile with siblings** before archiving: re-copy the ledger requirement
   if PART 4 landed first, and settle the phase-budget wording with PART 5.

**Rollback:** reverting the code is not sufficient once a `phase_id` has been
written, because `extra="forbid"` rejects the unknown field. Restore each deal's
`expenses.json` from the pre-upgrade copy; `phases.json` can simply be deleted,
since nothing else references it.
