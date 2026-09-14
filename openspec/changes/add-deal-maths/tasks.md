## 1. Models

- [ ] 1.1 Add `ExitCostKind` as a closed enum covering agency commission,
      capital-gains tax, early-repayment charge, legal and conveyancing,
      staging and other, and verify a validation test rejects a value outside it
- [ ] 1.2 Add `ExitCost` to `backend/app/src/models/` carrying a kind and either
      a fixed amount or a rate over a named base, and verify a pytest rejects a
      record carrying both and one carrying neither
- [ ] 1.3 Give the agency-commission kind a separate rate and VAT rate, and
      verify a test that `5%` with VAT `23%` on a sale price of `465000.00`
      yields `28597.50` and reports both rates as its basis (Decision 7)
- [ ] 1.4 Add `CostComponent` and a three-state coverage value — recorded, not
      applicable, not entered — covering purchase price, acquisition, works,
      financing and exit costs, and verify a test that the default state is
      `not entered` and never `not applicable` (Decision 2)
- [ ] 1.5 Add the per-deal threshold field for the minimum margin as an optional
      ratio with no default, and verify a test that an unset threshold reads as
      absent rather than as `20`
- [ ] 1.6 Add `Scenario` (name, assumed sale price, works basis) plus its create
      and update models, and verify a pytest round-trips one with only a sale
      price varied
- [ ] 1.7 Add the deal-maths response model — profit, margin, return, break-even,
      threshold figures, coverage, exit-cost breakdown and the grid — with money
      as `Money`/`SignedMoney` and every ratio as a real number, and verify a
      test asserting no ratio field is typed as `Money`
      (`app/src/models/money.py:1-20`, `models/budget.py:56` for the precedent)

## 2. Storage and repositories

- [ ] 2.1 Add the exit-cost and threshold repository protocol with `deal_id` as
      the first parameter of every method, matching PART 2's convention, and
      verify it type-checks under ruff `ANN`
- [ ] 2.2 Add the scenario repository protocol the same way, and verify the same
- [ ] 2.3 Implement both over `JsonStore` writing
      `data/<env>/deals/<deal_id>/deal_maths.json` and `scenarios.json`, and
      verify a `tmp_path` test covers read, write and the empty-store case
- [ ] 2.4 Verify isolation between deals with a test writing exit costs and
      scenarios to two deals and asserting neither reads the other's
- [ ] 2.5 Verify the atomic write is untouched: a test asserting the temp-file
      -then-`os.replace` path in `repositories/json_store.py:10-40` is still the
      only writer for the new files
- [ ] 2.6 Verify no existing file changes shape: a test asserting `budget.json`
      and `expenses.json` are byte-identical after exit costs are written

## 3. Cost base and coverage

- [ ] 3.1 Implement the cost-base assembly in a new deal-maths service over the
      acquisition (PART 6), financing (PART 7), budget and exit-cost
      repositories, and verify a unit test with fake repositories covers a
      complete base and a base missing each component in turn
- [ ] 3.2 Implement coverage reporting per component, and verify tests for the
      three states including the case that distinguishes an all-cash deal from
      one whose loan has not been entered (Decision 2)
- [ ] 3.3 Verify a not-entered component contributes nothing rather than a zero
      presented as a total, with a test asserting the reported component has no
      amount rather than `0.00`
- [ ] 3.4 Enforce non-negativity: reject any exit cost that would reduce the
      cost base, and verify a validation test — this is what Decision 1's
      asymmetry rests on
- [ ] 3.5 Subtract exit costs in the projected profit and verify a test that the
      figure falls by exactly the exit costs, with the old value asserted
      explicitly so the behaviour change is visible in the diff
- [ ] 3.6 Verify the two responses agree: a pytest requesting both the expense
      summary and the deal's maths and asserting `projected_profit` is identical
      (Decision 4, Risks)

## 4. Break-even, thresholds and the withheld verdict

