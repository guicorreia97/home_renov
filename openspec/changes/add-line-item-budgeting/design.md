# Design: Line-item budgeting

## Context

See `proposal.md` — Why. The constraints that shape the approach:

- **"Committed" is already taken, and it means something else.**
  `BudgetSummary.total_committed` is `total_paid + total_pending`
  (`backend/app/src/services/budget_service.py:41-44`), documented as "Paid plus
  invoiced-but-unpaid" (`backend/app/src/models/budget.py:52`) and as "Committed
  spend is PENDING + PAID" (`backend/app/src/models/expense.py:41-45`).
  `_by_category` applies the same exclusion of PLANNED
  (`budget_service.py:98-108`) while `total_forecast` includes it. The mockup's
  COMPROMETIDO column is a different quantity entirely — see Decision 2.
- **The mockup defines the vocabulary and the arithmetic.** Its caption states
  the rule outright — *"Comprometido = adjudicado, ainda não faturado"*
  (`Home_Renovation_looks_PT-PT/Flip Desk.dc.html:142`) — and its KPI subtitle
  repeats it: COMPROMETIDO is *"adjudicado, por faturar"* (`:554`). Its seven
  columns are at `:146-147`, its line data at `:392-410`, and its forecast rule
  at `:465-468`.
- **Money is a `Decimal` server-side and a string on the wire**
  (`backend/app/src/models/money.py:1-20`), and the client is forbidden
  arithmetic on it (`openspec/specs/frontend-expenses/spec.md:65-79`,
  `frontend/src/types/money.ts`). Every figure in this change is arithmetic over
  money, so every figure in this change is server-side. PART 1's `design.md`
  Decision 6 already settled this argument; nothing here relitigates it.
- **`Expense` has one amount and one status** (`expense.py:49-63`, `:37-46`).
  That is the model this change outgrows: budgeted, awarded and invoiced are
  three quantities that coexist on one piece of work, and no arrangement of a
  single amount across three statuses expresses them.
- **PART 3 left this change exactly one question to answer.** Its requirement
  *Each phase carries its own budget, and the gap is reported* records the phase
  budget against the phase "in this change", and says in terms that "a later
  change MAY derive it from a finer-grained record instead", while insisting its
  deal-versus-phase allocation rules hold either way. The finer-grained record is
  the line item, and the `phases` delta here answers that one question and
  nothing else.
- **PART 4 had written no spec when this was planned.** It authors `contractors`;
  this change does not depend on its text — see Decision 8.

## Goals / Non-Goals

**Goals:**
- Four words — *orçamento*, *adjudicado*, *faturado*, *comprometido* — each with
  exactly one definition, written down, and one place that computes it.
- A variance that is a fact when it is a fact and a forecast when it is a
  forecast, never a blend of the two presented as either.
- The existing `total_committed` keeps its meaning and its value, so no consumer
  of `GET /budget/summary` silently changes behaviour.
- Every figure derived in `Decimal` on the server; the client formats what it is
  given.
- An overrun visible while it can still be acted on, per phase, rather than
  discovered at the end.

**Non-Goals:**
- Contractor records. The contractor on a line item is free text here; PART 4
  turns it into a record (Decision 8).
- Acquisition costs, financing, exit costs or the sensitivity grid — PARTs 6, 7
  and 8.
- Removing `ExpenseStatus.PLANNED`. It becomes largely vestigial for works
  expenses (Decision 9) but nothing in this change deletes it.
- Any change to how `Money` is represented, quantised or transported.
- Earned-value progress measurement. Percent executed stays the judgement a user
  records; see the `phases` delta.

## Decisions

### 1. Store the award, derive the committed balance

A line item records `awarded_amount`. The committed figure the table shows is
derived as `max(awarded − invoiced, 0)`.

