## 1. Models

- [ ] 1.1 Add `Property` (address, locality, area m², typology `T0`–`T5+`, year
      built) to `backend/app/src/models/` and verify a pytest round-trips it
      through Pydantic with every field unset and with every field set
- [ ] 1.2 Add `DealStatus` as a closed enum covering evaluation, offer,
      acquisition, works, sale and closure, and verify an invalid value is
      rejected by a validation test
- [ ] 1.3 Add `Deal` (property, status, acquisition date, target exit date, works
      start date, planned duration in months) plus `DealCreate` / `DealUpdate`,
      and verify a deal validates with all dates unset
- [ ] 1.4 Delete the single-budget docstring at
      `backend/app/src/models/budget.py:19-29` and verify no occurrence of
      "exactly one budget" remains under `backend/app/`
- [ ] 1.5 Add the works-window progress figures (current month, planned
      duration) to the deal read model as integers, and verify month five of
      eight, an unset window (absent, not zero) and an overrun month nine of
      eight each return the specified shape

## 2. Storage and repositories

- [ ] 2.1 Add `DealRepository` protocol (`list`, `get`, `add`, `update`,
      `delete`) alongside the existing protocols and verify it type-checks under
      ruff `ANN`
- [ ] 2.2 Add `JsonDealRepository` writing `data/<env>/deals.json` through the
      existing `JsonStore`, and verify a pytest against `tmp_path` covers add,
      list, get, update and delete
- [ ] 2.3 Change `ExpenseRepository` and `BudgetRepository` so `deal_id` is the
      first parameter of every method, and verify `uv run ruff check` plus the
      type checker report no unadapted call site
- [ ] 2.4 Point the JSON expense and budget repositories at
      `data/<env>/deals/<deal_id>/`, and verify a test writing to two deals
      produces two directories whose contents do not overlap
- [ ] 2.5 Verify the atomic write is intact: a test asserting the temp-file
      -then-`os.replace` path in `json_store.py` is still the only writer
- [ ] 2.6 Implement deal deletion removing the deal's directory, and verify a
      test that deleting deal A leaves deal B's expenses and budget readable

## 3. Migration

- [ ] 3.1 Implement the startup migration: when a flat `expenses.json` or
      `budget.json` exists, create one deal with an unset property, move both
      files into its directory, remove the legacy paths
- [ ] 3.2 Verify with a test starting from a populated legacy store that every
      expense id, amount and timestamp is byte-identical afterwards
- [ ] 3.3 Verify idempotency with a test running the migration twice and
      asserting the second run changes nothing and creates no second deal
- [ ] 3.4 Verify a fresh install with no data creates no default deal
- [ ] 3.5 Verify the migration invents no address: a test asserting the created
      deal's property fields are unset rather than placeholder strings

## 4. Services

- [ ] 4.1 Add `DealService` over `DealRepository` (list, get, create, update,
      delete) raising a not-found error consistent with `ExpenseService`, and
      verify unit tests cover each path with a fake repository
- [ ] 4.2 Thread `deal_id` through `ExpenseService` and `BudgetService`, and
      verify existing service unit tests pass once adapted to the new signatures
- [ ] 4.3 Verify `BudgetService.summary()` covers one deal only, with a test
      placing expenses on two deals and asserting each summary's totals and
      per-category figures ignore the other
- [ ] 4.4 Verify no address, locality or other property detail is logged: a test
      asserting deal log records carry the id and no property content (rule 4)

## 5. Routes

- [ ] 5.1 Add the `/deals` router (list, create, get, update, delete) with
      Pydantic request and response models, and verify a pytest covers each
      endpoint including 404 on an unknown id
- [ ] 5.2 Move the three budget routes under `/deals/{deal_id}/budget…` and
      verify each returns 404 for an unknown deal rather than an empty budget
- [ ] 5.3 Move the five expense routes under `/deals/{deal_id}/expenses…` and
      verify a pytest that an expense of deal B requested through deal A is 404
- [ ] 5.4 Verify `/` and `/healthcheck` are unchanged by a test asserting both
      still respond without a deal

## 6. Backend suite

- [ ] 6.1 Extend the `client` fixture in `backend/tests/conftest.py` to create a
      deal and expose its id, so scoping lives in the fixture rather than in
      every test, and verify the full suite runs against it
- [ ] 6.2 Verify isolation end to end: a test creating two deals, writing
      expenses and budgets to both, and asserting every read is scoped
- [ ] 6.3 Verify `cd backend && uv run pytest` is green

## 7. Frontend — data layer

- [ ] 7.1 Add `frontend/src/api/deals.ts` and re-point `budget.ts` and
      `expenses.ts` at the deal-scoped paths, and verify the fetch-mocked tests
      assert the new URLs
- [ ] 7.2 Hold the selected deal in the route, and verify a test that a reload
      on a deal's URL restores that deal rather than the first one
- [ ] 7.3 Scope `useExpensesData` to the selected deal and make no request when
      none is selected, and verify tests for both
- [ ] 7.4 Refetch expenses, budget and summary on a deal switch, and verify a
      test that the previous deal's figures are not shown while loading
- [ ] 7.5 Discard a late response for a deselected deal, and verify a test
      resolving deal A's request after deal B is selected leaves deal B on screen

## 8. Frontend — shell

- [ ] 8.1 Add the sidebar deal destinations with address, status and a selected
      marker, and verify a Vitest covering selection and the empty state
- [ ] 8.2 Clear the category filter on a deal switch, and verify a test that the
      full ledger renders after switching
- [ ] 8.3 Add the create-deal action and its form, and verify a test that a deal
      is created and becomes selected
- [ ] 8.4 Extend the header with property identity and a status indicator
      carrying deal status and works progress, keeping the over-budget flag
      visible, and verify tests for a deal in works and a deal with no works
      window
- [ ] 8.5 Verify both locales render the new surface: a test under `en` and
      `pt-PT` asserting no untranslated key and no English copy in `pt-PT`

## 9. Documentation and harness

- [ ] 9.1 Update `docs/persistence-guide.md` for the per-deal directory layout
      and the startup migration, and verify `make harness-check` passes
- [ ] 9.2 Update `docs/backend-guide.md` for the deal-scoped route shape, and
      verify `make harness-check` passes
- [ ] 9.3 **Ask the user** before editing the single-property product line in
      `AGENTS.md`/`CLAUDE.md`; if they ask for it, make it its own commit
      touching nothing else (rule 8)

## 10. Gate

- [ ] 10.1 Verify `make check` is green — backend lint, format, secrets, pytest
      and the frontend gate
- [ ] 10.2 Run the `reviewer` sub-agent over the branch diff and resolve what it
      finds
- [ ] 10.3 Flag for human review before merge: this changes the storage layer and
      its on-disk format (agent-loop rule)
