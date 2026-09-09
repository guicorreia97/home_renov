# Proposal: Complete the Expenses Vertical Slice

**Change ID:** `complete-expenses-ui`
**Created:** 2026-09-08
**Status:** Draft

---

## Problem Statement

The expenses domain is complete on the server and absent everywhere else that
matters for a shippable feature.

- **The backend is done.** `GET|POST /expenses`, `GET|PATCH|DELETE
  /expenses/{id}`, `GET|PUT /budget` and `GET /budget/summary` all exist, sit
  behind repository Protocols, and are covered by 18 pytest cases across
  `backend/tests/test_expenses_api.py` and `test_budget_api.py`.
- **The frontend is uncommitted and unverified.** `frontend/src/features/expenses/`
  (12 files) and five shared components — `Button`, `TextField`, `SelectField`,
  `Modal`, `Badge` — are untracked working-tree changes. They render, but nothing
  proves they behave: `frontend/package.json` has no test runner at all. `npm run
  build` type-checks and `npm run lint` runs oxlint; neither asserts behaviour.
- **The budget is readable but not editable.** `PUT /budget` has no UI. A user
  can see `budget_used_percent` and `over_budget` in `BudgetSummaryStrip` but has
  no way to set `planned_budget`, `purchase_price`, or `target_sale_price` — so
  for a fresh install every one of those figures reads as empty and the summary
  strip is inert.

The person affected is the single local user, who today can record expenses but
cannot tell whether they are over budget, because the budget can only be set by
hand-editing a JSON file on disk.

## Proposed Solution

Finish the slice rather than widen it. Three pieces, in dependency order:

1. **A budget settings screen** consuming the existing `GET|PUT /budget`. A modal
   opened from `BudgetSummaryStrip` with three `Money` fields. No new endpoint —
   the contract already exists and is tested.
2. **A frontend test setup** — Vitest + React Testing Library + happy-dom, wired to a
   `npm test` script, with the API client mocked at the `fetch` boundary. This is
   the first test runner in `frontend/`, so it establishes the convention.
3. **Behavioural coverage and review of the untracked work** — tests for the
   form's validation rules, the filters, the summary strip's over-budget state,
   and the delete confirmation; plus a regression test for the `Modal` dismissal
   defect found and fixed on 2026-09-08, which made "Add expense" appear to do
   nothing (see task 3.4).

Money stays a **string** across the wire in both directions, per the existing
client types — no `Number()` on an amount anywhere.

## Scope

### In Scope
- Budget settings modal (read + update `planned_budget`, `purchase_price`,
  `target_sale_price`).
- Vitest + React Testing Library setup, `npm test` script, and a documented
  convention in `docs/testing-guide.md`.
- Unit/component tests for the expenses feature files and the five shared
  components.
- A regression test pinning the `Modal` dismissal fix, plus any labelling gaps
  the tests surface. The native `<dialog>` supplies the focus trap, focus
  restoration and modal semantics — none of those is reimplemented.
- Committing the currently-untracked frontend work as reviewed, tested code.
- Loading and error states for every API call the screen makes.

### Out of Scope
- **Any backend change.** No new endpoint, model field, or service method.
- Server-side filtering, sorting, or pagination — client-side filters are
  adequate at the record counts ADR-003 targets.
- Rooms, tasks, contractors, timeline. `expense.room` and `expense.payee` stay
  free-text; a `Room` entity is its own proposal.
- Invoice/attachment upload. `invoice_reference` remains a text field.
- Recurring expenses, CSV/PDF export, bulk edit, charts.
- Light theme. Dark is the only theme in v1.

## Impact Analysis

| Component | Change Required | Details |
|-----------|-----------------|---------|
| Database | No | JSON stores and both repository Protocols are unchanged. |
| API | No | Consumes `GET|PUT /budget` and the expense CRUD routes as they stand. No route, model, or service is touched. |
| State | Yes | `useExpensesData` gains budget read/write and explicit loading/error state; re-fetches the summary after a budget update. |
| UI | Yes | New budget settings modal; `Modal` dismissal fix (done, needs a test); the 12 untracked expenses files become committed, tested code. |

## Architecture Considerations

Fits the existing patterns without bending them:

- **Rule 1 (layering) is untouched** because no server code changes.
- **`frontend/src/api/` stays the only place `fetch` is called** — the new budget
  form calls `updateBudget()` from `frontend/src/api/budget.ts`, which already
  exists.
- **Rule 7 (design system)** — the modal uses existing tokens only: `--surface`
  for the panel, `--overlay` for the backdrop, `--border` hairlines, and the
  numeric display style for budget figures. No new token is introduced. The
  accent appears once per view, so the budget modal's save button is the accent
  and the strip's trigger is a ghost.
- **New pattern: frontend testing.** There is none today, so this change sets it.
  Vitest is chosen over Jest because Vite already owns the build and transform
  config; a second toolchain would be config duplicated to drift.
- **Rule 5 ("every endpoint has a test") is already satisfied** for these routes
  — this change adds the client-side half that rule does not cover.

The one judgement call worth flagging: `make check` covers the backend only, so a
frontend test suite does not gate on it. This proposal adds `npm test` but does
**not** change `make check`, since making the root gate depend on `npm install`
is a harness change under rule 8 and needs the user's explicit sign-off.

## Success Criteria

- [ ] A user can set and update all three budget figures from the UI, and
      `BudgetSummaryStrip` reflects the new values without a page reload.
- [ ] `npm test` exists, runs, and passes; `npm run build` and `npm run lint`
      still pass.
- [ ] Every file in `frontend/src/features/expenses/` and each of the five shared
      components has at least one behavioural test.
- [ ] Modals open and stay open, close on `Escape` exactly once, and expose an
      accessible name — with a test that fails against the pre-2026-09-08
      `close`-event implementation; oxlint's jsx-a11y rules pass clean.
- [ ] Money is never converted to a JavaScript number in any code path.
- [ ] `make check` still passes — proving no backend regression.
- [ ] The formerly-untracked frontend work is committed in reviewed, conventional
      commits.

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Float precision corrupts an amount once a form round-trips it | Med | High | Keep `Money` a string end to end; assert in tests that a value like `1234.50` survives edit-and-save byte-identical. |
| Adding Vitest drags in a conflicting transform config or bloats install | Low | Med | Vitest reuses the existing Vite config; pin versions and confirm `npm run build` is unaffected. |
| The untracked code hides defects that tests then codify as correct | Med | Med | Run the `reviewer` sub-agent over the diff before writing tests, so tests are written against intended behaviour, not observed behaviour. |
| Scope drifts into rooms/contractors because the fields already exist on `Expense` | Med | Med | `room` and `payee` stay free-text inputs; the Out of Scope list is the contract. |
| A11y fixes to `Modal` regress the three screens already using it | Low | Med | Component tests for `Modal` land before the fixes. |
| Adding a dependency needs human review per the agent loop | High | Low | Vitest, RTL and happy-dom are dev-only; surface them for explicit approval before `npm install`. |
| happy-dom diverges from a real browser somewhere else, as jsdom did on `<dialog>` | Med | Med | It is the test environment, not the product; keep task 4.2's manual pass against a real browser as the final word. |
