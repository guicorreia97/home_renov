## 1. Models

- [ ] 1.1 Add `ContractorKind` as a closed enum distinguishing a party awarded
      works from a party goods are bought from, and verify an invalid value is
      rejected by a validation test
- [ ] 1.2 Add `Contractor` (name required, optional trade, phone, email, tax
      number, notes, kind, archived flag) plus `ContractorCreate` /
      `ContractorUpdate` to `backend/app/src/models/`, and verify a pytest
      round-trips it with only a name set and with every field set
- [ ] 1.3 Verify a blank or whitespace-only name is rejected, matching the
      `str_strip_whitespace` + `min_length=1` convention already used by
      `ExpenseCreate` (`backend/app/src/models/expense.py:52-58`)
- [ ] 1.4 Replace `payee` with `contractor_id` on `ExpenseCreate`,
      `ExpenseUpdate` and `Expense` (`expense.py:58`, `:75`), required on
      create, and verify no occurrence of `payee` remains under `backend/app/`
- [ ] 1.5 Add `ContractorTotal` mirroring `CategoryTotal`'s post-PART-1 shape —
      planned, pending, paid and a committed `amount` excluding planned — and
      verify a pytest pins each field's meaning

## 2. Storage and repository

- [ ] 2.1 Add a `ContractorRepository` protocol (`list`, `get`, `add`, `update`,
      `delete`) whose methods take **no** `deal_id`, with a comment pointing at
      design.md Decision 1 so the exception to PART 2's rule reads as
      deliberate, and verify it type-checks under ruff `ANN`
- [ ] 2.2 Add `JsonContractorRepository` writing `data/<env>/contractors.json`
      through the existing `JsonStore`, beside `deals.json` rather than inside a
      deal directory, and verify a pytest against `tmp_path` covers add, list,
      get, update and delete
- [ ] 2.3 Verify the shared store survives deal deletion: a test creating two
      deals and deleting one, asserting every contractor record remains and the
      other deal's attributions still resolve

## 3. Migration

- [ ] 3.1 Implement the startup migration: for every deal, read its expenses,
      create one contractor per distinct payee under trim + collapse-internal-
      whitespace + case-fold, set each to the goods-bought-from kind, and
      rewrite each expense with `contractor_id` in place of `payee`
- [ ] 3.2 Make the already-run signal "no stored expense still carries a
      `payee`" rather than the presence of `contractors.json`, and verify a test
      that a hand-created contractor file does not suppress the migration
- [ ] 3.3 Verify it runs after PART 2's file-moving migration: a test booting
      once from a legacy flat store and asserting expenses end up per-deal
      **and** attributed
- [ ] 3.4 Verify exact-match dedupe: a test with `"Stone & Co"`, `"stone & co"`
      and `" Stone  & Co "` producing one contractor and three attributions
- [ ] 3.5 Verify it does not over-merge: a test with `"Silva & Filhos"` and
      `"Silva e Filhos"` producing two contractors
- [ ] 3.6 Verify one contractor spans deals: a test with the same payee on two
      deals producing one contractor referenced from both
- [ ] 3.7 Verify the blank-payee path: a test with a hand-written record whose
      payee is absent attributing it to one explicitly-named unattributed
      contractor, and a second test asserting a store without such a record
      gains no such contractor
- [ ] 3.8 Verify idempotency with a test running the migration twice, asserting
      the second run creates no contractor and re-attributes nothing
- [ ] 3.9 Verify a fresh install with no expenses creates no contractor
- [ ] 3.10 Verify identifiers survive: a test asserting every expense id, amount
      and timestamp is byte-identical after migrating a populated store

## 4. Services

- [ ] 4.1 Add `ContractorService` over the repository (list, get, create,
      update, archive, delete) raising domain errors consistent with
      `ExpenseService` (`backend/app/src/exceptions.py`), and verify unit tests
      cover each path against an in-memory fake
- [ ] 4.2 Make the list exclude archived contractors by default and include them
      on request, and verify tests for both
- [ ] 4.3 Refuse deletion while any expense references the contractor, and
      verify a test that the refusal names the conflict and leaves the expenses
      untouched
- [ ] 4.4 Implement merge: re-attribute every referencing expense across every
      deal to the survivor, then delete the merged-away record, and verify a
      test that no expense is left pointing at a deleted contractor
- [ ] 4.5 Validate `contractor_id` on expense create and update, and verify a
      test that an unknown contractor is refused and creates nothing
- [ ] 4.6 Add `by_contractor` to `BudgetSummary` in the existing single pass
      (`budget_service.py:37-66`), omitting contractors with no spend on the
      deal as `_by_category` already omits unused categories (`:104-108`), and
      verify a test that a contractor paid only on deal B is absent from deal A
- [ ] 4.7 Verify the rollup reconciles: a test with expenses across several
      contractors **including a PLANNED one**, asserting planned, pending and
      paid each sum to the deal's corresponding total — the case that catches a
      mistaken `amount` meaning
- [ ] 4.8 Verify rule 4: a test asserting contractor log records carry
      identifiers and counts only, with no name, trade, contact detail or note
- [ ] 4.9 Verify the migration's logging specifically: a test asserting it logs
      counts of contractors created and expenses attributed, and that no payee
      string or contractor name appears in any log line

