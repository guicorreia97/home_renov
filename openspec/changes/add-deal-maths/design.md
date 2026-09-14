# Design: Deal maths

## Context

See `proposal.md` — Why. The constraints that shape the approach:

- **This PART only makes sense after 6 and 7.** `_projected_profit`
  (`backend/app/src/services/budget_service.py:84-95`) is
  `target_sale_price − purchase_price − total_forecast` today: it ignores
  acquisition costs and financing entirely. PART 6 adds the first, PART 7 the
  second, and this one adds the cost of selling. Applied alone, a sensitivity
  grid would be nine confidently-rendered cells each wrong by the cost of
  buying and financing the property.
- **PART 1 already made the disclosure normative.** "The view SHALL NOT show a
  profit projection derived from an incomplete cost base without the reader
  being able to see which costs it contains"
  (`openspec/changes/redesign-flip-desk-skin/specs/frontend-expenses/spec.md`).
  PART 1 could satisfy that with a sentence, because its cost base was one
  number. With five components it needs a data structure, and that is the
  central design problem here.
- **Money is exact server-side and a string on the wire**
  (`backend/app/src/models/money.py:1-20`), and the client is forbidden
  arithmetic on it. Ratios are already precedented as real numbers —
  `budget_used_percent` is `float | None` (`models/budget.py:56`), not `Money`.
- **Every record is deal-scoped after PART 2**: `/deals/{deal_id}/…`, a
  directory per deal on disk, `deal_id` first on every repository method
  (`openspec/changes/add-deal-and-property/design.md`, Decisions 1–3).
- **The mockup is the reference for shape, not for numbers.**
  `Home_Renovation_looks_PT-PT/Flip Desk.dc.html:650` hardcodes a 20% minimum
  margin and `:502` computes break-even as `(fixedCosts + works) / saleFactor`.
  The first is an investor's criterion the app must not invent; the second is
  the piece of arithmetic worth copying exactly.

## Goals / Non-Goals

**Goals:**
- A profit figure whose cost base is complete, or which says exactly what it is
  missing.
- A judgement — meets the threshold or does not — that is never more confident
  than the data supports.
- Exit costs modelled as terms the user agreed, not as amounts they had to
  compute.
- One projected profit per deal, not two that disagree across two responses.

**Non-Goals:**
- Portuguese statutory tax rules. No `mais-valias` inclusion fractions, holding
  periods or reinvestment relief — see Decision 6.
- A general spreadsheet. Scenarios vary sale price and works basis; they are not
  an arbitrary formula editor.
- Changing how `Money` is represented or where it is computed.
- Anything the grid needs from PART 5's line items. The works axis is built from
  figures the summary reports today.

## Decisions

### 1. The verdict is asymmetric: a failing margin is stated, a passing one is withheld

Where the cost base is incomplete, the system reports every figure it can and
withholds only the statement that a threshold is **met**.

The asymmetry is sound rather than cautious. Every component still missing is a
cost, so an incomplete cost base can only overstate profit. A deal that already
fails its threshold will still fail once the missing costs arrive — that verdict
is monotone and safe. A deal that passes on an incomplete base may not pass on a
complete one, and a green tick is the single most expensive thing this screen
could get wrong.

This is what makes the whole change honest, and it costs one boolean.

**Rejected:** withholding every figure until the cost base is complete. Most
deals are incomplete most of the time — acquisition costs land at the deed,
financing when the loan is drawn — so the profit view would be blank exactly
when someone is deciding whether to bid. Blank is not more honest than
disclosed.

**Rejected:** showing the verdict with a warning badge beside it. PART 1 already
settled this argument for mock data (`design.md` Decision 4): a badge renders at
the same weight as the thing it qualifies and loses. If the verdict cannot be
trusted, it should not be drawn.

**Consequence worth naming:** the monotonicity holds only while every cost
component is non-negative. That is therefore written into the spec as a
requirement — anything that increases what a sale yields is modelled as
proceeds, never as a negative cost — rather than left as an implicit property.

### 2. Absence has three states, not one

Each component of the cost base is **recorded**, **not applicable**, or **not
entered**. Two of those look identical in storage: an all-cash deal and a
financed deal whose loan has not been entered both hold no financing record.

They are not the same deal, and only the user can say which it is. So "not
applicable" is an explicit declaration, never inferred from an empty collection.