The mockup's data does the opposite: its rows store *comprometido* directly
(`Flip Desk.dc.html:392-410`, e.g. `['p5', 'Cozinha…', …, 7500, 2100, 5400, 'Em
curso']` — budget 7500, committed 2100, invoiced 5400). The award is implicit;
it is `committed + invoiced = 7500`. That works for a static mockup and fails in
a live system: every invoice that lands has to be matched by a manual decrement
of the committed figure, and the day somebody forgets, the column quietly
overstates the outstanding obligation with nothing to detect it. Storing the
award instead makes the committed balance impossible to get wrong — it falls out
of two numbers that are each maintained for their own reasons.

**Rejected:** storing `committed` as the mockup does. Two maintained figures for
one quantity, with drift as the failure mode and no reconciliation that would
catch it.

**Rejected:** deriving the award from `committed + invoiced`. Same information,
but it makes the *stored* number the one that decays and the *derived* number
the stable one, which is backwards.

### 2. The name collision is resolved by nesting, not by renaming

The codebase's "committed" (PENDING + PAID) is the mockup's **faturado**. The
mockup's **comprometido** is a quantity this codebase has never had. Both need
to be exposed at once.

**Chosen:** `BudgetSummary` keeps `total_paid`, `total_committed`,
`total_planned` and `total_forecast` with their current names, meanings and
values, and gains a nested `works_budget` object carrying the line-item figures:
`budgeted`, `awarded`, `invoiced`, `outstanding_commitment`, `forecast`,
`forecast_variance`, `settled_variance`, `unassigned_invoiced` and
`percent_invoiced`. Nesting means no field collides, and a reader can see at a
glance which vocabulary a figure belongs to.

The new field is `outstanding_commitment`, not `committed`. The word "committed"
is not used for a new field anywhere in the backend; the Portuguese UI label
stays COMPROMETIDO, with the mockup's caption rendered beside it, because that
is what the user reads and the caption is what disambiguates it.

The two vocabularies meet at exactly one reconciliation, and it is specified and
tested: `works_budget.invoiced + works_budget.unassigned_invoiced` equals
`total_committed`. That equation is the proof that nothing has been
double-counted or lost.

**Rejected:** renaming `total_committed` to `total_invoiced`. It is the honest
name, and it is a breaking change to a field PART 1's delta and
`frontend/src/types/budget.ts:47-49` already consume, for a cosmetic gain. It
also violates the instruction not to quietly redefine an existing meaning — a
rename is the loudest possible redefinition.

**Rejected:** flat fields with disambiguating prefixes
(`works_outstanding_commitment`, …). Nine prefixed fields on an already
fourteen-field model, with nothing grouping them.

### 3. The forecast at completion is the worst of plan, obligation and fact

`forecast = max(budgeted, awarded, invoiced)` while a line is open, and
`forecast = invoiced` once it is closed.