## 5. Routes

- [ ] 5.1 Add the `/contractors` router (list, create, get, update, delete) at
      the application level rather than under `/deals/{deal_id}`, register it in
      `backend/app/api/main.py:26-28`, and verify a pytest covers each endpoint
      including 404 on an unknown id
- [ ] 5.2 Add the merge endpoint and verify a pytest covers a successful merge,
      an unknown survivor, and merging a contractor into itself
- [ ] 5.3 Verify the delete guard over HTTP: a pytest asserting a contractor
      with spend returns a conflict status and one without is deleted
- [ ] 5.4 Verify the expense routes reject an unknown `contractor_id` on both
      POST and PATCH with a pytest

## 6. Backend suite

- [ ] 6.1 Extend `backend/tests/conftest.py` so the `client` fixture provides a
      contractor and exposes its id, keeping attribution in the fixture rather
      than in every test, and verify the full suite runs against it
- [ ] 6.2 Update every existing test that constructs an expense with a `payee`
      (7 files, 57 tests today) and verify `cd backend && uv run pytest` is green
- [ ] 6.3 Verify isolation end to end: a test with one contractor paid on two
      deals, asserting each deal's rollup reports only its own spend

## 7. Frontend — data layer

- [ ] 7.1 Add `frontend/src/types/contractor.ts` mirroring the backend model and
      replace `payee` with `contractor_id` on `Expense` / `ExpenseCreate`
      (`types/expense.ts:50`, `:69`), and verify `npm run build` type-checks
- [ ] 7.2 Add `frontend/src/api/contractors.ts` — the only place these calls are
      made, per rule 2's frontend counterpart — and verify fetch-mocked tests
      assert the URLs
- [ ] 7.3 Load contractors in `useExpensesData` without re-fetching them on a
      deal switch, and verify a test that switching deals re-fetches expenses,
      budget and summary but not contractors
- [ ] 7.4 Make a failed contractor load leave the ledger rendered, and verify a
      test that expenses still show with the name reported as unavailable
- [ ] 7.5 Replace `payee` in `validation.ts` (`:30-33`, `:80`, `:98`, `:115`)
      with a required-`contractor_id` rule, and verify the validation tests
      cover the missing-selection case

## 8. Frontend — the picker

- [ ] 8.1 Replace the payee `TextField` in `ExpenseForm.tsx:76-83` with a
      `SelectField` of active contractors, and verify a test that submitting
      sends the identifier and not the name
- [ ] 8.2 Add the create-a-contractor action and its form, and verify a test
      that a contractor created mid-edit becomes the selection **and** the
      values already entered are still in the form
- [ ] 8.3 Add the no-contractors-yet empty state in the form, and verify a test
      that it offers the create action rather than an empty selection
- [ ] 8.4 Verify the required-field behaviour: a test submitting with no
      contractor selected showing an inline message and making no request

## 9. Frontend — columns and copy

- [ ] 9.1 Resolve the contractor name in `ExpenseRow.tsx:31` and the ledger
      header (`ExpenseTable.tsx:36`) from the loaded list, and verify a test
      that three expenses on one contractor read identically
- [ ] 9.2 Add the contractor column to the works budget view, and verify a test
      that each row shows the name it is attributed to
- [ ] 9.3 Verify no browser arithmetic: a test asserting any per-contractor
      figure shown is one the API returned
- [ ] 9.4 Rename the `payee` catalogue keys in both `messages.en.ts` and
      `messages.pt.ts` (`expenses.table.header.payee`, `expense.field.payee`,
      `expense.error.payeeLength`, and the `{payee}` interpolation in
      `expense.delete.confirm`), and verify the parity test and `make check`
      pass with no key present in only one language
- [ ] 9.5 Resolve the contractor name in `DeleteConfirmDialog.tsx:36` from the
      loaded list, and verify its tests under both locales
- [ ] 9.6 Verify Portuguese fits: a test rendering the expense form and the
      contractor form under `pt-PT` asserting no untranslated key and no English
      copy, and a check that the 480px modal does not clip

## 10. Documentation

- [ ] 10.1 Update `docs/persistence-guide.md` for the application-level
      contractors collection and the payee migration, noting why this repository
      takes no `deal_id`, and verify `make harness-check` passes
- [ ] 10.2 Update `docs/backend-guide.md` for the `/contractors` routes, and
      verify `make harness-check` passes
- [ ] 10.3 Verify no agent-control file needs editing — `AGENTS.md` already
      names contractors as a v1 concern and `docs/persistence-guide.md:19`
      already prescribes `contractor_id`, so rule 8 is not engaged. If
      implementation proves otherwise, **ask the user** and keep that edit in
      its own commit

## 11. Gate

- [ ] 11.1 Verify `make check` is green — backend lint, format, secrets, pytest
      and the frontend gate
- [ ] 11.2 Run the `reviewer` sub-agent over the branch diff and resolve what it
      finds
- [ ] 11.3 Flag for human review before merge: this changes the on-disk format,
      and unlike PART 2's file move this migration rewrites records in place, so
      a pre-upgrade copy of each `deals/<id>/expenses.json` is the rollback
      (agent-loop rule)
