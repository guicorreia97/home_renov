# frontend-i18n Specification

## Purpose

How the app chooses, remembers and applies a display language, and how every
locale-sensitive value — money, dates, percentages and enum labels — is rendered
for that language rather than for whatever the browser happens to be set to.
Covers European Portuguese (`pt-PT`) and English (`en`) only.

## Requirements

### Requirement: The app renders entirely in the chosen display language

The app SHALL support exactly two display languages, `en` and `pt-PT`. Every
string the user can see or that a screen reader can announce — headings, field
labels, placeholders, button text, empty states, loading states, error text,
validation messages, accessible names and `aria-label` values — SHALL come from
the message catalogue for the active language. No user-visible string may be a
literal in a component.

Portuguese SHALL be European Portuguese: `pt-PT` orthography and vocabulary, not
`pt-BR`.

#### Scenario: The whole screen switches
- **GIVEN** the expenses screen rendered in English
- **WHEN** the user switches the language to Portuguese
- **THEN** every visible string on the screen is in Portuguese, including the
  table headers, the summary strip labels, the filter controls and the empty
  state
- **AND** no English string remains anywhere on the screen

#### Scenario: Accessible names are translated too
- **GIVEN** the app is in Portuguese
- **WHEN** any control's accessible name is queried
- **THEN** it is the Portuguese name, not an English one left behind in an
  `aria-label`

### Requirement: The language choice persists and is user-controlled

A control in the app shell SHALL let the user change language whenever no
modal is open. A modal is a focused task: while one is open the page behind it
is inert, and the control is reachable again once it closes. The choice SHALL
be written to browser-local storage and SHALL be restored on the
next visit. The preference is local to the browser; it is never sent to the
backend and no endpoint is added to hold it.

#### Scenario: The choice survives a reload
- **GIVEN** the user has switched to Portuguese
- **WHEN** they reload the app
- **THEN** it renders in Portuguese without flashing English first

#### Scenario: A language change does not disturb work in progress
- **GIVEN** the expense form is open with fields filled in and one field showing
  a validation error
- **WHEN** the display language changes while the form is open
- **THEN** the entered values are still there, the form is still open, and the
  validation error is now shown in the new language
- **AND** no network request is made and the page does not reload

#### Scenario: Storage is unavailable
- **GIVEN** browser-local storage cannot be read or written
- **WHEN** the app starts and when the user switches language
- **THEN** the app still renders and the switch still takes effect for the
  session, rather than failing to start

### Requirement: A first visit follows the browser, then falls back to English

With no stored preference, the app SHALL derive the language from the browser's
reported language. A browser reporting any Portuguese variant SHALL open in
`pt-PT`. Anything else SHALL open in English.

#### Scenario: A Portuguese browser
- **GIVEN** no stored preference and a browser reporting `pt-PT` or `pt-BR`
- **WHEN** the app starts
- **THEN** it renders in `pt-PT`

#### Scenario: An unsupported language
- **GIVEN** no stored preference and a browser reporting `fr-FR`
- **WHEN** the app starts
- **THEN** it renders in English

### Requirement: Locale-sensitive values follow the chosen language

Money, dates and percentages SHALL be formatted for the active display
language, not for the browser's locale and not by hand-rolled string
formatting. In `pt-PT` this means a comma decimal separator and a
space-separated trailing currency symbol; in `en` a point decimal separator and
a leading symbol.

The currency itself SHALL continue to come from the API response, not from the
language — choosing Portuguese does not change what currency the renovation is
priced in.

#### Scenario: An amount in each language
- **GIVEN** an amount of `"1250.5"` with currency `EUR`
- **WHEN** it is displayed in English and then in Portuguese
- **THEN** English shows `€1,250.50` and Portuguese shows `1250,50 €`

#### Scenario: A percentage in Portuguese
- **GIVEN** a budget-used figure of `62.5`
- **WHEN** it is displayed in Portuguese
- **THEN** the decimal separator is a comma, not a point

#### Scenario: A date in each language
- **GIVEN** the ISO date `"2026-09-01"`
- **WHEN** it is displayed in each language
- **THEN** each shows that day, month and year in its own convention, and
  neither shifts to 31 August in a timezone west of UTC

#### Scenario: The browser disagrees with the choice
- **GIVEN** a browser set to `en-US` and the app switched to Portuguese
- **WHEN** any amount or date is displayed
- **THEN** it uses Portuguese conventions, not American ones

