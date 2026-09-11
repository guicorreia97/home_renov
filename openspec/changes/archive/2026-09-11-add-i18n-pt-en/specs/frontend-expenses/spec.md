# Delta: Frontend — Expenses & Budget

**Change ID:** `add-i18n-pt-en`
**Affects:** `frontend/src/features/expenses/`, `frontend/src/components/`,
`docs/testing-guide.md`

Two requirements are written against fixed English copy and a browser-derived
locale. Both are restated below in full with those assumptions removed. Every
other requirement in this capability is unchanged — the budget contract, the
money-as-string rule and the modal-dismissal rule are all language-independent.

---

## MODIFIED Requirements

### Requirement: An empty budget states its emptiness

A summary strip with no budget set SHALL explain that and offer the way to fix
it, rather than rendering blank figures that read as zero. The explanation and
the trigger SHALL be rendered in the active display language.

#### Scenario: No budget configured
- GIVEN `GET /budget` returns all figures as `null`
- WHEN the expenses screen renders
- THEN the strip shows an explicit "no budget set" state with the settings
  trigger, in the active language
- AND it does not display a zero percentage or a zero amount in place of the
  missing figures

#### Scenario: No budget configured, in Portuguese
- GIVEN `GET /budget` returns all figures as `null`
- AND the display language is `pt-PT`
- WHEN the expenses screen renders
- THEN the empty state and its settings trigger read in Portuguese, and no
  English copy remains in the strip

### Requirement: The frontend has an automated test suite

`frontend/` gains Vitest with React Testing Library and happy-dom, run by `npm
test`. happy-dom rather than jsdom because jsdom does not implement
`HTMLDialogElement.showModal`, which `Modal` depends on.
The API client is mocked at the `fetch` boundary — the one place `fetch` is
called — so tests never hit a live backend. The convention is documented in
`docs/testing-guide.md`.

Tests assert behaviour, not copy. A test SHALL NOT hardcode a user-visible
string; it selects by role, by a catalogue lookup, or by a stable identifier, so
that rewording a message does not fail the suite while a broken control still
does.

#### Scenario: Running the suite
- GIVEN a clean checkout with dependencies installed
- WHEN `npm test` is run from `frontend/`
- THEN the suite runs against happy-dom and passes without a backend running

#### Scenario: Coverage of the feature
- GIVEN the expenses feature and the five shared components
- WHEN the suite runs
- THEN every file in `frontend/src/features/expenses/` and each of `Button`,
  `TextField`, `SelectField`, `Modal` and `Badge` is exercised by at least one
  behavioural test

#### Scenario: Coverage of both languages
- GIVEN the expenses screen and its modals
- WHEN the suite runs
- THEN they are rendered under both `en` and `pt-PT`, and the assertions that
  depend on language — copy, number and date formatting, enum labels — are made
  against the catalogue for the language under test

#### Scenario: Rewording does not break the suite
- GIVEN an English message is reworded in the catalogue with no behaviour change
- WHEN the suite runs
- THEN it passes
