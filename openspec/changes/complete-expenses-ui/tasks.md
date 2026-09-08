# Implementation Tasks: Complete the Expenses Vertical Slice

**Change ID:** `complete-expenses-ui`

---

## Phase 0: Review What Already Exists

The frontend work is untracked and unreviewed. Judge it before building on it.

- [ ] 0.1 Run the `reviewer` sub-agent over the untracked frontend diff against
      the rules in `AGENTS.md` and `docs/design-system-guide.md`
- [ ] 0.2 Record any invented tokens, `fetch` calls outside `frontend/src/api/`,
      or `Number()` coercion of a money value as defects to fix
- [ ] 0.3 Read `docs/testing-guide.md` and `docs/design-system-guide.md` in full
      before writing code

**Quality Gate:**
- [ ] Findings triaged into fix-now vs out-of-scope
- [ ] No rule-1/rule-7 violation left unrecorded

---

## Phase 1: Foundation (Test Infrastructure)

- [ ] 1.1 Get explicit approval to add dev dependencies (agent loop: adding a
      dependency requires human review)
- [ ] 1.2 `npm install -D vitest @testing-library/react @testing-library/user-event
      @testing-library/jest-dom happy-dom`
      **happy-dom, not jsdom.** Verified 2026-09-08: jsdom 29.1.1 does not
      implement `HTMLDialogElement.showModal` (`d.showModal is not a function`),
      so every test touching `Modal` — most of 3.6, 3.7 and 4.1 — would throw on
      render. happy-dom 20.14.0 implements `showModal`, `close` and `open`.
- [ ] 1.3 Add the `test` config to `vite.config.ts` (happy-dom environment,
      global setup file) and a `"test"` script to `frontend/package.json`
- [ ] 1.4 Add `src/test/setup.ts` with `jest-dom` matchers and a `fetch` mock
      helper, so the API client is stubbed at its only boundary
- [ ] 1.5 Write one smoke test to prove the runner works
- [ ] 1.6 Document the frontend testing convention in `docs/testing-guide.md`

**Quality Gate:**
- [ ] `npm test` runs and passes
- [ ] `npm run build` and `npm run lint` still pass
- [ ] `make check` still passes (backend untouched)

---

## Phase 2: Business Logic (Data & Validation)

- [ ] 2.1 Extend `useExpensesData.ts` with budget read/write, and explicit
      `loading` / `error` state per request
- [ ] 2.2 Re-fetch `/budget/summary` after a successful budget update so the
      strip cannot show a stale percentage
- [ ] 2.3 Add budget-form validation to `validation.ts` — non-negative, at most
      two decimals, empty means "not set" (`null`), never `0`
- [ ] 2.4 Verify every money path keeps the value a string end to end
- [ ] 2.5 Tests for `validation.ts`, including the `1234.50` round-trip assertion
- [ ] 2.6 Tests for `useExpensesData` — success, failure, and refetch-after-mutation

**Quality Gate:**
- [ ] `npm test` passes
- [ ] No `Number()`, `parseFloat`, or arithmetic on a `Money` value anywhere

---

## Phase 3: User Interface

- [ ] 3.1 `BudgetSettingsModal.tsx` — three `TextField`s for `planned_budget`,
      `purchase_price`, `target_sale_price`, using existing tokens only
- [ ] 3.2 Add the trigger to `BudgetSummaryStrip` as a ghost button (the accent
      belongs to the screen's one primary action)
- [ ] 3.3 Empty state — when no budget is set, the strip says so and points at
      the trigger instead of rendering blanks
- [ ] 3.4 Regression test for the `Modal` dismissal defect **fixed 2026-09-08**.
      Do **not** hand-roll a focus trap, focus restoration or `aria-modal`: the
      native `<dialog>` + `showModal()` already provide all three, and adding
      them would fight the platform. The real defect was that dismissal hung off
      the `close` event — `close()` *queues* its event rather than dispatching
      it, so under StrictMode's mount/cleanup/remount the event queued by the
      cleanup landed after the second effect re-attached the listener and the
      modal dismissed itself the moment it opened ("Add expense" appeared to do
      nothing). Dismissal now hangs off `cancel`, which only a real user
      dismissal can raise. Cover: the modal survives a StrictMode double-mount,
      `Escape` still closes exactly once, and the dialog has an accessible name.
- [ ] 3.5 Loading and error states for every call the screen makes
- [ ] 3.6 Component tests for `Modal`, `Button`, `TextField`, `SelectField`, `Badge`
- [ ] 3.7 Component tests for `ExpenseForm`, `ExpenseFilters`, `ExpenseTable`,
      `ExpenseRow`, `DeleteConfirmDialog`, `BudgetSummaryStrip`

**Quality Gate:**
- [ ] `npm test` passes
- [ ] oxlint jsx-a11y rules clean
- [ ] Every token used appears in `docs/design-system-guide.md`

---

## Phase 4: Integration & Polish

- [ ] 4.1 End-to-end component test: create → filter → edit → delete, with the
      summary updating at each step
- [ ] 4.2 Manual pass against a running backend (`make run` + `npm run dev`) on
      an empty JSON store and on a populated one
- [ ] 4.3 Confirm no console errors and no unhandled promise rejections
- [ ] 4.4 Update `README.md` with the `npm test` command
- [ ] 4.5 Commit in conventional-commit slices; `feat(frontend)` for the screens,
      `test(frontend)` for the suite, `docs:` for the guides
- [ ] 4.6 Second `reviewer` pass over the full branch diff

**Quality Gate:**
- [ ] All tests pass — `make check` and `npm test`
- [ ] `npm run build` clean
- [ ] Documentation synced

---

## Completion Checklist

- [ ] All phases complete
- [ ] All quality gates passed
- [ ] Every success criterion in `proposal.md` verified, not assumed
- [ ] Nothing from the Out of Scope list was built
- [ ] Documentation synced
- [ ] Ready for `/openspec-archive`
