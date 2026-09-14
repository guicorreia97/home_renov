# Proposal: Line-item budgeting — orçamento, comprometido, faturado, desvio

> **PART 5 of 8. Fully planned** — `design.md`, the three delta specs and
> `tasks.md` are written. Assumes **PART 1** (`redesign-flip-desk-skin`),
> **PART 2** (`add-deal-and-property`) and **PART 3** (`add-works-phases`) have
> archived: server-side derived totals, the `deal_id` spine, and the phases a
> rubrica lives in. Does **not** assume **PART 4** (`add-contractors`) — the
> contractor here is free text, which PART 4 migrates alongside `Expense.payee`.
>
> The `phases` delta adds requirements rather than modifying PART 3's, because
> PART 3's own text invites it: its phase budget is user-recorded "in this
> change", and "a later change MAY derive it from a finer-grained record
> instead". This is that later change, and the finer-grained record is the line
> item. See `design.md` — Risks.

## Why

This is the heart of the mockup and the thing the current model cannot express.
Tab 1's table carries seven columns — `RUBRICA · EMPREITEIRO · ORÇAMENTO ·
COMPROMETIDO · FATURADO · DESVIO · ESTADO` — and a caption that states the
distinction plainly: *"Comprometido = adjudicado, ainda não faturado"*.

Today an expense has **one amount and one status**
(`backend/app/src/models/expense.py:37-46`: PLANNED, PENDING, PAID). PART 1
makes the best of that by putting each line's single amount into whichever of
three columns its status selects — honest, but it is not the same thing. What is
budgeted for a rubrica, what has been awarded to a contractor for it, and what
has actually been invoiced are three independent quantities that coexist, and
the whole point of the table is watching them diverge.

Without them there is no `DESVIO`, no forecast-at-completion, and no version of
the mockup's callout: *"Estimativa final … acima do orçamento … O desvio sai
directamente do lucro."* Overruns are found at the end instead of during.

## What Changes

- **New `LineItem` (rubrica) model** inside a phase: name, contractor, status,
  and **two** recorded amounts — budgeted (*orçamento*, the plan) and awarded
  (*adjudicado*, the obligation). The committed and invoiced columns are
  **derived**, not stored: see `design.md` Decisions 1 and 7. Status is the
  mockup's own four values — `Não adjudicado` / `Adjudicado` / `Em curso` /
  `Fechado` (`Flip Desk.dc.html:519-523`).
- **`Expense` attaches to a line item**, so invoiced amounts roll up from real
  payments rather than being typed twice.
- **Variance and forecast computed server-side** — per line, per phase and per
  deal, in `Decimal`, per `frontend-expenses`' rule that the browser never
  recalculates a total. Forecast-at-completion is `max(budgeted, awarded,
  invoiced)` while a line is open and `invoiced` once it is closed, summed **per
  line** rather than per phase; variance is reported twice, as a settled fact and
  as a forecast. `design.md` Decisions 3, 4 and 5 settle the rule and show why
  the per-phase form hides a real overrun.
- **Frontend**: tab 1 gets its real seven columns, group subtotals become
  budget-vs-actual, and the overrun callout is driven by the largest-variance
  phases rather than by the `over_budget` flag alone.

## Capabilities

**New:** `line-item-budgeting` — what a rubrica is, the three money columns and
what each means, how variance and forecast are derived.

**Modified:** `frontend-expenses` (the table's whole shape), `phases` (rollups
gain a budget basis — added as new requirements, scoped to where a phase's
budget figure comes from, because PART 3's own requirement already invites a
later change to derive it from a finer-grained record), `budget-summary` (the
summary gains the nested `works_budget` object and its `outstanding_commitment`
figure; the four existing spend totals are pinned to their current names,
meanings and values; and the reconciliation between the two vocabularies is
stated where both sides of it live).

The deal-level works totals surface through `GET /deals/{id}/budget/summary`,
and this change declares that contract rather than leaving it implied:
`specs/budget-summary/spec.md` fixes the field names, their home and their wire
shape, while the arithmetic behind them stays in `line-item-budgeting`, where it
is line-item arithmetic. Neither delta states the other's half.

## Impact

Largest backend change after PART 2. New model, repository, service, routes; a
real change to how `BudgetSummary` is computed
(`backend/app/src/services/budget_service.py`). Significant test coverage — the
variance arithmetic is the kind that is wrong in a way tests catch and eyes
don't.

## Deletes from PART 1

The PLANEADO/COMPROMETIDO/PAGO-by-status columns — "each expense SHALL show its
amount in the column matching its status" — and the grand-total-only variance.
With per-line budgets, a line's three money figures coexist instead of one
amount choosing a column.

PART 1's `design.md` Decision 6 is **not** deleted: it decides that derived
totals are computed server-side rather than in the browser, which this change
depends on and extends. (The stub proposal described it as "a client-side
grouping workaround"; that is a misreading of the file, and nothing in Decision 6
is undone here.)
