# Tasks: The Flip Desk skin

Four branches, in order. Each ends at a green `make check` and is its own PR.
Groups 1–2 build the foundation (tokens, then the figures), 3–4 build the
surface. Nothing in 3 or 4 may compute a total.

Branch with `make branch NAME=feat/<slug>`. Every commit carries
`Change: redesign-flip-desk-skin`, and the trailer is repeated in each PR body.

## 1. `feat/flip-desk-tokens` — retokenise

- [ ] 1.1 Rewrite the palette, typography, spacing and shape sections of
      `docs/design-system-guide.md` to the values in `design.md` Decisions 1, 2,
      3 and 7 — the guide changes **first**, code mirrors it
- [ ] 1.2 Record the two deviations in the guide with their reasons: the 11px
      floor for uppercase mono micro-labels only, and the monochrome category
      ramp; verify the 4.5:1 contrast rule and the 40px target rule are stated
      as **unchanged**
- [ ] 1.3 Check every new token pair with a contrast checker; verify each clears
      4.5:1 and adjust the alpha — not the rule — if one does not
- [ ] 1.4 Swap the custom-property values in `frontend/src/index.css`; verify the
      `-soft` tokens that become real alpha no longer carry the comment
      explaining why they were precomputed blends
- [ ] 1.5 Update `frontend/tailwind.config.js`: `fontFamily.sans`, new
      `fontFamily.mono`, retuned `fontSize` roles, radii 12→10 and 8→7; verify
      the spacing scale is untouched
- [ ] 1.6 Swap the font `<link>` in `frontend/index.html`; verify no npm
      dependency was added
- [ ] 1.7 Apply `font-mono` to figures in `BudgetSummaryStrip.tsx`,
      `ExpenseRow.tsx` and `RemainingBudgetConclusion.tsx`; verify tabular
      alignment still holds in the table
- [ ] 1.8 Run the frontend suite **without editing a single test**; verify it
      passes. A failure here means something is coupled to a token value —
      report it rather than fixing the test

## 2. `feat/summary-derived-totals` — the figures, server-side

- [ ] 2.1 Extend `CategoryTotal` in `backend/app/src/models/budget.py` with
      `planned`, `pending`, `paid` and `share`; verify the existing `amount`
      keeps its committed-only meaning
- [ ] 2.2 Compute the breakdown in `budget_service.py`; verify a pytest asserts
      per-category `planned + pending + paid` sums to `total_forecast` **with a
      planned expense present** — the case that catches `by_category`'s
      exclusion of PLANNED
- [ ] 2.3 Add `share` of committed spend; verify a category with no committed
      spend reports `0` rather than dividing by zero
- [ ] 2.4 Add `margin_percent`, `return_on_cost_percent` and
      `break_even_sale_price` to `BudgetSummary`; verify each is `None` — never
      `0` — when its inputs are unset, matching `projected_profit`
- [ ] 2.5 Verify ratios are returned as numbers and money as decimal strings, so
      no formatter can render a percentage as currency
- [ ] 2.6 Verify a pytest covers `GET /budget/summary` returning every new field
      (rule 5: every endpoint has a test)
- [ ] 2.7 Mirror the new fields into `frontend/src/types/budget.ts`; verify
      ratios are typed `number | null` and money `Money | null`

## 3. `feat/flip-desk-shell` — sidebar, header, tabs

- [ ] 3.1 Create `frontend/src/features/shell/` with `AppShell`; render it from
      `App.tsx`; verify the healthcheck gate is unchanged and a failed
      healthcheck still draws no shell
- [ ] 3.2 Build `Sidebar` with the category rail from the summary; verify a test
      asserts selecting a row sets the **existing** `filters.category` state and
      that no second filter mechanism was introduced
- [ ] 3.3 Label the rail for categories, not phases; verify no string in the
      shell names a works phase
- [ ] 3.4 Add the sidebar footer — remaining budget and percent used on the
      documented thresholds; verify the no-budget case states its emptiness and
      offers the action that sets one
- [ ] 3.5 Build `DeskHeader` with the three assumptions, the over-budget pill
      and the two actions wired to the **existing** `BudgetSettingsModal` and
      `ExpenseFormModal`; verify an unset assumption never renders as zero
- [ ] 3.6 Build `TabNav`; verify the active tab is exposed as selected to
      assistive technology and that the category filter survives a tab switch
- [ ] 3.7 Verify both locales render the shell without clipping at 1280px —
      Portuguese runs 20–30% longer and the sidebar takes a fixed 258px

## 4. `feat/flip-desk-panels` — the three views

- [ ] 4.1 Build the works budget view: headline figures, expenses grouped by
      category, group subtotals and a grand total, all read from the summary;
      verify a test asserts no arithmetic is applied to a `Money` value
- [ ] 4.2 Place each expense's amount in the column matching its status; verify
      an expense appears in exactly one of planned, committed and paid
- [ ] 4.3 Add the overrun callout on the API's over-budget flag; verify it is
      absent when the flag is false
- [ ] 4.4 Restyle `ExpenseTable.tsx` into the ledger with the document reference
      and payment-method columns; verify the loading, error, empty and
      filtered-empty states and the row actions all still work
- [ ] 4.5 Verify an expense with no `invoice_reference` renders an explicit
      placeholder, not an empty cell
- [ ] 4.6 Build the profit view: headline figures, the waterfall ending in
      `projected_profit`, then margin, return on cost and break-even
- [ ] 4.7 Verify the no-target-sale-price case states its emptiness and shows no
      profit, margin or return figure in place of a zero
- [ ] 4.8 Verify a negative projected profit renders in the danger colour with
      its sign
- [ ] 4.9 Verify the filtered ledger's total comes from the API, not from
      summing the visible rows

## 5. Close out

- [ ] 5.1 Run `make check` from the repo root on each branch; verify it passes
      before the branch is pushed
- [ ] 5.2 Spawn the `reviewer` sub-agent on each branch diff before opening a PR
- [ ] 5.3 Walk the app by hand with `make run`: switch language, filter from the
      rail, open both modals, visit all three tabs
- [ ] 5.4 Clear `planned_budget` and `target_sale_price` via `PUT /budget`;
      verify every view degrades to a real sentence rather than a zero or blank
- [ ] 5.5 Archive the change with the `openspec-archive` skill once all four
      branches have landed