**Rejected:** treating a missing component as zero. It is the bug this whole
PART exists to correct — it is exactly what `_projected_profit` does today with
acquisition and finance costs, and it is why PARTs 6 and 7 each describe
themselves as correcting an overstated number.

**Rejected:** inferring "not applicable" from the absence of records. It makes
every unfilled deal silently claim to be complete, which is worse than the
current state: today the figure is wrong, and under that inference it would be
wrong *and* certified.

### 3. Break-even and the required price are specified by the property they satisfy

The spec says the break-even price is the price at which profit is zero, and
requires that evaluating the deal at the reported price yields zero. It does not
prescribe the formula.

This matters because exit costs vary with the sale price. The naive
implementation — take the cost base, add the exit costs computed at the target
price, call that break-even — is wrong by the commission on the gap between the
two prices. The mockup gets this right: `breakEven = (fixedCosts + works) /
(1 − 0.05 × 1.23)` (`Flip Desk.dc.html:502`). Same for the required price:
`(fixedCosts + works) / (1 − minMargin − 0.05 × 1.23)` (`:504`).

Specifying the property rather than the closed form means the spec survives a
capital-gains term that makes the function piecewise linear, and it gives pytest
an invariant to assert rather than a reimplementation of the formula to compare
against — a test that recomputes the formula proves only that it was typed twice.

Worked example used throughout the spec, so the figures reconcile: a cost base
of `370000.00` before exit costs, commission `6%` of the sale price VAT
included, target `465000.00`, minimum margin `20`. Profit `67100.00`, margin
`14.43`, shortfall `25900.00`, required price `500000.00`, break-even
`393617.02`.

**Rejected:** a numeric solver. A closed form exists for the linear case and for
each segment of the piecewise one; iterating would add a convergence tolerance
nobody needs.

### 4. Deal maths gets its own response rather than more fields on the budget summary

`BudgetSummary` (`models/budget.py:39-65`) already carries thirteen fields and
PART 1 adds roughly five more. Coverage states, an exit-cost breakdown, three
threshold figures and nine grid cells would make one response the whole
application.

It is also refetched after **every** expense mutation — that is a standing
requirement of this capability ("The summary follows a mutation",
`openspec/specs/frontend-expenses/spec.md`). Recomputing a nine-cell sensitivity
grid every time someone edits a receipt is work nobody asked for.

**Rejected:** extending `BudgetSummary`. One fetch fewer, at the cost of
coupling the ledger's refresh cycle to the grid's.

**Consequence:** two responses can now report a projected profit, so the spec
requires them to agree and to be computed once. Which response keeps the field
is settled in Decision 10.

### 5. The grid is a derived sweep; scenarios are saved overlays

Two different objects, deliberately. The grid's axes come from the deal's own
figures — sale prices spanning the target, works spanning budget, forecast and
an overrun — and it is recomputed, never stored. A scenario is a named set of
assumptions the user saved and wants back.

**Rejected:** persisting the grid as nine scenarios. It would fill the scenario
list with rows nobody named and make "my scenarios" useless as a list.

**Rejected:** computing the grid client-side from one base profit. It is the
obvious shortcut — profit is linear in both axes, so eight cells look like
arithmetic on the ninth — and it is forbidden arithmetic on `Money`
(`openspec/specs/frontend-expenses/spec.md`), it breaks the moment a
capital-gains term makes a column non-linear, and it puts a second, untested
money implementation in the browser. The base-cell-equals-headline invariant is
the test that catches a grid computed over a different cost base than the
headline.

### 6. Capital gains is a user-entered rate over a stated gain, never a statutory computation

PART 6 takes this position for IMT and Imposto do Selo — "default to
user-entered with the formula as a suggestion, never a silent computation" — and
`mais-valias` is the harder case: the rate depends on the holder, the holding
period, and reliefs that turn on facts the app does not hold.

So: a rate the user enters, applied to a taxable gain the system states plainly
(sale price less purchase price, acquisition costs and qualifying works), floored
at zero so no deal reports a negative tax that reads as a refund.

**Rejected:** implementing the Portuguese rules. A wrong tax figure presented
confidently is worse than an empty field, and tax rules change on a schedule
this repo does not track.

### 7. A commission carries its rate and its VAT separately

The user agreed "5% plus VAT". Storing an effective 6.15% makes them do the
arithmetic the application exists to do, and makes the stored figure wrong the
day the VAT rate changes.

