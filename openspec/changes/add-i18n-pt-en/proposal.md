# Proposal: European Portuguese and English

## Why

Every string the app shows is a hardcoded English literal — roughly 86 of them
across ten component files, plus seven validation messages — and the category,
payment-method and status labels are *manufactured* from the backend's
snake_case enum values by `formatEnumLabel`, which can only ever produce
English. There is no mechanism to run the app in another language and no place
to put one.

The renovation being tracked is priced in euros and the person tracking it reads
Portuguese; English is wanted alongside it, not instead of it. Doing this now,
while the entire user surface is one screen, is materially cheaper than doing it
after rooms, tasks, contractors and the timeline land — each of those would
otherwise ship another few dozen English literals to retrofit.

## What Changes

- **New `frontend/src/i18n/` module**: a typed message catalogue, a React
  context provider, and a `useTranslation` hook. No new dependency — the
  catalogue is a TypeScript object whose `en` shape is the source of truth, so
  a key missing from `pt-PT` is a build error rather than a runtime blank.
- **Two locales**: `en` and `pt-PT`. European Portuguese specifically —
  `pt-PT` orthography and conventions, not `pt-BR`.
- **A language switcher** in the app shell. The choice persists in
  `localStorage`; on a first visit with nothing stored, the browser language
  decides, falling back to English.
- **Locale-aware formatting.** `formatMoney` and `formatDate` currently pass
  `undefined` to `Intl`, which silently follows the *browser* rather than the
  chosen language — they take the active locale explicitly instead. The
  budget-used percentage is built with `toFixed(1)`, which always emits a `.`;
  in `pt-PT` that must read `62,5 %`, so it moves to `Intl.NumberFormat`.
- **Enum labels become catalogue entries** keyed by the enum value. This
  removes `formatEnumLabel`, which is English-by-construction.
- **Validation messages become parameterised keys.** Two of them interpolate a
  field label (`` `${label} must be a non-negative number…` ``), so the
  catalogue needs value interpolation — and the label itself becomes a key
  shared with the budget modal, which currently duplicates all three.
- **`<html lang>` follows the active language.** It is hardcoded `en` in
  `frontend/index.html`, which misinforms screen readers the moment the user
  switches.
- **Tests stop depending on one language's copy.** 146 text-based queries
  across 13 test files currently assert exact English strings.

**Non-goals.** The backend keeps returning English `detail` strings and
machine-readable enum values — its two user-reachable messages
(`backend/app/src/exceptions.py`) are out of scope, and no endpoint, model or
repository changes. No RTL support, no currency conversion, no third language,
no server-side persistence of the preference.

## Capabilities

### New Capabilities

- `frontend-i18n`: how the app selects, persists and applies a display
  language; what the catalogue guarantees; and how locale-sensitive values —
  money, dates, percentages, enum labels — are formatted for the active locale.

### Modified Capabilities

- `frontend-expenses`: the screen's requirements are written against fixed
  English copy and a browser-derived locale. Two change at spec level — the
  empty-budget state and the summary figures must render in the active
  language and its number conventions, not the browser's.

## Impact

**Code.** New `frontend/src/i18n/`. Touches all ten component files under
`frontend/src/features/expenses/` and `frontend/src/App.tsx`,
`frontend/src/lib/format.ts`, `frontend/src/features/expenses/enumOptions.ts`,
`validation.ts`, `RemainingBudgetConclusion.tsx`, and `frontend/index.html`.

**Tests.** The largest single cost: 13 test files, 146 text-based queries. The
suite must prove both languages render, which is new coverage, not just churn.

**Dependencies.** None added — this was a deliberate choice over `react-i18next`,
recorded in `design.md`.

**Docs.** `docs/design-system-guide.md` needs a text-expansion note: Portuguese
runs 20–30% longer than English, and the guide fixes modal width at 480px and
forbids type below 13px, so labels cannot simply shrink to fit.

**Backend.** Unaffected.