The open-line form is equivalent to the mockup's `max(budget, actual +
committed)` (`Flip Desk.dc.html:465-468`), because `invoiced + committed` is
`max(awarded, invoiced)` by Decision 1's definition. Stating it as a
three-way max is the same rule written so that each term has a reason: you will
pay at least what you agreed, at least what has already been billed, and you
have no evidence yet that you will beat the plan.

The closed branch is the one that matters most and is easiest to drop. Without
it, every finished line is pinned to its budget forever and the deal's cost is
permanently overstated: the mockup's first phase, budgeted 3.720 € and invoiced
3.720 €, would be fine, but its opening line — budgeted 1.200 €, invoiced
1.120 € — would forecast 1.200 € for work that is over and cost 1.120 €.

**Rejected:** `invoiced + outstanding_commitment` alone. It forecasts zero for
every line nobody has awarded yet — the mockup's two *Não adjudicado* rows and
the whole of phase 7 — so a deal's forecast would fall as work was planned and
rise as it was awarded. That is the exact failure the panel exists to prevent.

**Rejected:** `max(budgeted, awarded)`, ignoring invoiced. It hides overbilling:
the mockup's water-and-drainage line was budgeted 4.300 € and billed 4.980 €,
and this rule would forecast 4.300 €.

**Rejected:** earned value, `budgeted ÷ percent_complete`. It needs a per-line
progress percentage nobody maintains, and it is numerically violent at low
percentages — a line 5% done forecasts twenty times its budget.

### 4. The forecast is summed per line, not per phase — a deliberate divergence

The mockup applies its forecast rule at **phase** level: it sums a phase's
budget, invoiced and committed, then takes the max
(`Flip Desk.dc.html:465-468`). This change applies the rule per **line item**
and sums the results.

The two disagree, because the sum of maxima is never less than the max of sums.
Worked from the mockup's own phase 4 data (`:398-399`):

| | budgeted | awarded | invoiced | line forecast |
|---|---|---|---|---|
| Estuque projetado | 3 800 | 2 850 | 2 150 | **3 800** |
| Pintura interior | 2 700 | 2 750 | 1 250 | **2 750** |
| phase total | 6 500 | 5 600 | 3 400 | **6 550** |

The mockup's phase-level rule gives `max(6 500, 3 400 + 2 200) = 6 500`. The
per-line rule gives 6 550. The 50 € difference is the amount by which the
painting line's award already exceeds its own budget — and the phase-level rule
lets the plastering line's unspent slack absorb it, so a known, signed overrun
disappears from the forecast. Across the whole mockup dataset this moves the
deal forecast from 51 750 € to 51 800 €.

**Chosen:** per-line. A committed overrun on one line is a real obligation and
must not be netted against an unstarted line's optimism.

**Rejected:** matching the mockup exactly. The mockup is a picture and its rule
is a convenience; this is the figure the callout uses to tell a user their
margin is gone.

### 5. Two variances, and a sign convention that is stated rather than assumed

`settled_variance = invoiced − budgeted`, reported **only for a closed line**.
`forecast_variance = forecast − budgeted`, always reported.

The mockup already does this, and it is the subtlest thing in the whole file:
line variance is shown only when the row's status is `Fechado` and phase
variance only when the phase is 100% executed, otherwise a dash
(`Flip Desk.dc.html:534`, `:542`); the deal-level total falls back to
`worksForecast − worksBudget` labelled `est.` (`:682`). The reason is that
`invoiced − budgeted` on unfinished work is not a variance — it is the portion
of the budget not yet billed, and it reads as a saving on every line that has
merely not been invoiced yet. A table that shows "−2 100 €" against a kitchen
that is 72% billed and heading for its full budget is actively misleading.

**Positive means over budget.** This is the opposite of `remaining_budget`
(`planned_budget − total_forecast`, `budget.py:55-57`), where positive means
money left. Both conventions are correct in their own terms and both are kept;
the mitigation is that each is named for what it is and the specs pin both signs
with scenarios, so no shared formatter can assume one.

**Rejected:** one variance field that silently switches basis between settled
and forecast depending on status. The reader cannot tell which they are looking
at, which is the entire problem.

**Rejected:** always reporting `invoiced − budgeted`. Simpler, and wrong in the
direction that loses money quietly.

### 6. Line items hang flat under the deal, with the phase as an attribute

Routes are `/deals/{deal_id}/line-items`, with `phase_id` a required field on
the line item rather than a path segment.

PART 2's Decision 1 establishes the deal as a path prefix because the deal is
part of a record's identity. The phase is not: reassigning a rubrica from
*Estuques* to *Pintura* is an ordinary edit, and under
`/deals/{d}/phases/{p}/line-items/{id}` it becomes a delete-and-recreate that
destroys the identifier and every expense attached to it. Storage follows the
same shape — `data/<env>/deals/<deal_id>/line_items.json`, one more file beside
`expenses.json` and `budget.json`, through the existing `JsonStore` with its
atomic temp-file-then-`os.replace` write (`json_store.py:10-40`).

**Rejected:** nesting under the phase. Makes the commonest edit destructive, and
forces a client holding a line-item id to also know its phase before it can
fetch it.

**Rejected:** a query parameter `?phase_id=`. It is a filter, and filtering is
what it should be used for — but it would leave the phase optional on writes,
and a line item with no phase has nowhere to roll up to.

### 7. Invoiced is derived from expenses on every read, never stored

A line item's invoiced amount is computed by summing the attached expenses whose
status is PENDING or PAID, at read time, in the service.

**Rejected:** a stored `invoiced_amount` maintained on every expense write. Two
sources of truth for one number, kept in step by remembering to update one of
them in five places (create, update, delete, attach, detach). The failure is
silent drift, and the only thing that would catch it is the reconciliation this
design would then have to add anyway.

The read cost is a full scan of the deal's expenses per summary request. That is
the same O(n) whole-file read the persistence guide already mandates and
explicitly tells us not to optimise ("do not build an index or a cache to avoid
it", `docs/persistence-guide.md:47-48`), at a scale of a few hundred expenses
per deal.

### 8. The contractor stays free text until PART 4 migrates it

`LineItem.contractor_name` is `str | None`, capped at 120 characters to match
`Expense.payee` (`expense.py:58`).

PART 4 is explicitly independent of this one, so PART 5 cannot require it. A
`contractor_id` foreign key with no contractor records behind it produces an
empty EMPREITEIRO column, and PART 1's Decision 4 — a panel the API cannot feed
is not built — rules that out. Free text also handles the mockup's own case
honestly: two of its rows name the contractor *"A definir"* (`:409-410`).

PART 4's proposal already commits to migrating free-text `payee` values into
contractor records by exact-match dedupe. This adds one more free-text column to
that same migration, which is a known, small addition rather than a surprise —
and it is written down as a task here so PART 4 inherits it rather than
discovering it.

### 9. No backfill, and unattached spend gets its own row

Nothing infers a line item for an existing expense. Every deal that upgrades to
this change starts with zero line items and every expense unattached.

That is a correct state, but it renders as a catastrophe unless it is handled:
the budget tab would show a total of 0 € beside a ledger showing 36 750 €. So
the deal's works figures carry `unassigned_invoiced` and the table shows it in
its own row with the action that attaches it. The reconciliation in Decision 2
makes this testable rather than a matter of remembering.

**Rejected:** inferring line items from `ExpenseCategory` or `room`. It would
manufacture rubricas nobody wrote, each with a budget equal to whatever was
already spent on it, so every inferred line would show a variance of exactly
zero. That is mock data wearing a migration's clothes, and PART 1's Decision 4
is explicit about it.

**Rejected:** a single "Unassigned" pseudo-phase holding auto-created line items.
Same objection, plus a phantom phase in PART 3's sidebar.

### 10. Status is set by the user and never inferred from the money

`LineItemStatus` is `NOT_AWARDED` / `AWARDED` / `IN_PROGRESS` / `CLOSED`, taken
from the mockup's four styled values (`Flip Desk.dc.html:519-523`: `Não
adjudicado`, `Adjudicado`, `Em curso`, `Fechado`).

Inference is tempting — award something and it is awarded, invoice something and
it is in progress — and it breaks on the only transition that matters. Nothing
in the figures distinguishes "billed in full and finished" from "billed in full
and the snagging list is still open", and `CLOSED` is what unlocks the settled
variance and switches the forecast branch. Deriving it from the amounts would
make those figures depend circularly on themselves.

The one consistency rule worth enforcing is the contradiction a user creates by
accident: a line marked `NOT_AWARDED` may not carry a non-zero award.

## Risks / Trade-offs

- **The `phases` delta adds requirements rather than modifying PART 3's.** That
  is not a workaround for PART 3 being unwritten — its text explicitly
  accommodates a later change deriving the phase budget, so there is nothing to
  edit. The one place the two could have contradicted each other is an empty
  phase: PART 3 requires an uncosted phase to report its budget as **unset,
  never zero**, so that "not costed yet" and "costed at nothing" stay
  distinguishable. The `phases` delta here honours that — a phase with no line
  items reports an unset budget, while its invoiced and committed rollups are
  genuine `0.00` sums over an empty set.
- **The one INFO `openspec validate --strict` reports is expected and correct.**
  Observed verbatim:
  `frontend-expenses MODIFIED failed for header "### Requirement: The works
  budget view groups expenses by category" - not found`. That requirement is
  authored by **PART 1's** delta and does not exist in
  `openspec/specs/frontend-expenses/spec.md` yet, so archive would refuse this
  delta today. PART 1 archives first and the header resolves. **Do not silence it
  by restructuring the delta** — turning the MODIFIED into an ADDED would fork
  the requirement in two and lose PART 1's scenarios at archive.
