## 1. Model

- [ ] 1.1 Add `AcquisitionCostKind` as a closed enum — transfer tax (IMT), stamp
      duty on the purchase, notary and deed, land registry, legal fees,
      buyer-side agency commission, other — and verify a pytest rejects a value
      outside the set
- [ ] 1.2 Add `AcquisitionCostState` with exactly two values, estimated and
      settled, and verify a pytest asserts the enum has two members so a third
      cannot be added without the test being changed deliberately
- [ ] 1.3 Add `AcquisitionCost` (kind, `PositiveMoney` amount, `incurred_on`,
      state, basis, document reference, counterparty, notes) plus
      `AcquisitionCostCreate` / `AcquisitionCostUpdate` following the
      `Expense` / `ExpenseCreate` / `ExpenseUpdate` shape
      (`backend/app/src/models/expense.py:49-88`), and verify a pytest
      round-trips one with only the required fields and one with all fields
- [ ] 1.4 Verify an amount of `0` or a negative amount is rejected by the
      `PositiveMoney` constraint, with a pytest asserting both
- [ ] 1.5 Verify the basis is stored verbatim: a pytest recording a basis
      containing a percentage, a `·` separator and non-ASCII text and asserting
      the stored value is byte-identical

## 2. Storage and repository

- [ ] 2.1 Add an `AcquisitionCostRepository` protocol with `deal_id` as the
      first parameter of every method, mirroring `ExpenseRepository`
      (`backend/app/src/repositories/expense_repository.py:10-21`), and verify
      `cd backend && uv run ruff check` passes with the `ANN` rules
- [ ] 2.2 Add the JSON implementation writing
      `data/<env>/deals/<deal_id>/acquisition_costs.json` through the existing
      `JsonStore`, and verify a pytest against `tmp_path` covers add, list, get,
      update and delete
- [ ] 2.3 Verify no `open()` or `json.load` is introduced outside
      `app/src/repositories/` (rule 2), by grepping the diff for both
- [ ] 2.4 Verify a deal with no acquisition costs reads as an empty list rather
      than raising, with a pytest against a deal whose file has never been
      written
- [ ] 2.5 Verify deleting a deal removes its acquisition costs with it, with a
      pytest that deal A's deletion leaves deal B's costs readable

## 3. Service and totals

- [ ] 3.1 Add `AcquisitionCostService` (list, get, create, update, delete)
      raising a not-found error consistent with `ExpenseService`
      (`backend/app/src/services/expense_service.py`), and verify unit tests
      cover each path against a fake repository
- [ ] 3.2 Compute the combined, settled and estimated totals in `Decimal` in
      `BudgetService`, and verify a pytest for the mixed case — settled
      `2680.00`, estimated `10205.00`, combined `12885.00`
- [ ] 3.3 Compute the per-kind breakdown in a stable order, omitting kinds with
      no cost, and verify a pytest that two legal-fee costs of `600.00` and
      `400.00` report `1000.00` once and that unused kinds are absent
- [ ] 3.4 Verify exactness: a pytest that `0.10` and `0.20` total exactly `0.30`
- [ ] 3.5 Verify a deal with no costs reports all three totals as zero rather
      than omitting them, with a pytest asserting the fields are present
- [ ] 3.6 Verify rule 4: a pytest asserting acquisition-cost log records carry
      the deal id, cost id and kind, and carry no basis, document reference,
      counterparty or note content

## 4. The profit correction

- [ ] 4.1 Subtract the combined acquisition total in `_projected_profit`
      (`backend/app/src/services/budget_service.py:85-95`), and verify a pytest
      that sale `465000.00`, purchase `280000.00`, forecast `50000.00` and
      acquisition `15125.00` yields `119875.00` and not `135000.00`
- [ ] 4.2 Add the acquisition total to `break_even_sale_price`, and verify a
      pytest that it is `345125.00` for those inputs **and** that setting the
      target sale price to exactly that figure makes the projected profit zero —
      the two assertions together are what stops the figures drifting apart
- [ ] 4.3 Verify `margin_percent` and `return_on_cost_percent` are computed from
      the corrected profit over the corrected cost base, with a pytest covering
      both
- [ ] 4.4 Verify no renovation figure moved: a pytest recording an acquisition
      cost and asserting `total_forecast`, `by_category`, `remaining_budget`,
      `budget_used_percent` and `over_budget` are unchanged
- [ ] 4.5 Verify the no-op case: a pytest that a deal with no acquisition cost
      recorded reports exactly the profit it reported before this change
- [ ] 4.6 Verify profit stays absent without a target sale price while the
      acquisition totals are still reported, with a pytest asserting both

