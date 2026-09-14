# Tasks: Line-item budgeting

Four branches, in order, matching `design.md` — Migration Plan. Each ends at a
green `make check` and is its own PR. Group 2 is where this change can be wrong
in a way eyes do not catch, so nothing in groups 3 or 4 may compute a figure.

Branch with `make branch NAME=feat/<slug>`. Every commit carries
`Change: add-line-item-budgeting`, and the trailer is repeated in each PR body.

**Do not start before PART 3 (`add-works-phases`) has landed** — a line item
needs a phase to belong to.

## 1. `feat/line-item-model` — the record

- [ ] 1.1 Add `LineItemStatus` to `backend/app/src/models/` as a closed enum of
      not-awarded, awarded, in-progress and closed; verify a validation test
      rejects a value outside the set
- [ ] 1.2 Add `LineItem` plus `LineItemCreate` / `LineItemUpdate` with name,
      `phase_id`, `position`, `status`, `budgeted_amount` (`Money`),
      `awarded_amount` (`Money`, default `0`), `contractor_name`
      (`str | None`, max 120 to match `Expense.payee` at `expense.py:58`) and
      `notes`; verify a pytest round-trips one with every optional field unset
      and with every field set
- [ ] 1.3 Reject a non-zero `awarded_amount` on a line item whose status is
      not-awarded; verify a test asserts the validation error and that the
      stored record is unchanged
- [ ] 1.4 Reject any attempt to set an invoiced amount through the write models;
      verify a test posting `invoiced_amount` is refused rather than ignored
      (`extra="forbid"` is already the convention on `ExpenseCreate`)
- [ ] 1.5 Add `line_item_id: str | None` to `Expense`, `ExpenseCreate` and
      `ExpenseUpdate`; verify existing stored expenses without the field still
      load, so no migration of `expenses.json` is needed
- [ ] 1.6 Add a `LineItemRepository` protocol beside the existing ones, with
      `deal_id` as the first parameter of every method per PART 2's Decision 3;
      verify it type-checks under ruff `ANN`
- [ ] 1.7 Add `JsonLineItemRepository` writing
      `data/<env>/deals/<deal_id>/line_items.json` through the existing
      `JsonStore`; verify a `tmp_path` pytest covers add, list, get, update and
      delete, and that two deals produce two non-overlapping files
- [ ] 1.8 Verify the atomic write is untouched: a test asserting
      `json_store.py`'s temp-file-then-`os.replace` path is still the only writer

## 2. `feat/line-item-arithmetic` — the figures

- [ ] 2.1 Derive `invoiced_amount` per line item as the sum of attached expenses
      with status PENDING or PAID; verify a test with a paid, a pending and a
      planned expense on one line reports only the first two
- [ ] 2.2 Derive `outstanding_commitment` as `max(awarded − invoiced, 0)`;
      verify tests for awarded-nothing-billed, partly billed, fully billed
      (`0.00`, not negative) and billed-beyond-the-award
- [ ] 2.3 Verify committed and invoiced never double-count: a test asserting
      `outstanding_commitment + invoiced == max(awarded, invoiced)` across the
      four cases above
- [ ] 2.4 Derive `forecast_amount` as `max(budgeted, awarded, invoiced)` for an
      open line and `invoiced` for a closed one; verify a test per branch,
      including the unawarded line that must forecast its budget rather than zero
      and the closed line that came in under budget
- [ ] 2.5 Derive `settled_variance` as `invoiced − budgeted` **only** when the
      line is closed, and `None` otherwise; verify a test that an open line
      billed below its budget reports no variance rather than a saving
- [ ] 2.6 Derive `forecast_variance` as `forecast − budgeted`, always present;
      verify a test that an open line awarded above its budget reports a
      positive variance while its settled variance is still `None`
- [ ] 2.7 Verify the sign convention in both directions: a test pinning a closed
      over-budget line to a positive variance and a closed under-budget line to
      a negative one, and asserting `remaining_budget` keeps its opposite
      convention on the same deal
