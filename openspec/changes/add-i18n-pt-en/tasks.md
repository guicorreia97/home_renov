# Tasks: European Portuguese and English

Ordered by dependency. Groups 1–3 build the machinery, 4–6 move the copy onto
it, 7–8 prove it, 9–10 close it out.

## 1. The i18n module

- [x] 1.1 Create `frontend/src/i18n/messages.en.ts` with the `en` catalogue as
      `as const` and export `MessageKey = keyof typeof en`; verify `npm run
      typecheck` passes with the file exporting at least one key
- [x] 1.2 Create `frontend/src/i18n/messages.pt.ts` typed
      `Record<MessageKey, string>`; verify that deleting a key from it fails
      `npm run typecheck` (restore it afterwards)
- [x] 1.3 Implement `t(key, params?)` with `{name}` placeholder interpolation and
      English fallback on a runtime miss; verify unit tests cover interpolation,
      a missing param left untouched, and the fallback path
- [x] 1.4 Implement `LocaleProvider` resolving the initial locale synchronously
      in a `useState` initialiser — stored value, else `/^pt\b/i` against
      `navigator.language`, else `en`; verify unit tests cover all three paths
- [x] 1.5 Wrap `localStorage` reads and writes so a throwing accessor cannot stop
      startup; verify a test with a throwing `localStorage` still renders and
      still switches for the session
- [x] 1.6 Add `useTranslation()` returning `{ t, locale, setLocale }`; verify a
      test asserts `setLocale` persists the choice and re-renders consumers
- [x] 1.7 Add a catalogue parity test asserting the `en` and `pt` key sets are
      identical; verify it fails when a key is removed from one side

## 2. Locale-aware formatting

- [x] 2.1 Change `formatMoney(amount, currency, locale)` and
      `formatDate(iso, locale)` in `frontend/src/lib/format.ts` to take an
      explicit locale; verify unit tests assert `€1,250.50` under `en` and
      `1250,50 €` under `pt-PT` for the same input, and that the UTC-noon date
      guard still holds
- [x] 2.2 Add `formatPercent(value, locale)` using `Intl.NumberFormat` with
      `style: 'percent'` on `value / 100`; verify a unit test asserts a comma
      separator under `pt-PT` and a point under `en`
- [x] 2.3 Add a `useFormat()` hook binding the active locale into all three; verify
      a test shows a component using it re-formats when the locale changes
- [x] 2.4 Replace `percent.toFixed(1)` in `RemainingBudgetConclusion.tsx` with
      `formatPercent` and move `"% of budget used"` into a catalogue message with
      the formatted percentage interpolated; verify the component test asserts
      both languages

## 3. Enum labels

- [x] 3.1 Add exhaustive label keys for `ExpenseCategory`, `PaymentMethod` and
      `ExpenseStatus` to both catalogues, typed so a missing member is a compile
      error; verify `npm run typecheck` fails when one member's key is removed
- [x] 3.2 Rewrite `enumOptions.ts` to build options from catalogue lookups and
      delete `formatEnumLabel` from `lib/format.ts`; verify no reference to
      `formatEnumLabel` remains (`grep -r formatEnumLabel frontend/src` is empty)
      and the select options render translated labels in both languages
- [x] 3.3 Confirm the machine value still crosses the wire: verify a test in
      Portuguese asserts the create payload carries `furniture_and_fixtures`,
      not the Portuguese label, and that filtering matches the same rows

## 4. Move component copy onto the catalogue

Work file by file. Each task: add the keys to `en`, call `t` at the call site,
leave `pt` values as a placeholder for group 6.

- [x] 4.1 `ExpensesScreen.tsx` and `App.tsx` (~8 strings, including the shell and
      backend-connection copy); verify no user-visible literal remains in either
      file and both render under `en`
- [x] 4.2 `BudgetSummaryStrip.tsx` (~13 strings, including the "no budget set"
      empty state); verify the empty-state test passes and the strip shows no
      zero percentage or zero amount when the budget is unset
- [x] 4.3 `ExpenseTable.tsx` and `ExpenseRow.tsx` (~7 strings: headers, empty,
      loading, error, retry); verify both empty states — "none recorded" and
      "none match the filters" — render from the catalogue
- [x] 4.4 `ExpenseForm.tsx` and `ExpenseFormModal.tsx` (~18 strings: 14 field
      labels, modal titles, submit captions); verify every field is still
      reachable by its accessible name