## 5. Routes

- [ ] 5.1 Add the router under `/deals/{deal_id}/acquisition-costs` (list,
      create, get, update, delete) with Pydantic request and response models
      and no logic in the handlers (rules 1 and 3), and verify a pytest covers
      each endpoint
- [ ] 5.2 Verify an unknown deal is 404 rather than an empty list, with a pytest
      per endpoint
- [ ] 5.3 Verify cross-deal access is refused: a pytest requesting deal B's cost
      through deal A and asserting 404
- [ ] 5.4 Add the acquisition fields to the summary response and verify the
      existing `GET /deals/{deal_id}/budget/summary` pytest asserts them
- [ ] 5.5 Verify every new endpoint has a test (rule 5) by listing the new
      routes and matching each to a named pytest

## 6. Backend suite

- [ ] 6.1 Extend the `client` fixture in `backend/tests/conftest.py:13-20` only
      as far as the new routes need, and verify the existing 57 tests still pass
- [ ] 6.2 Verify `cd backend && uv run pytest` is green

## 7. Frontend — data layer

- [ ] 7.1 Add `frontend/src/api/acquisitionCosts.ts` as the only place the new
      endpoints are called (`frontend/src/api/` is the sole `fetch` site), and
      verify fetch-mocked tests assert the deal-scoped URLs
- [ ] 7.2 Add the acquisition fields to the summary and cost types with `Money`
      as `string` (`frontend/src/types/money.ts`), and verify the build
      type-checks via `make check-frontend`
- [ ] 7.3 Extend `useExpensesData` to load the costs for the selected deal, make
      no request when no deal is selected, and re-fetch both the costs and the
      summary after any acquisition mutation — verify a Vitest for each
- [ ] 7.4 Verify no client-side arithmetic on acquisition money: a Vitest that
      the card's heading total changes only with the API's returned total, plus
      a grep of the diff for `Number(`, `parseFloat` and `reduce` over amounts

## 8. Frontend — surface

- [ ] 8.1 Build the acquisition card — heading total, purchase-price subtitle,
      one row per cost with kind, basis and amount — following
      `docs/design-system-guide.md` and inventing no token (rule 7), and verify
      a Vitest renders three costs and asserts the rows
- [ ] 8.2 Add create, edit and delete for a cost, and verify Vitests for each,
      including that a create re-fetches the summary
- [ ] 8.3 Render the empty card state with its action and never a zero total,
      and verify a Vitest distinguishing it from a card with costs
- [ ] 8.4 Render an explicit placeholder for a missing document reference, and
      verify a Vitest asserting the cell is not empty
- [ ] 8.5 Add the acquisition line to the profit waterfall between the purchase
      price and the works forecast, stating the estimated portion, and verify
      Vitests for a settled-only deal, a mixed deal and a deal with none
      recorded
- [ ] 8.6 Add every new string to `messages.en.ts` and `messages.pt.ts` in
      European Portuguese, and verify `parity.test.ts` passes and a Vitest under
      both locales finds no untranslated key and no English copy under `pt-PT`
- [ ] 8.7 Verify both locales at 1280px with the sidebar present, per PART 1's
      Portuguese-length risk, and record what was checked

## 9. Documentation and spec reconciliation

- [ ] 9.1 Update `docs/backend-guide.md` for the acquisition-cost route and
      service shape, and verify `make harness-check` passes
- [ ] 9.2 Update `docs/persistence-guide.md` for the new per-deal collection,
      and verify `make harness-check` passes
- [ ] 9.3 Verify the archive needs no hand-amendment: the `budget-summary`
      delta MODIFIES PART 1's profitability requirement, so archiving rewrites
      the `break_even_sale_price` definition itself (design.md Decision 6).
      Confirm PART 1 archived first, so the MODIFIED block had a target, then
      grep `openspec/specs/` and find no `purchase_price + total_forecast`

## 10. Gate and review

- [ ] 10.1 Verify `make check` is green — harness coherence, ruff lint and
      format, secret scan, pytest and the frontend gate
- [ ] 10.2 Run the `reviewer` sub-agent over the branch diff and resolve what it
      finds
- [ ] 10.3 State the profit change in the PR body in plain words — the figure
      falls by exactly the acquisition total, and a deal with nothing recorded
      is unchanged — and verify the body says which figures moved
      (`projected_profit`, `break_even_sale_price`, `margin_percent`,
      `return_on_cost_percent`)
- [ ] 10.4 Flag for human review before merge: this adds a stored collection and
      changes the meaning of an existing figure
