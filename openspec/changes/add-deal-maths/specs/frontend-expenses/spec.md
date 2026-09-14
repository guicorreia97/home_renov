# Delta: Frontend — the Lucro tab becomes a judgement

**Change ID:** `add-deal-maths`
**Affects:** `frontend/src/features/expenses/` (the profit view),
`frontend/src/api/`

> Written against the post-PART-7 screen. Five changes modify this capability
> before this one — `add-i18n-pt-en`, PART 1 `redesign-flip-desk-skin`, PART 2
> `add-deal-and-property`, PART 6 `add-acquisition-costs` and PART 7
> `add-financing-and-equity` — and this delta assumes all five have landed: the
> message catalogue exists, the screen is three views inside a shell, every
> request is deal-scoped, and the profit waterfall already carries acquisition
> costs and finance costs as lines.
>
> The requirement modified below is carried forward from PART 1, which authored
> it; PARTs 2, 6 and 7 modify other requirements of this capability but not this
> one, so PART 1's text is the latest and is what is copied here. PARTs 6 and 7
> extend the waterfall's sequence, and the sequence stated below assumes their
> lines are present.

---

## MODIFIED Requirements

### Requirement: The profit view states the deal's arithmetic

The profit view SHALL show headline figures, then the calculation as a
sequence — target sale price, less the costs of selling, giving the net
proceeds; less the purchase price, the acquisition costs, the forecast works
cost and the finance costs, giving the projected profit — followed by the
margin, the return on cost and the break-even sale price.

Every figure SHALL come from the API. The view SHALL NOT show a profit
projection derived from an incomplete cost base without the reader being able
to see which costs it contains: where the API reports the cost base incomplete,
the view SHALL name the missing components beside the figures rather than
elsewhere on the screen.

The sequence SHALL show each line's basis as the API states it — a rate and the
base it applies to, rather than a bare amount — so that a deduction can be
checked without opening the record behind it.

#### Scenario: No target sale price
- GIVEN `target_sale_price` is unset
- WHEN the profit view renders
- THEN it states that no target sale price is set and offers the action that
  sets one
- AND no profit, margin or return figure is shown, in place of a zero
- AND the break-even price is still shown, since it does not depend on the
  target

#### Scenario: A negative projection
- GIVEN the projected profit is negative
- WHEN the view renders
- THEN it is shown in the danger colour with its sign, never as an absolute
  value

#### Scenario: The cost of selling is visible as a line
- GIVEN an agency commission recorded as a rate with VAT
- WHEN the view renders
- THEN the commission appears as its own deduction between the sale price and
  the net proceeds
- AND its basis shows the agreed rate and the VAT rate, not only the resulting
  amount

## ADDED Requirements

### Requirement: The profit view discloses which costs its figures contain

The profit view SHALL show the state of every component of the cost base —
purchase price, acquisition costs, works, financing and exit costs — as the API
reports it, distinguishing a component that is **recorded**, one the user has
declared **not applicable**, and one that is **not entered**.

A component that is not entered SHALL be shown as missing and SHALL offer the
action that fills it in. It SHALL NOT be rendered as a zero amount, which reads
as a cost of nothing rather than as a cost unknown.

This disclosure SHALL be shown whenever the cost base is incomplete, which is
the ordinary state of a deal under evaluation. It SHALL be placed with the
figures it qualifies, not in a footnote below them.

#### Scenario: Acquisition costs not yet entered
- GIVEN the API reports the acquisition component as not entered
- WHEN the profit view renders
- THEN the figures are shown together with a statement that acquisition costs
  are missing from them
- AND an action leading to where they are recorded is offered
- AND no `0,00 €` appears in place of the acquisition total

#### Scenario: An all-cash deal reads as complete
- GIVEN financing is declared not applicable and every other component is
  recorded
- WHEN the profit view renders
- THEN the cost base reads as complete
- AND the financing component reads as not applicable rather than as missing