- [x] 4.5 `BudgetSettingsModal.tsx` (~8 strings) reusing the three budget field
      label keys rather than redeclaring them; verify the labels in the modal and
      in a validation error come from the same key
- [x] 4.6 `DeleteConfirmDialog.tsx` and `ExpenseFilters.tsx` (~7 strings);
      verify the dialog's accessible name and the "all statuses"/"all categories"
      options come from the catalogue
- [x] 4.7 Move the 7 validation messages in `validation.ts` to catalogue keys,
      converting the two label-prefixed messages to whole-sentence interpolated
      messages and deleting `BUDGET_FIELD_LABELS`; verify the validation unit
      tests assert against catalogue lookups, not literals
- [x] 4.8 Replace any raw backend `detail` shown in the UI with localised failure
      copy, logging the detail to the console instead; verify a test forcing a
      500 shows localised copy and no English `detail` string

## 5. The switcher and the document language

- [x] 5.1 Build the language switcher in the app shell from the existing
      `SelectField`, using only existing design tokens; verify it renders two
      options and no new token or component shape was introduced
- [x] 5.2 Mount `LocaleProvider` in `main.tsx` above the app; verify the app
      boots in the detected language with no English flash before first paint
- [x] 5.3 Set `document.documentElement.lang` from a provider effect and remove
      the hardcoded `lang="en"` assumption in `frontend/index.html`; verify a
      test asserts the attribute becomes `pt-PT` after switching
- [x] 5.4 Verify a language change mid-edit preserves state: a test fills the
      expense form, triggers a validation error, changes the locale through the
      provider (the header switcher is inert behind an open modal), and asserts
      the values and the open modal survive, the error is re-rendered
      translated, and no fetch was made

## 6. The Portuguese catalogue

- [x] 6.1 Fill every `pt-PT` value — European Portuguese orthography, not
      `pt-BR`; verify `npm run typecheck` passes and the parity test from 1.7 is
      green
- [ ] 6.2 Have the `pt-PT` copy read end to end by a native speaker for the
      domain vocabulary flagged in `design.md` — Open Questions (orçamento,
      payee, the category and status labels); verify the catalogue diff is
      reviewed as prose before merge

## 7. Tests

- [x] 7.1 Add `renderWithLocale(ui, locale)` to `frontend/src/test/`; verify it
      renders a consumer at a given locale without a real provider setup at each
      call site
- [x] 7.2 Migrate the 146 text-based queries across the 13 test files, preferring
      `getByRole` with an accessible name and using `t('key')` where the copy is
      the subject; verify `npm test` is green and no test asserts a hardcoded
      user-visible English string (`grep` the suite for the removed literals)
- [x] 7.3 Run `ExpensesScreen`, `ExpenseFormModal` and `BudgetSettingsModal`
      tests under both locales; verify each asserts its language-specific
      formatting — money, date, percentage, enum label
- [x] 7.4 Verify rewording does not break the suite: change one `en` value, run
      `npm test`, confirm green, revert the change

## 8. Layout under Portuguese

- [x] 8.1 Open both modals in `pt-PT` with the longest labels present and check
      the 480px width; verify no clipped, overlapping or overflowing text, and
      that any fix is wrapping or layout — never sub-13px type and never a new
      token
- [x] 8.2 Render the summary strip in `pt-PT`; verify labels do not collide with
      their figures and the figures stay tabular-aligned

## 9. Docs

- [x] 9.1 Add a text-expansion note to `docs/design-system-guide.md` — Portuguese
      runs 20–30% longer, the modal is fixed at 480px, and 13px is the floor;
      verify `make harness-check` passes
- [x] 9.2 Document the catalogue convention and `renderWithLocale` in
      `docs/testing-guide.md`, including the rule that tests must not hardcode
      user-visible strings; verify `make harness-check` passes

## 10. Gate and delivery

- [x] 10.1 Run `make check` and verify it passes in full — harness coherence,
      ruff, secret scan, pytest and the frontend gate
- [x] 10.2 Spawn the `reviewer` sub-agent on the branch diff, paying particular
      attention to test assertions that got vaguer during 7.2; verify its
      findings are addressed or explicitly dismissed with a reason
- [ ] 10.3 Push `feat/i18n-pt-en` with `Change: add-i18n-pt-en` trailers on its
      commits; verify the branch is on `origin` and leave opening the PR to the
      user
