# Phase 0 Review Findings — `complete-expenses-ui`

Recorded 2026-09-08 from the `reviewer` sub-agent pass over the untracked
frontend work (task 0.1). Triage per task 0.2.

## Fix now (rule violations, addressed in Phase 3)

**F1 — Rule 7: arbitrary Tailwind values that are not tokens.**
`components/Modal.tsx:51` uses `max-h-[85vh] w-full max-w-[480px]`;
`features/expenses/ExpenseFilters.tsx:24,33` use `min-w-[160px]`.
None of these appear in `docs/design-system-guide.md` or `tailwind.config.js`.
The guide is explicit: add the token to the guide first, then use it.
Fix: name them (`maxWidth.modal`, `maxHeight.modal`, a `minWidth.field` step),
document them in the guide, then consume the named classes.
Gate: Phase 3 — "Every token used appears in `docs/design-system-guide.md`".

**F2 — Rule 7: two accents on one view.**
`features/expenses/ExpensesScreen.tsx:60` (header "Add expense") and
`features/expenses/ExpenseTable.tsx:54` (empty-state "Add expense") both render
`variant="primary"`. With zero expenses both are on screen at once, so the view
has two terracotta buttons and therefore no primary action.
Fix: demote the empty-state button to `secondary`, keeping the header as the
single accent. User-visible on a fresh install.

## Out of scope (recorded, not fixed)

**F3 — Suggestion: `toUpdatePayload` can send an unchanged `amount`.**
`features/expenses/validation.ts:80-96` compares the raw typed string (`"250"`)
against the server-formatted one (`"250.00"`), so re-typing the same amount
sends it in the PATCH body. Still string-only — no money arithmetic — and the
backend accepts it. Normalising would mean parsing money in the client, which
the rules forbid. Left as is.

## Clean

`fetch` confined to `src/api/` (`client.ts:122`); money stays a string
end to end, with `lib/format.ts:17` the only sanctioned display conversion;
the four new color tokens were added to the guide before use; no `any`, no
non-null assertions; labels, `aria-invalid`/`aria-describedby`, the native
`<dialog>` + `aria-labelledby`, and per-row action `aria-label`s are all in
place; no `print`/logging violations.