- [ ] 4.1 Implement the break-even solve accounting for price-proportional exit
      costs, and verify with the worked example — a cost base of `370000.00`
      before exit costs and a commission of `6%` gives `393617.02`
- [ ] 4.2 Verify break-even by its property, not its formula: a test evaluating
      the deal at the reported price and asserting the projected profit is
      `0.00` when quantised (Decision 3)
- [ ] 4.3 Verify the naive answer is rejected: a test asserting the reported
      break-even differs from the cost base plus the commission computed at the
      target price
- [ ] 4.4 Implement the minimum-margin figures — margin achieved, shortfall in
      money, required sale price — and verify with the worked example: target
      `465000.00` gives profit `67100.00`, margin `14.43`, shortfall `25900.00`,
      required price `500000.00`
- [ ] 4.5 Verify the required price by its property: evaluating the deal at
      `500000.00` gives a margin of exactly `20`
- [ ] 4.6 Handle the unreachable threshold and the no-break-even case, and
      verify tests that each reports "no such price" rather than a very large
      number
- [ ] 4.7 Implement the asymmetric verdict, and verify three tests: a passing
      margin over an incomplete base reports no met-verdict, a failing margin
      over an incomplete base reports not-met, and a complete base reports in
      both directions (Decision 1)
- [ ] 4.8 Verify an unset threshold reports no verdict, no shortfall and no
      required price while still reporting the margin

## 5. Sensitivity and scenarios

- [ ] 5.1 Build the grid axes from the deal's own figures — sale prices spanning
      the target, works spanning budget, forecast and an overrun — and verify a
      test that both the budget and the forecast appear on the works axis
- [ ] 5.2 Compute every cell server-side over the same cost base as the headline,
      each carrying profit, margin and status, and verify a test that a cell
      below break-even is negative and carries its sign
- [ ] 5.3 Identify the base cell and verify the invariant: a test asserting its
      profit equals the deal's reported projected profit — the test that catches
      a grid computed over a different cost base (Decision 5)
- [ ] 5.4 Propagate the incomplete-cost-base marking to every cell and suppress
      met-threshold status across the grid when the verdict is withheld, and
      verify a test asserting no cell reports the threshold met
- [ ] 5.5 Implement scenario evaluation as an overlay, and verify a test that
      evaluating a scenario leaves the deal's stored budget, expenses, exit costs
      and threshold unchanged
- [ ] 5.6 Verify the base case is always reachable with a test returning to it
      after a scenario and asserting the deal's own figures are reported
- [ ] 5.7 Verify rule 4: a test asserting no log record from creating, evaluating
      or deleting a scenario carries the scenario name — identifiers and counts
      only

## 6. Routes

- [ ] 6.1 Add the exit-cost and threshold routes under `/deals/{deal_id}/…` with
      Pydantic request and response models, and verify a pytest covers each
      including 404 on an unknown deal
- [ ] 6.2 Add the scenario routes under `/deals/{deal_id}/scenarios`, and verify
      a pytest covers list, create, update, delete and 404 on an unknown deal
- [ ] 6.3 Add the deal-maths route returning the figures, coverage, breakdown and
      grid in one response, with an optional scenario selector, and verify a
      pytest covers the base case, a scenario, and an unknown scenario as 404
- [ ] 6.4 Verify the route handlers hold no arithmetic (rule 1): a reviewer pass
      plus a test that the service produces every figure the route returns

## 7. Backend suite

- [ ] 7.1 Extend `backend/tests/conftest.py` so the `client` fixture can seed a
      deal with a complete cost base and one with a missing component, and verify
      the suite runs against both without per-test literals
- [ ] 7.2 Verify the worked example end to end: one test asserting profit,
      margin, shortfall, required price, break-even and the base cell together,
      so the figures cannot drift apart silently
- [ ] 7.3 Verify `cd backend && uv run pytest` is green

## 8. Frontend — data layer

- [ ] 8.1 Add the deal-maths, exit-cost and scenario calls to `frontend/src/api/`
      — the only place `fetch` is called — and verify the fetch-mocked tests
      assert the deal-scoped URLs