- [ ] 2.8 Roll the seven figures up per phase and per deal by **summing the
      per-line values**; verify the worked example from `design.md` Decision 4 —
      lines budgeted `3800.00`/`2700.00` with awards `2850.00`/`2750.00`
      forecast `6550.00`, not `6500.00`
- [ ] 2.9 Report a phase or deal `settled_variance` only when every line in it is
      closed; verify a test with one closed and one in-progress line reports
      `None` while still reporting the forecast variance
- [ ] 2.10 Add `percent_invoiced` as a number, `None` when budgeted is zero;
      verify it is not a money string and that the zero-budget case does not
      divide by zero, matching `_used_percent`'s existing guard
      (`budget_service.py:78-82`)
- [ ] 2.11 Add `unassigned_invoiced` — the PENDING+PAID total of expenses with no
      `line_item_id`; verify a test on a deal with expenses and no line items
      reports `0.00` line-item invoiced and the full amount unassigned
- [ ] 2.12 **Verify the reconciliation** that proves nothing is lost or
      double-counted: a test asserting
      `works_budget.invoiced + works_budget.unassigned_invoiced == total_committed`
      on a deal with attached expenses, unattached expenses and at least one
      PLANNED expense present
- [ ] 2.13 Add the nested `works_budget` object to `BudgetSummary`; verify
      `total_paid`, `total_committed`, `total_planned` and `total_forecast` are
      **byte-identical** to their pre-change values on the same fixture — a
      regression test that pins Decision 2
- [ ] 2.14 Verify exactness survives aggregation: a test totalling `0.10` and
      `0.20` across two line items gives exactly `0.30`
- [ ] 2.15 Verify rule 4: a test asserting line-item log records carry
      identifiers and counts and no line-item name, contractor name or note

## 3. `feat/line-item-routes` — the API

- [ ] 3.1 Add the line-items router under `/deals/{deal_id}/line-items` (list,
      create, get, update, delete) with Pydantic request and response models;
      verify a pytest covers every endpoint (rule 5) including 404 on an unknown
      line item and on an unknown deal
- [ ] 3.2 Verify isolation: a test that a line item of deal B requested through
      deal A is 404, matching PART 2's rule that an unknown deal is never an
      implicit fallback
- [ ] 3.3 Support reassigning a line item to another phase in the same deal;
      verify a test that its id is unchanged, its attached expenses are still
      attached, and both phases' rollups move
- [ ] 3.4 Implement deletion as **detach, never cascade**; verify a test that
      deleting a line item with three attached expenses leaves all three stored
      with identifiers and amounts unchanged and reported as unassigned
- [ ] 3.5 Verify the deal's invoiced total is unchanged by a line-item deletion:
      a test asserting the attached-plus-unattached total before and after match
- [ ] 3.6 Attach and detach an expense through the existing expense routes;
      verify a test that attaching an expense to a line item in another deal is
      refused
- [ ] 3.7 Reject an expense recorded against a phase that disagrees with its line
      item's phase; verify a test asserting the request is refused rather than
      silently reassigned
- [ ] 3.8 Verify the summary route returns the nested `works_budget` with every
      field (rule 5), and that `/` and `/healthcheck` are unaffected
- [ ] 3.9 Verify the route handlers stay thin — no arithmetic in a handler, per
      rule 1 and `docs/backend-guide.md:26-28`
- [ ] 3.10 Update `docs/backend-guide.md` and `docs/persistence-guide.md` for the
      new route shape and the per-deal `line_items.json`; verify
      `make harness-check` passes

## 4. `feat/rubrica-table` — the seven columns

- [ ] 4.1 Mirror `LineItem` and the nested `works_budget` into
      `frontend/src/types/`; verify money is typed `Money | string` and ratios
      `number | null`, and that `settled_variance` is nullable so the open-line
      case cannot be forgotten