#### Scenario: The disclosure is rendered in the active language
- GIVEN the display language is `pt-PT`
- WHEN the disclosure renders
- THEN its copy and the component names come from the catalogue for that
  language, with no English copy remaining

### Requirement: The minimum-margin callout is shown only when a threshold exists, and never reassures over an incomplete base

Where the deal carries a minimum margin and the API reports it unmet, the view
SHALL show a callout worded from the returned figures — the margin achieved,
the threshold, the shortfall in money, the sale price that would meet it, and
the break-even price with its distance below the target.

Where no minimum margin is set, the view SHALL show no callout, no threshold
card and no verdict. It SHALL NOT substitute a conventional figure of its own.

Where the API withholds a verdict because the cost base is incomplete, the view
SHALL NOT display a met-threshold indication of any kind — no tick, no success
colour, no "meets minimum margin" label. It SHALL show the margin and state
that the verdict is withheld and why.

#### Scenario: Below the threshold
- GIVEN a margin of `14.43`, a threshold of `20`, a shortfall of `25900.00` and
  a required price of `500000.00`
- WHEN the view renders
- THEN the callout states all four, each from the API
- AND no figure in it is computed in the browser

#### Scenario: No threshold set
- GIVEN the deal has no minimum margin
- WHEN the view renders
- THEN no callout and no threshold card are shown
- AND the margin is still shown

#### Scenario: A withheld verdict
- GIVEN the API reports the cost base incomplete and withholds the verdict
- WHEN the view renders
- THEN no met-threshold indication is shown
- AND the reason the verdict is withheld is stated

### Requirement: The sensitivity grid is read from the API, never computed in the browser

The profit view SHALL show the sensitivity grid as a table of sale prices
against works outcomes, taking every cell's profit, margin and status from the
API. No arithmetic SHALL be applied to any money value to produce a cell,
including scaling one cell across a row or a column.

The cell matching the deal's current assumptions SHALL be marked as the base
case, and the figure it shows SHALL be the same one the headline projected
profit shows.

Cell emphasis SHALL follow the status the API reports — meets the threshold,
profitable but below it, or loss-making — and where the verdict is withheld no
cell SHALL carry the meets-threshold emphasis.

The grid SHALL scroll within its own bounds rather than widening the page, and
SHALL remain legible in both display languages at the shell's content width.

#### Scenario: A cell is never summed in the browser
- GIVEN the grid renders
- WHEN each cell's value is traced
- THEN it is a value returned by the API
- AND no arithmetic is applied to any money value to produce it

#### Scenario: The base cell matches the headline
- GIVEN the profit view renders both the headline profit and the grid
- WHEN the base cell is read
- THEN it shows the same figure as the headline projected profit

#### Scenario: No verdict emphasis over an incomplete base
- GIVEN the API withholds the verdict
- WHEN the grid renders
- THEN no cell is styled as meeting the threshold
- AND loss-making cells are still distinguished from profitable ones

### Requirement: The scenario switcher changes the view, not the deal

The profit view SHALL offer the deal's saved scenarios and the base case, and
selecting one SHALL re-render every figure on the view — the sequence, the
headline figures, the grid and the callout — under that scenario's assumptions.

Selecting a scenario SHALL NOT write to the deal's budget, expenses, exit costs
or threshold. The view SHALL state which scenario is active whenever it is not
the base case, so that no figure is read as the deal's own without qualification.

Returning to the base case SHALL restore the deal's own figures.

#### Scenario: Switching scenario re-renders everything
- GIVEN the base case is displayed
- WHEN a scenario assuming a higher sale price is selected
- THEN the sequence, headline figures, grid and callout all reflect it
- AND the active scenario is named on the view

#### Scenario: A scenario does not persist to the deal
- GIVEN a scenario is selected
- WHEN the deal's budget is then read
- THEN its target sale price is unchanged
- AND no update request was made by selecting the scenario

#### Scenario: Returning to the base case
- GIVEN a scenario is active
- WHEN the base case is selected
- THEN the deal's own figures are shown and no scenario is named as active