- [ ] 8.2 Type every ratio as a number and every amount as `Money` (`string`) in
      the client types, and verify the build type-checks with no `Number()` or
      `parseFloat` applied to a `Money` value
- [ ] 8.3 Hold the active scenario alongside the selected deal, and verify a test
      that selecting a scenario issues no write request

## 9. Frontend — the Lucro tab

- [ ] 9.1 Render the cost-base disclosure beside the figures, naming each missing
      component and offering the action that fills it in, and verify tests for a
      missing component, an all-cash deal reading as complete, and no `0,00 €`
      standing in for a missing total
- [ ] 9.2 Extend the waterfall with the exit-cost deductions and the net-proceeds
      subtotal, showing each line's basis, and verify a test that the commission
      line shows its rate and VAT rate rather than only an amount
- [ ] 9.3 Render the minimum-margin callout from the returned figures only, and
      verify tests for below-threshold, no-threshold-set, and a withheld verdict
      showing no met-threshold indication of any kind
- [ ] 9.4 Render the sensitivity grid from the API, and verify tests that no cell
      is produced by arithmetic, that the base cell matches the headline, and
      that no cell carries met-threshold emphasis while the verdict is withheld
- [ ] 9.5 Add the scenario switcher, and verify tests that selecting one
      re-renders the sequence, headline, grid and callout, names the active
      scenario, and that returning to the base case restores the deal's figures
- [ ] 9.6 Keep the grid scrolling within its own bounds, and verify at 1280px in
      both `en` and `pt-PT` that the page does not scroll horizontally — the
      browser layout check, not an assertion about class names
- [ ] 9.7 Verify both locales render the new surface: a test under `en` and
      `pt-PT` asserting no untranslated key and no English copy in `pt-PT`
- [ ] 9.8 Verify the design system is followed with no new tokens
      (`docs/design-system-guide.md`, rule 7): cell emphasis reuses the existing
      status colours rather than introducing a scale

## 10. Documentation and harness

- [ ] 10.1 Update `docs/backend-guide.md` for the deal-maths route and the
      three-state coverage contract, and verify `make harness-check` passes
- [ ] 10.2 Update `docs/persistence-guide.md` for the two new per-deal files, and
      verify `make harness-check` passes
- [ ] 10.3 Extend `BudgetSummary` per the `budget-summary` delta — subtract exit
      costs in `projected_profit`, solve `break_even_sale_price` rather than
      adding the exit costs computed at the target price, and add the exit-cost
      total as its own figure — then mirror the fields into
      `frontend/src/types/budget.ts` with money as `Money` and ratios as
      `number`, and verify the three existing profit tests
      (`backend/tests/test_budget_service.py:154-183`) are updated to the new
      cost base rather than deleted (design.md Decision 10)
- [ ] 10.4 **Ask the user** to confirm the storage judgement before merge: this
      adds two per-deal files and changes no existing file's shape, so the
      human-review-before-a-storage-format-change rule is read as not tripped —
      confirm rather than assume
- [ ] 10.5 Re-copy `### Requirement: Profitability figures are derived from the
      targets` **immediately before archiving**: PARTs 5, 6 and 7 MODIFY the same
      requirement, a MODIFIED block replaces it whole, and this change archives
      last — so verify this delta's copy still carries PART 6's acquisition term
      and PART 7's finance term and absent-profit scenarios before it lands, or
      archiving silently reverts them (design.md Risks)

## 11. Gate

- [ ] 11.1 Verify `make check` is green — harness coherence, ruff lint, format,
      secret scan, pytest and the frontend gate
- [ ] 11.2 Run the `reviewer` sub-agent over the branch diff and resolve what it
      finds
- [ ] 11.3 Name the profit correction in the PR body: this is the third PART to
      lower the projected profit, and a user reading that number needs to be told
      it now carries the cost of selling (design.md Risks)
