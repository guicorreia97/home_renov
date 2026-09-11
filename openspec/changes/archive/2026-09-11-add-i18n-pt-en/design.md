# Design: European Portuguese and English

## Context

See `proposal.md` — Why. The constraints that shape the approach:

- **One screen, ~86 strings, two languages.** The catalogue is small enough to
  live in the repo as TypeScript and be reviewed in a diff.
- **`formatEnumLabel` is English-by-construction.** It manufactures a label from
  the backend's snake_case value. Nothing keyed by language exists anywhere.
- **`Intl` is already used, but with `undefined` as the locale**, which follows
  the browser. Once the user can choose a language, "the browser's locale" and
  "the chosen language" are two different things, and every existing call site
  is silently on the wrong one.
- **146 text-based test queries across 13 files** assert exact English copy.
  This is the single largest cost in the change and it constrains the design:
  whatever the catalogue looks like, tests have to be able to reach it.
- **The design system fixes the modal at 480px and forbids type below 13px**
  (`docs/design-system-guide.md`), and Portuguese runs 20–30% longer.
- **Single-user, local-first, no accounts** (project rule). The preference has
  nowhere server-side to live and does not need one.

## Goals / Non-Goals

**Goals:**
- A missing or mistyped message key is a **build** failure, not a blank in the UI.
- Locale-sensitive formatting has exactly one source of truth for "what locale".
- Tests survive rewording but still fail on a broken control.
- No new runtime dependency.

**Non-Goals:**
- A general-purpose i18n framework. Two locales, one screen, no translator
  handoff, no lazy-loaded bundles, no ICU.
- Pluralisation infrastructure beyond what the current copy needs. Portuguese
  and English share the same one/other split; if a count-dependent message
  appears, `Intl.PluralRules` handles it without new machinery.
- Localising anything the backend produces (see proposal — Non-goals).

## Decisions

### 1. A hand-written module in `frontend/src/i18n/`, not `react-i18next`

**Chosen:** ~150 lines: a catalogue, a context provider, a `useTranslation` hook.

`react-i18next` solves problems this app does not have — namespace splitting,
lazy loading, backend connectors, translator tooling — and costs two
dependencies plus a plugin chain. Its key type-safety needs extra scaffolding
(`resources` type augmentation) to reach what a plain TypeScript object gives
for free. Lingui and FormatJS add a compile step for the same reason.

The trade-off is real: if this app ever grows to five languages with an external
translator, the hand-rolled module is the wrong shape and will need replacing.
That is a cheap replacement to make later — the call sites are `t('some.key')`
either way, which is exactly the interface every library exposes.

### 2. English is the type; Portuguese must satisfy it

```ts
export const en = { 'expenses.title': 'Expenses', /* … */ } as const
export type MessageKey = keyof typeof en
export const pt: Record<MessageKey, string> = { /* … */ }
```

`en` is declared first and `pt` is typed as `Record<MessageKey, string>`. A key
in `en` and missing from `pt` is a compile error; a typo'd key in `pt` is a
compile error; `t('nope')` is a compile error. `make check` runs `tsc -b` via the
frontend build, so catalogue parity is enforced by the existing gate with no new
script.

One test asserts the two key sets are equal anyway. The type only holds while
someone keeps the annotation — a future edit to `Record<string, string>` would
disable it silently, and the test is what catches that.

### 3. Flat dotted keys, not nested objects

`'expenses.table.header.description'` rather than nested objects. Flat keys grep
cleanly — finding every use of a message is one `grep`, and an orphaned key is
visible. Nesting buys shorter call sites and costs that.

### 4. Interpolation by named placeholder; never concatenation

```ts
'budget.error.notANumber': '{field} must be a non-negative number, e.g. 45000 or 45000.50.'
t('budget.error.notANumber', { field: t('budget.field.plannedBudget') })
```

Two current messages build a sentence by prefixing a field label
(`` `${label} must be…` ``). That pattern is a translation bug waiting to
happen: Portuguese does not always put the subject first. The whole sentence is
one catalogue entry with the label interpolated in, so each language positions
it independently. `t` takes an optional params record and replaces `{name}`.

This also removes the duplicated `BUDGET_FIELD_LABELS` map in `validation.ts` —
those three labels become keys shared with the budget modal.

### 5. React context, with the initial value resolved synchronously

The provider holds `{ locale, setLocale, t }`. Context rather than a module
singleton because switching must re-render the tree — that is the whole feature.

The initial locale is resolved in a `useState` initialiser, not an effect:
read `localStorage`, else match `navigator.language*` against `/^pt\b/i`, else
`en`. An effect would paint English first and correct itself, which the spec
forbids ("without flashing English first").

`localStorage` access is wrapped — a browser with site data blocked throws on
read, and the app must still start.

### 6. `lib/format.ts` keeps pure functions that take a locale; the hook binds them

`formatMoney(amount, currency, locale)` and `formatDate(iso, locale)` stay
dependency-free and directly unit-testable with no provider. A `useFormat` hook
returns versions with the active locale already applied, so no component passes
a locale by hand and no call site can forget one.

