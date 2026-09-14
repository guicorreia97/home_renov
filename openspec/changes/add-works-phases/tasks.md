# Tasks: Works phases

Backend first and additive, then the attachment, then the guide, then the
surface — the order in `design.md` — Migration Plan. Each group ends green.

Branch with `make branch NAME=feat/<slug>`. Every commit carries
`Change: add-works-phases`, and the trailer is repeated in each PR body.

## 1. The phase model and its storage

- [ ] 1.1 Add `PhaseStatus` as a closed enum covering not started, in progress
      and complete, and verify a validation test rejects a value outside it
- [ ] 1.2 Add `PhaseColour` as a closed enum of the identity palette's names —
      not colour values — and verify a test asserts no member collides with the
      accent, warning or danger hues (`design.md` Decision 5)
- [ ] 1.3 Add `Phase`, `PhaseCreate` and `PhaseUpdate` (name 1–80 chars matching
      `room`'s cap, status, colour, position, optional budget, optional planned
      start and end) and verify a pytest round-trips one with every optional
      field unset and with every field set
- [ ] 1.4 Verify the planned end date cannot precede the planned start date, with
      a test asserting the rejection and one asserting both-unset is valid
- [ ] 1.5 Add the `PhaseRepository` protocol with `deal_id` as the first
      parameter of every method (PART 2 Decision 3) and verify it type-checks
      under ruff `ANN`
- [ ] 1.6 Add `JsonPhaseRepository` writing `data/<env>/deals/<deal_id>/phases.json`
      through the existing `JsonStore`, and verify a pytest against `tmp_path`
      covers add, list, get, update, delete and that two deals produce two files
      whose contents do not overlap
- [ ] 1.7 Verify the atomic write is untouched: a test asserting phases are
      written through `JsonStore`'s temp-file-then-`os.replace` path and that no
      `open()` appears outside `app/src/repositories/` (rule 2)

## 2. Ordering

- [ ] 2.1 Assign a position on create that appends to the end, and verify a test
      that creating a fourth phase leaves the first three in order
- [ ] 2.2 Implement the whole-sequence reorder as a single write, and verify a
      test that reordering A,B,C to C,A,B leaves dense positions with no gap and
      no duplicate
- [ ] 2.3 Verify a reorder naming a set that is not exactly the deal's phases —
      one missing, one repeated, one from another deal — is refused and leaves
      the stored order byte-identical

## 3. The expense attaches to a phase

- [ ] 3.1 Add optional `phase_id` to `ExpenseCreate` and `ExpenseUpdate`, and
      verify an expense stored before this change still validates unchanged
- [ ] 3.2 Validate in `ExpenseService` that a named phase belongs to the same
      deal, raising a domain error the API maps to 400 consistent with
      `EmptyUpdateError`, and verify tests for an unknown phase and for another
      deal's phase that both assert nothing was written
- [ ] 3.3 Verify no inference exists: a test creating an expense with category
      `labour` and room `kitchen` against a deal with phases asserts it stays
      unphased (`design.md` Decision 6)
- [ ] 3.4 Mirror `phase_id` into `frontend/src/types/expense.ts` and verify the
      frontend build type-checks

## 4. Services

- [ ] 4.1 Add `PhaseService` over `PhaseRepository` (list, get, create, update,
      reorder, delete) raising not-found consistently with `ExpenseService`, and
      verify unit tests cover each path against a fake repository, as
      `tests/test_budget_service.py` already does
- [ ] 4.2 Implement deletion that releases the phase's expenses rather than
      deleting them, and verify a test that the phase is gone, all four of its
      expenses still exist with unchanged ids and amounts, and they report as
      unphased
- [ ] 4.3 Expose the count of expenses a deletion would release, and verify a
      test that the count is available before the deletion happens
- [ ] 4.4 Verify no phase name is logged: a test asserting phase log records
      carry ids and counts only (rule 4)

## 5. Routes

- [ ] 5.1 Add the phases router under `/deals/{deal_id}/phases` (list, create,
      get, update, delete) with Pydantic request and response models, and verify
      a pytest covers each endpoint including 404 on an unknown phase (rule 5)
- [ ] 5.2 Add the reorder route under the same prefix and verify a pytest covers
      the success case and each refusal from 2.3