**Rejected:** an effective rate only. Shorter model, worse record — and the
waterfall's basis line ("5,0% + IVA 23%") could no longer be rendered from the
data, only from a string the user retyped.

### 8. The minimum margin has no default

A deal with no minimum margin reports no threshold, no gap, no required price
and no verdict.

**Rejected:** 20%, the mockup's figure. It is an investor's criterion, not a
property of the application, and a default would make every deal appear to be
judged against a standard its owner never set — the same class of mistake as
mock data, one level up.

**Rejected:** expressing the threshold on return-on-equity instead. It is the
figure an investor decides on, and PART 7 makes it available — but it inverts
less cleanly into a required sale price, and margin-on-sale is what the mockup's
callout names. Return-on-equity thresholds are a reasonable follow-up, not part
of this.

### 9. Exit costs are their own records, not expenses

An exit cost is not renovation spend, has not been incurred, and is frequently a
rate rather than an amount. `ExpenseCategory` has eleven values
(`models/expense.py:9-22`), all of them works categories, and `Expense.amount` is
`PositiveMoney` — a single settled number.

**Rejected:** a `SELLING` expense category. It would inflate the renovation
budget with money that is not renovation, exactly as PART 6 argues for IMT under
`PERMITS_AND_FEES`, and it cannot express "5% of whatever it sells for".

### 10. `projected_profit` stays on the budget summary; one figure, two responses

The question Decision 4 left open. With deal maths in its own response, two
responses report a projected profit: either the field leaves `BudgetSummary`, or
it stays and the two are required to agree.

**Chosen: it stays.** Three of the four PARTs that touch this figure declare
`budget-summary` and build the profit contract *there*. PART 6 adds the
acquisition total and the requirement that the cost base behind a profit figure
is disclosed; PART 7 adds the finance cost, names it beside the profit, and
requires an absent profit to state which input it is waiting on; PART 5 settles
that the money guarantee is about "**where a figure is computed**, not about
which response carries it"
(`openspec/changes/add-line-item-budgeting/specs/budget-summary/spec.md`).
Removing the field here would delete five requirements two sibling changes write
days before this one lands, and would orphan `margin_percent`,
`return_on_cost_percent` and `break_even_sale_price` — each is profit over a cost
base, and none can stay behind a profit that left.

What makes staying safe is that the duplication is resolved by **ownership, not
by a test**: one service computes the figure once, both responses report it, and
the spec says so. The equality pytest (`tasks.md` 3.6) is then a regression guard
on an invariant the design already holds, rather than the only thing holding it.

**The refetch cost is real and is not what decides it.** The summary is refetched
after every expense mutation, so whatever sits behind that field is recomputed on
every receipt edit. But PARTs 6 and 7 already put the acquisition repository and
the loan schedule behind it; exit costs add a rate over the sale price, which is
arithmetic rather than another store to walk. What would genuinely make that
refetch expensive is the judgement layer — the coverage object, the threshold
solve, nine grid cells, scenario overlays — and Decision 4 keeps every one of
those off the summary. The cost argument carries the grid; it does not carry the
field.

**Rejected: removing `projected_profit` from `BudgetSummary`.** The
tidier-sounding answer, and the one this design leaned toward before PARTs 6 and
7 wrote their deltas. It fails on sequencing. PART 6's "the figure SHALL keep its
existing name and its existing place in the response" exists precisely so a
reader cannot choose between a corrected profit and an uncorrected one beside it;
deleting the field one PART later would make PART 6's and PART 7's summary work
throwaway, and would move a figure users already read twice in three changes.

**Consequence:** this change declares `budget-summary` and carries a delta —
MODIFYING the profitability requirement for the exit-cost term and the solved
break-even, plus two ADDED requirements: the summary names the exit costs it
subtracted, and one projected profit exists per deal. **Nothing is removed from
the capability**, which is why the proposal's "Deletes from PART 1" section still
reads as it did.

## Risks / Trade-offs

- **Two responses reporting one profit can drift apart.** → Settled in Decision
  10, not deferred: this change declares `budget-summary` and carries a delta, so
  the field's stated meaning now includes exit costs in the capability that owns
  it. The spec requires one computation reported by both responses; the pytest
  asserting equality across the two endpoints (`tasks.md` 3.6) guards it.