**Currency stays independent of language.** It comes from
`BudgetSummary.currency`, as it does today. Choosing Portuguese does not change
what the renovation is priced in.

**Percentages move to `Intl`.** `percent.toFixed(1)` always emits a `.`; in
`pt-PT` it must be a comma. The value is 0–100, so it is divided by 100 and
formatted with `style: 'percent'`, which also places the `%` per locale
convention. The surrounding phrase stays a separate catalogue message with the
formatted percentage interpolated in.

### 7. Enum labels become an exhaustive typed record — deliberately trading away a property

```ts
'expense.category.furniture_and_fixtures': 'Furniture and fixtures'
```

typed so that every member of `ExpenseCategory`, `PaymentMethod` and
`ExpenseStatus` must have a key.

`enumOptions.ts` currently prizes the opposite property: a new backend enum
member "shows up here for free instead of silently being unselectable". After
this change a new member is a **build error** until both languages have a label.

That is the point. "For free" only ever produced an English label — in a
Portuguese UI it would leak untranslated, which is the quieter and worse
failure. A build error names the missing member and takes a minute to fix.
This is a real regression in one property, chosen over a silent one.

### 8. Backend `detail` strings are never rendered

The backend keeps returning English (`backend/app/src/exceptions.py`). Rather
than surfacing English text inside a Portuguese UI, failure states render the
frontend's own localised copy for that failure, and the raw `detail` goes to the
console for debugging.

Cost: the user loses the specificity of "Expense {id} was not found" in favour of
a generic localised failure message. For a single-user local app where the
error is nearly always "the backend isn't running", that is an acceptable
exchange — and the alternative, a server-side catalogue, is the scope we ruled
out.

### 9. The switcher uses existing components and tokens

It sits in the app shell header and is built from the existing `SelectField`
(two options) — no new tokens, no new component shape, per project rule 7. Two
options do not justify a segmented control that would need new tokens.

`App.tsx` had no header, so one is added: rendered in every connection state
(checking, failed, connected), the product name on the left and the switcher on
the right with its visible label — the layout the user approved. Its options
are endonyms (English, Português), identical in both catalogues, so a reader
can find their own language whichever one is showing.

Modals are native `showModal()` dialogs, which make the page behind them inert,
so the switcher cannot be operated while one is open. The spec scopes the
control to "whenever no modal is open"; the state guarantee is kept regardless —
a locale change during an open form leaves its values, the modal and its
(re-translated) errors intact.

`document.documentElement.lang` is set from an effect in the provider, keeping
the DOM attribute and React state in one place.

### 10. Tests: a `renderWithLocale` helper, and selection by role or catalogue

A helper in `frontend/src/test/` wraps a render in the provider at a given
locale. Tests then select by role wherever a role exists, and by
`t('key')` lookup where the copy itself is the subject — so a reworded message
updates the assertion automatically.

Both languages are not run over every test; that would double the suite for
little gain. The screen-level tests and the two modals run under both, since
that is where layout and formatting differ. Component tests run under one.

## Risks / Trade-offs

- **Portuguese overflows the 480px modal or the summary strip.** → The two
  modals and the strip are checked in Portuguese as an explicit task, with the
  longest labels present. Fixes are wrapping and layout, never sub-13px type or
  a new token.
- **146 test queries is a large, dull diff with real chances of a silent
  weakening** — someone replaces a text query with a loose one and the test stops
  proving anything. → Migrate file by file, preferring `getByRole` with a name
  over `getByText`; a reviewer reads the test diff for assertions that got
  vaguer, not just for green.
- **A machine-translated Portuguese catalogue reads badly** in a domain with
  specific vocabulary (orçamento, empreitada, IVA). → The catalogue is one file,
  reviewed as prose by a `pt-PT` speaker before merge. Listed as a task.
- **The English fallback masks a missing key at runtime** if the type annotation
  is ever weakened. → The parity test in decision 2 is the backstop.
- **Scope creep into the backend.** The moment an API error message needs
  translating, the tempting fix is a quick server-side catalogue. → Out of scope
  by decision 8; revisit as its own change if it becomes a real complaint.

## Migration Plan

Additive and reversible. No data migration, no API change, no stored format
change. The one piece of new persisted state is a `localStorage` key holding
`"en"` or `"pt-PT"`; an absent or unrecognised value falls back to detection, so
nothing breaks on rollback and no cleanup is needed.

Rollback is reverting the branch. Since the preference never leaves the browser
and the backend is untouched, a revert cannot leave data in a bad state.

Delivery is one branch (`feat/i18n-pt-en`) with an OpenSpec `Change:` trailer per
project rule 9, squash-merged through a green PR.

## Open Questions

None open. The `pt-PT` wording was read end to end by a native speaker
(task 6.2): "Payee" is *beneficiário*, the waste category is *Remoção de
entulho*, and utilities is spelled out as *Água, gás e eletricidade* rather
than the ambiguous *Consumos*. The rest of the catalogue stood as written.