- [ ] 5.3 Verify a phase of deal B requested, updated, deleted or reordered
      through deal A returns 404 and changes nothing
- [ ] 5.4 Verify a pytest that creating an expense with a `phase_id` from another
      deal returns 400 and creates no expense

## 6. Per-phase rollups in the summary

- [ ] 6.1 Add `PhaseTotal` carrying the phase's id, name, position, colour,
      budgeted amount, `planned`, `pending`, `paid`, committed `amount` and
      `share`, and verify the rail can render from it without a second request
- [ ] 6.2 Compute the breakdown in `budget_service.py` and verify a pytest that
      per-phase `planned + pending + paid` plus the unphased group sums to
      `total_forecast` **with a planned expense and an unphased expense present**
      — the case that catches `_by_category`'s exclusion of PLANNED
      (`budget_service.py:97-108`)
- [ ] 6.3 Add the unphased group, present only when unphased spend exists, and
      verify a test that it is absent when every expense has a phase
- [ ] 6.4 Add the total budgeted across phases and the signed unallocated
      remainder, and verify tests for over-allocation reported as negative and
      for an unset deal budget reported as absent rather than negative
- [ ] 6.5 Add the proportion of each phase's budget spent as a number, and verify
      tests for 50, for absent when the phase has no budget, for greater than 100
      on an overspent phase, and for 0 on a budgeted phase with no spend
- [ ] 6.6 Verify the per-category figures are unchanged: a test asserting
      `by_category` returns exactly what it did before phases existed, for
      expenses that carry both
- [ ] 6.7 Verify ratios are returned as numbers and money as decimal strings, so
      no formatter can render a proportion as currency
- [ ] 6.8 Verify a pytest covers `GET /deals/{id}/budget/summary` returning every
      new field

## 7. Backend suite

- [ ] 7.1 Extend the `client` fixture in `backend/tests/conftest.py` so a phase
      is available where tests need one, keeping scoping in the fixture rather
      than in every test
- [ ] 7.2 Verify isolation end to end: a test with two deals, phases and expenses
      on both, asserting every read and every rollup is scoped to one deal
- [ ] 7.3 Verify `cd backend && uv run pytest` is green

## 8. The design system, before any component

- [ ] 8.1 Add the phase identity palette to `docs/design-system-guide.md` as a
      token table, and verify no member is the accent, warning or danger hue
- [ ] 8.2 Amend the colour rule at `docs/design-system-guide.md:12` so colour
      means status **or identity**, identity drawn from a closed set that
      excludes every status hue; verify the budget thresholds at `:48-59`, the
      4.5:1 rule at `:143` and the 13px floor at `:75` are stated as unchanged
- [ ] 8.3 Mirror the palette into `frontend/src/index.css` and
      `frontend/tailwind.config.js`, and verify no component carries a raw hex
      and no new spacing value enters the 8pt scale (`:79`)
- [ ] 8.4 Verify each swatch colour is distinguishable against `--surface` and
      that the phase name renders beside it everywhere the colour appears

## 9. Frontend data layer

- [ ] 9.1 Add `frontend/src/api/phases.ts` for the deal-scoped CRUD and reorder,
      and verify the fetch-mocked tests assert the deal-scoped URLs
- [ ] 9.2 Mirror `PhaseTotal` and the new summary fields into
      `frontend/src/types/budget.ts`, and verify proportions are typed
      `number | null` and money `Money | null`
- [ ] 9.3 Load the selected deal's phases in `useExpensesData`, scoped to that
      deal and not requested before one is selected, and verify a test that a
      deal switch re-fetches them

## 10. The shell — the rail becomes the phases

- [ ] 10.1 Rebuild the rail from the per-phase figures — colour, name, spend
      against budget, proportion spent — in the user's order, and verify a test
      that it renders from the summary alone with no client arithmetic
- [ ] 10.2 Label the rail as the works phases, and verify no string in the shell
      still calls it categories
- [ ] 10.3 Add the phase filter to the screen's filter state and wire the rail to
      it, and verify a test that the category select still works independently
      (`design.md` Decision 9)
- [ ] 10.4 Add the unphased entry to the rail, visibly not a phase, and verify
      selecting it filters to exactly the expenses with no phase