- **PART 3 ships no `frontend-expenses` delta**, despite its proposal declaring
  one — it writes `phases` and `frontend-shell` only, moving the sidebar rail to
  phases there. → This change is therefore the sole editor of the budget-table
  requirement, and re-grouping that table from categories to phases lands here
  rather than being inherited. Worth confirming with PART 3 that the omission is
  deliberate and not an unwritten artifact.
- **PART 4's `payee` migration must also cover `contractor_name`.** → Decision 8,
  and a task.
- **The deal-level works totals surface through `GET /deals/{id}/budget/summary`,
  and this change now declares that capability.** `specs/budget-summary/spec.md`
  carries the contract — the nested object, its field names and wire shapes, the
  four totals that do not move, and the reconciliation between the two
  vocabularies — while the arithmetic stays in `line-item-budgeting`. Three
  things follow. **Its MODIFIED block draws a second expected INFO** from
  `openspec validate --strict`, for the same reason the `frontend-expenses` one
  does — observed verbatim: `Archive would refuse this delta: budget-summary:
  target spec does not exist`. PART 1 authors `budget-summary` and has not
  archived, so the target resolves when it does. **Do not silence it by
  restructuring the delta.** **PART 2 ships no `budget-summary` delta** despite
  moving the summary under `/deals/{deal_id}` (its `deals` delta requires that "a
  summary covers one deal only"), so the route correction inside PART 1's
  requirement lands here — the same situation as `frontend-expenses` and PART 3.
  And **PARTs 6, 7 and 8 each edit `BudgetSummary` too**; if they declare the
  capability as well, whichever archives after the first must rebase its copy of
  PART 1's requirement onto the archived text.
- **This adds a file to the on-disk format** (`line_items.json` per deal) and
  adds a nullable field to `Expense`. Under the agent loop that is
  **human review before merge**, alongside PART 2's directory move.
- **`ExpenseStatus.PLANNED` becomes vestigial for works spend.** With a budget on
  the line item, a planned expense is a second, weaker way to say the same thing,
  and it is excluded from every line-item figure. → Nothing is deleted here, but
  it is worth a decision in a later PART rather than leaving two mechanisms with
  overlapping meanings indefinitely.
- **Seven money columns at the design system's 11px mono floor.** PART 1's
  `design.md` Decision 2 permits 11px only for uppercase letterspaced mono
  micro-labels and keeps the 4.5:1 contrast rule intact; the mockup's own table
  needs a 880px minimum width and scrolls below it. → Check both locales at
  1280px; Portuguese runs 20–30% longer and COMPROMETIDO is the longest heading
  in the table.

## Migration Plan

1. **`feat/line-item-model`** — `LineItem`, `LineItemStatus`, the repository and
   its JSON implementation, `Expense.line_item_id`. Green on its own; no figure
   is derived yet.
2. **`feat/line-item-arithmetic`** — committed, forecast, both variances, the
   phase and deal rollups, `unassigned_invoiced`, and the reconciliation test.
   This is where the change can be wrong in a way only tests catch, so it is
   its own branch and its own review.
3. **`feat/line-item-routes`** — CRUD under `/deals/{deal_id}/line-items`,
   attach and detach on expenses, the nested `works_budget` on the summary.
4. **`feat/rubrica-table`** — the seven-column table, the unattached row, the
   driver-named overrun callout, both locales.

Rollback is removing `line_items.json` and the nullable `line_item_id`; nothing
in this change rewrites an existing stored value, so no expense needs converting
back.