- [ ] 4.2 Add the line-items client in `frontend/src/api/`; verify the
      fetch-mocked tests assert the deal-scoped URLs and that `fetch` is called
      nowhere else
- [ ] 4.3 Build the seven-column table — rubrica, empreiteiro, orçamento,
      comprometido, faturado, desvio, estado — grouped by phase with per-group
      subtotals and a grand total; verify a test asserts no arithmetic is applied
      to any money value
- [ ] 4.4 Render the caption defining the committed column (*"Comprometido =
      adjudicado, ainda não faturado"*, `Flip Desk.dc.html:142`); verify it is
      catalogue copy in both locales, not a literal
- [ ] 4.5 Render an open line's withheld variance as an explicit placeholder;
      verify a test that it is not `0` and not the difference between the
      invoiced and budgeted cells
- [ ] 4.6 Verify the variance cell is API-driven: a test that changing only the
      API's variance field changes the rendered cell
- [ ] 4.7 Render explicit placeholders for a missing contractor and a zero
      committed balance; verify neither is an empty cell
- [ ] 4.8 Build the unattached-spend row with the action that attaches it; verify
      a test that a deal with expenses and no line items shows real spend rather
      than an empty table
- [ ] 4.9 Build the overrun callout naming the largest-forecast-variance phases
      with their forecast and budget; verify it is absent when the API reports no
      forecast overrun, and present when a phase is overrun while the deal-wide
      `over_budget` flag is false
- [ ] 4.10 Remove PART 1's amount-in-the-column-matching-its-status rendering and
      its grand-total-only variance; verify no component places an expense amount
      into a planned/committed/paid column any more
- [ ] 4.11 Verify both locales at 1280px: a test under `en` and `pt-PT` asserting
      no untranslated key, and a manual check that the 880px-minimum table
      scrolls rather than wrapping — COMPROMETIDO is the longest heading and
      Portuguese runs 20–30% longer
- [ ] 4.12 Verify the design system is respected: no new token, and 11px reserved
      for uppercase letterspaced mono column headers only, per PART 1's
      `design.md` Decision 2 and `docs/design-system-guide.md`

## 5. Cross-change coordination

- [ ] 5.1 Replace PART 3's user-recorded phase budget with the sum of the phase's
      line items — the derivation PART 3's own requirement invites ("a later
      change MAY derive it from a finer-grained record instead"); verify PART 3's
      deal-versus-phase rules still hold, including the signed unallocated figure
      and over-allocation being reported rather than refused
- [ ] 5.2 Verify an uncosted phase still reports its budget as **unset, never
      zero** (PART 3's "not costed yet" versus "costed at nothing"), while its
      invoiced and committed rollups report `0.00`
- [ ] 5.3 Hand **PART 4** the extra migration target: its free-text `payee`
      dedupe must also cover `LineItem.contractor_name` (`design.md` Decision 8)
- [ ] 5.4 Verify the implementation matches this change's `budget-summary` delta,
      which declares the contract those figures ship through: every field it
      names is present on `GET /deals/{deal_id}/budget/summary`, the four
      existing spend totals are unchanged (2.13), and the reconciliation it
      requires is the test written in 2.12

## 6. Gate

- [ ] 6.1 Verify `make check` is green on each branch before it is pushed —
      backend lint, format, secrets, pytest and the frontend gate
- [ ] 6.2 Run the `reviewer` sub-agent over each branch diff and resolve what it
      finds
- [ ] 6.3 Walk the app by hand with `make run`: create a phase, add rubricas,
      award one, attach an invoice, close it, and verify the desvio appears only
      at closure
- [ ] 6.4 Flag for human review before merge: this adds a file to the on-disk
      format (`line_items.json`) and a field to `Expense` (agent-loop rule)
- [ ] 6.5 Archive the change with the `openspec-archive` skill once all four
      branches have landed and PART 3 has archived