- [ ] 10.5 Verify the phase filter survives a tab switch and does **not** survive
      a deal switch, with a test for each
- [ ] 10.6 Colour the proportion by the thresholds at
      `docs/design-system-guide.md:48-59`, and verify a phase with no budget
      states that rather than showing a proportion of nothing
- [ ] 10.7 Build create, rename, recolour, rebudget and delete from where the
      phases are listed, and verify the colour choices are the palette's with no
      free colour input
- [ ] 10.8 Make reordering keyboard-operable, not drag-only, and verify a test
      moving a phase with the keyboard and asserting the new order is announced
- [ ] 10.9 Verify deleting a phase with spend states how many expenses will be
      released and kept, requires confirmation, and afterwards shows them under
      the unphased entry
- [ ] 10.10 Verify the empty state: a deal with no phases states so and offers
      the create action rather than rendering an empty rail

## 11. The views

- [ ] 11.1 Group the budget view by phase with each group header showing its
      budget, spend and proportion, and verify a test that subtotals plus the
      unphased group account for the grand total
- [ ] 11.2 Add the unphased group after the phases with the action that assigns
      one, and verify it is visibly not a works phase
- [ ] 11.3 Add the phase column to the ledger showing the name with its colour,
      and verify a test that removing colour still tells the rows apart
- [ ] 11.4 Verify an expense with no phase renders an explicit placeholder in the
      ledger, as the missing invoice reference already does
- [ ] 11.5 Add the optional phase field to the expense form with an explicit
      no-phase choice, and verify tests that nothing is preselected, that an
      expense saves without one, and that a deal with no phases offers the create
      action instead of an empty select
- [ ] 11.6 Add assigning a phase to already-recorded spend from the edit form and
      from the unphased group, and verify a test that only the phase changes and
      the figures are re-read from the API
- [ ] 11.7 Add every new string to both catalogues (`messages.en.ts` is the
      source of truth) including the `PhaseStatus` labels, and verify the parity
      test passes and no phase name is translated
- [ ] 11.8 Verify both locales render the rail, the grouped table, the ledger
      column and the form at 1280px with no clipping, with a long Portuguese
      phase name wrapping rather than being ellipsised

## 12. Docs, harness and sibling reconciliation

- [ ] 12.1 Update `docs/persistence-guide.md` for the per-deal `phases.json`, and
      verify `make harness-check` passes
- [ ] 12.2 Update `docs/backend-guide.md` for the phases routes and the 400 on a
      cross-deal phase, and verify `make harness-check` passes
- [ ] 12.3 Verify no new top-level directory was added under `frontend/src/` —
      phase UI lives in the existing `features/` tree — so the Layout table in
      `frontend/AGENTS.md` still matches (`scripts/harness-check.sh` check 7) and
      no rule 8 file needs editing
- [ ] 12.4 **Before archiving**, if PART 4 (`add-contractors`) has archived
      first, re-copy the current **The ledger shows how each expense was settled
      and evidenced** block from `openspec/specs/frontend-expenses/spec.md` and
      re-apply the phase column onto it, so this change does not revert PART 4's
      contractor edit (`design.md` Risks)
- [ ] 12.5 **Before archiving**, reconcile the phase-budget wording with PART 5
      (`add-line-item-budgeting`), whose `phases` delta replaces the source of a
      phase's budgeted amount with the sum of its line items; PART 5 lists the
      mirror task
- [ ] 12.6 Verify `openspec validate --strict add-works-phases` reports only the
      two expected sequencing INFO lines, and that they disappear once PART 1 has
      archived

## 13. Gate

- [ ] 13.1 Verify `make check` is green from the repo root — harness coherence,
      ruff, format, secrets, pytest and the frontend gate
- [ ] 13.2 Run the `reviewer` sub-agent over the branch diff and resolve what it
      finds
- [ ] 13.3 Walk the app by hand with `make run`: create phases, reorder them,
      filter from the rail, record an expense against one, assign an existing
      one, delete a phase with spend, and switch language
- [ ] 13.4 **Flag for human review before merge**: this changes the on-disk
      format, and rolling back after a `phase_id` is written needs the
      pre-upgrade `expenses.json`, not just a revert (agent-loop rule)