- **Three changes now MODIFY `### Requirement: Profitability figures are derived
  from the targets`** — PARTs 6 and 7 alongside this one, all copying PART 1's
  block because `budget-summary` has no main spec yet. (PART 5 also carries a
  `budget-summary` delta, but it modifies a different requirement — *Every
  displayed total is computed server-side* — so it is not part of this
  collision.) A MODIFIED block replaces
  the whole requirement, so whichever archives last silently discards the others'
  edits if it has not re-copied. → This delta folds PART 6's and PART 7's terms
  and scenarios in and names them in its blockquote; `tasks.md` 10.5 re-copies
  before archive. This change archives last, so it is the one that must.
- **This is the third time the projected profit visibly drops.** PART 6 lowers it
  by acquisition costs, PART 7 by finance costs, and this one by the cost of
  selling. A user watching that number fall three times needs to be told why each
  time. → Named in the PR body, as PART 6 already requires for its own correction.
- **The monotonicity behind Decision 1 is an assumption a future change could
  break.** A cost component allowed to go negative — a rebate, a success-fee
  credit — would make "missing costs can only lower profit" false and the
  asymmetric verdict unsound. → Written into the spec as a non-negativity
  requirement rather than left implicit, so a future change has to argue with it.
- **Quantisation means break-even is zero to the cent, not to the atom.** At
  `393617.02` the profit is `−0.0012` before quantisation. → The spec says "zero
  when rounded to the cent"; the test asserts the quantised figure, not an exact
  `Decimal("0")`.
- **The grid is the most confident-looking object on the screen** — the
  proposal's own warning. → Three defences: it carries the incomplete-cost-base
  marking like every other figure, no cell can show a met-threshold emphasis
  while the verdict is withheld, and the base cell must equal the headline.
- **A four-column grid of mono figures inside a 258px-sidebar layout is tight,
  and Portuguese runs 20–30% longer than English** — PART 1's standing risk. →
  The spec requires the grid to scroll within its own bounds; check both locales
  at 1280px.
- **PART 5 may redefine the works forecast.** Its line items introduce a
  forecast-at-completion that supersedes `total_forecast`. → The works axis is
  specified as "the works figure the summary reports as the forecast", so it
  follows the definition rather than pinning today's.
- **Archive ordering.** `validate --strict` reports the change valid and raises
  two INFOs. The first: *"frontend-expenses MODIFIED failed for header '### Requirement: The
  profit view states the deal's arithmetic' — not found"*. That is expected and
  correct for this sequencing. The capability's main spec does exist
  (`openspec/specs/frontend-expenses/spec.md`), so this is not the
  target-spec-missing case; the *requirement* is missing from it because PART 1
  authors that requirement and has not archived yet. This delta copies the text
  from PART 1's own delta, as the delta's blockquote states. → Do not restructure
  the delta to silence it. It resolves when PART 1 archives, and this change must
  archive after PARTs 1, 2, 6 and 7 in any case.
  The second: *"budget-summary: target spec does not exist"*. That capability is
  authored by PART 1 and has no main spec until PART 1 archives, so a MODIFIED
  against it cannot resolve yet. Also expected and correct — every sibling delta
  on this capability raises the same one — and it clears on the same event.

## Migration Plan

1. **No existing file changes shape.** Two new per-deal files appear under the
   PART 2 layout — `deals/<deal_id>/deal_maths.json` (exit costs and the minimum
   margin) and `deals/<deal_id>/scenarios.json` — written through the existing
   `JsonStore` (`repositories/json_store.py:10-40`) with its atomic
   temp-file-then-`os.replace` guarantee untouched. Adding files is not a change
   to the on-disk format of existing ones, so the human-review-before-a-storage
   -change rule is not tripped by that alone; the task list flags it for
   confirmation rather than assuming it.
2. **Backend first, green on its own:** models, repositories, the maths service,
   then the routes. The service is where every figure is derived, so the solve
   for break-even and the required price is covered by pytest before any pixel
   depends on it.
3. **Frontend second:** the API client, then the disclosure, the callout, the
   grid and the scenario switcher — in that order, because the disclosure is what
   makes the rest safe to render.
4. **Rollback** is deleting the two files and reverting the profit correction.
   Nothing is transformed, so nothing needs converting back; the visible effect
   of a rollback is the projected profit rising by the cost of selling.