### Requirement: Enum values are displayed as localised labels

Expense category, payment method and status SHALL be displayed via a label
looked up for the active language. A label SHALL NOT be derived from the enum
value's own spelling.

The value itself is unaffected: what is stored, filtered on and sent to the API
SHALL remain the backend's machine-readable value, in both languages.

#### Scenario: A category label in each language
- **GIVEN** the category value `furniture_and_fixtures`
- **WHEN** the expense row is displayed in each language
- **THEN** English reads `Furniture and fixtures` and Portuguese reads its
  `pt-PT` equivalent

#### Scenario: The wire value does not change
- **GIVEN** the app is in Portuguese
- **WHEN** the user picks a category in the form and saves
- **THEN** the request body carries the machine value `furniture_and_fixtures`,
  not the Portuguese label

#### Scenario: Filtering while in Portuguese
- **GIVEN** the app is in Portuguese
- **WHEN** the user filters by a status
- **THEN** the filter matches on the machine value and returns the same rows it
  would have in English

### Requirement: Both catalogues are complete

Every message key SHALL exist in both languages. A key present in one catalogue
and absent from the other SHALL fail the quality gate rather than reaching the
user. If a lookup nonetheless misses at runtime, the English message SHALL be
rendered — never a blank, and never the raw key.

#### Scenario: A key is added to one language only
- **GIVEN** a new message added to the English catalogue but not the Portuguese one
- **WHEN** `make check` runs
- **THEN** it fails, naming the missing key

#### Scenario: A runtime miss
- **GIVEN** a lookup for a key that is not in the active catalogue
- **WHEN** the component renders
- **THEN** the English message is shown and the miss is reported through the
  frontend's normal error surface, not silently swallowed

### Requirement: Validation messages are localised, including interpolated ones

Client-side validation messages SHALL come from the catalogue. Messages that
embed a value — a field label, a limit — SHALL be produced by interpolating into
a single catalogue message, not by concatenating translated fragments, so word
order can differ between languages.

#### Scenario: An interpolated budget error
- **GIVEN** the app is in Portuguese
- **WHEN** the user enters `-500` into the planned budget field
- **THEN** the inline error is one Portuguese sentence naming that field, with
  the field name in the position Portuguese grammar requires

#### Scenario: Errors already on screen when the language changes
- **GIVEN** validation errors are displayed
- **WHEN** the display language changes
- **THEN** the errors are re-rendered in the new language without re-submitting
  the form

### Requirement: The document language attribute matches the display language

The document's `lang` attribute SHALL reflect the active language and SHALL be
updated when the user switches, so assistive technology announces the content
with the right pronunciation.

#### Scenario: Switching updates the attribute
- **GIVEN** the document reports `lang="en"`
- **WHEN** the user switches to Portuguese
- **THEN** the document reports `lang="pt-PT"`

### Requirement: Portuguese copy fits the existing layout

Portuguese runs materially longer than English. Localised copy SHALL fit the
design system's fixed dimensions — notably the 480px modal — without clipping,
overlapping or overflowing, and SHALL NOT be made to fit by reducing type below
the 13px floor or by inventing new tokens.

#### Scenario: The longest labels in the modal
- **GIVEN** the app is in Portuguese
- **WHEN** the expense form modal and the budget settings modal are open
- **THEN** every label, helper text and button caption is fully readable within
  the 480px width, with no clipped or overlapping text

#### Scenario: The summary strip figures
- **GIVEN** the app is in Portuguese
- **WHEN** the budget summary strip renders
- **THEN** its labels do not collide with their figures, and the figures remain
  tabular-aligned

### Requirement: The test suite proves both languages

The frontend suite SHALL exercise both languages rather than asserting one
language's copy. Tests SHALL NOT depend on a hardcoded user-visible English
string; they select by role, by catalogue lookup, or by a stable identifier.

#### Scenario: A component test under each language
- **GIVEN** the expenses screen
- **WHEN** the suite runs
- **THEN** it renders the screen in both `en` and `pt-PT` and asserts the
  language-specific behaviour of each

#### Scenario: Copy is reworded
- **GIVEN** an English message is reworded in the catalogue, with no behaviour change
- **WHEN** the suite runs
- **THEN** it still passes
