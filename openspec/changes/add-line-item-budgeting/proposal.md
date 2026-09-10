# Proposal: Line-item budgeting — orçamento, comprometido, faturado, desvio

> **PART 5 of 8.** Stub — `design.md`, delta specs and `tasks.md` get written
> when this is picked up. **Depends on PART 3** (rubricas live inside phases)
> and benefits from PART 4.

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

- **New `LineItem` (rubrica) model** inside a phase: name, budgeted amount,
  committed amount, invoiced amount, contractor, status
  (`por adjudicar` / `adjudicado` / `em curso` / `concluído`).
- **`Expense` attaches to a line item**, so invoiced amounts roll up from real
  payments rather than being typed twice.
- **Variance and forecast computed server-side** — per line, per phase and per
  deal, in `Decimal`, per `frontend-expenses`' rule that the browser never
  recalculates a total. Forecast-at-completion is `max(budget, committed +
  invoiced)` or similar; the exact rule is the design question here.
- **Frontend**: tab 1 gets its real seven columns, group subtotals become
  budget-vs-actual, and the overrun callout is driven by the largest-variance
  phases rather than by the `over_budget` flag alone.

## Capabilities

**New:** `line-item-budgeting` — what a rubrica is, the three money columns and
what each means, how variance and forecast are derived.

**Modified:** `frontend-expenses` (the table's whole shape), `phases` (rollups
gain a budget basis).

## Impact

Largest backend change after PART 2. New model, repository, service, routes; a
real change to how `BudgetSummary` is computed
(`backend/app/src/services/budget_service.py`). Significant test coverage — the
variance arithmetic is the kind that is wrong in a way tests catch and eyes
don't.

## Deletes from PART 1

The PLANEADO/COMPROMETIDO/PAGO-by-status columns, the grand-total-only variance,
and `design.md` Decision 6's client-side grouping workaround — with per-line
budgets, rollups come from the server where the spec says they belong.
