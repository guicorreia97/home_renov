# Delta: Frontend — What the deed cost

**Change ID:** `add-acquisition-costs`
**Affects:** `frontend/src/api/`,
`frontend/src/features/expenses/ExpensesScreen.tsx`,
`frontend/src/features/expenses/useExpensesData.ts`,
`frontend/src/i18n/messages.en.ts`, `frontend/src/i18n/messages.pt.ts`

> Four changes modify this capability before this one: `add-i18n-pt-en` and
> `redesign-flip-desk-skin` (PART 1) have authored the text copied below,
> and `add-deal-and-property` (PART 2) scopes the screen to a selected deal.
> Both requirements modified here are copied from PART 1's delta, which is the
> latest text for each — PART 2 modifies neither. This delta assumes PARTs 1
> and 2 have archived.

---

## MODIFIED Requirements

### Requirement: Money never becomes a JavaScript number

Amounts cross the wire as strings and stay strings for the whole of their life in
the client. No code path applies `Number()`, `parseFloat`, or arithmetic to a
`Money` value; formatting operates on the string.

This extends to every figure the new views display. Group subtotals, grand
totals, category shares, margin, return on cost and the break-even price are
**read from the deal's summary**, never computed in the client from the
expense list — including when a filter is active, where a client-side sum would
be the obvious shortcut.

It extends to the acquisition figures on the same terms. The acquisition total,
its settled and estimated portions and its per-kind lines are read from the API.
Summing the acquisition card's own rows to produce its heading total SHALL NOT
be done, even though every addend is already on screen.

#### Scenario: Editing an expense preserves its exact amount
- GIVEN an expense of `1234.50`
- WHEN the user opens it for editing and saves without touching the amount
- THEN the `PATCH` body carries `"1234.50"` byte-identical to what was received

#### Scenario: A trailing-zero amount survives display
- GIVEN an amount of `100.00`
- WHEN it is rendered in the table
- THEN it displays with both decimal places, not as `100`

#### Scenario: A subtotal is never summed in the browser
- GIVEN a grouped table showing per-category subtotals
- WHEN the view renders
- THEN each subtotal is a value returned by the API
- AND no arithmetic is applied to any `Money` value to produce it

#### Scenario: The acquisition card's total is not summed in the browser
- GIVEN an acquisition card listing three costs
- WHEN its heading total renders
- THEN it is the total returned by the API
- AND removing one row from the response changes the heading only because the
  API returned a different total, not because the client re-added the rows

### Requirement: The profit view states the deal's arithmetic

The profit view SHALL show headline figures, then the calculation as a
sequence — target sale price, less purchase price, **less acquisition costs**,
less forecast works cost, giving the projected profit — followed by the margin,
the return on cost and the break-even sale price.

The acquisition line SHALL sit with the purchase price rather than with the
works, because it is part of what the property cost to buy, and SHALL state how
much of it is still an estimate rather than settled.

Every figure SHALL come from the API. The view SHALL NOT show a profit
projection derived from an incomplete cost base without the reader being able
to see which costs it contains — so where no acquisition cost has been
recorded, the view SHALL say that the acquisition base is empty rather than
showing a line reading zero, which is indistinguishable from a base that was
checked and found to be nil.

#### Scenario: No target sale price
- GIVEN `target_sale_price` is unset
- WHEN the profit view renders
- THEN it states that no target sale price is set and offers the action that
  sets one
- AND no profit, margin or return figure is shown, in place of a zero

#### Scenario: A negative projection
- GIVEN the projected profit is negative
- WHEN the view renders
- THEN it is shown in the danger colour with its sign, never as an absolute
  value

#### Scenario: The acquisition line appears in the sequence
- GIVEN a deal with acquisition costs totalling `15125.00`
- WHEN the profit view renders
- THEN the sequence carries an acquisition line of `15125.00` between the
  purchase price and the works forecast
- AND the projected profit shown is the one the sequence arrives at

#### Scenario: An acquisition base that is still an estimate
- GIVEN acquisition costs of which `10205.00` is estimated and `2680.00` is
  settled
- WHEN the profit view renders
- THEN the acquisition line states that part of it is an estimate, with the
  estimated portion identifiable

#### Scenario: Nothing recorded yet
- GIVEN a deal with a target sale price and no acquisition cost recorded
- WHEN the profit view renders
- THEN it states that no acquisition cost has been recorded and offers the
  action that records one
- AND it does not render an acquisition line of zero

## ADDED Requirements

### Requirement: The expenses view shows what closed with the deed

The expenses view SHALL carry an acquisition card headed with the deal's
acquisition total and subtitled with the purchase price it sits on top of, then
one row per recorded cost showing the kind, the basis as the user wrote it, and
the amount.

Costs SHALL be creatable, editable and deletable from that card. A cost SHALL
show whether it is settled or estimated, and a cost with no document reference
SHALL render that absence explicitly, on the same terms the ledger already
applies to a missing invoice reference.

All chrome the card introduces — its heading, its subtitle, the kind labels, the
state labels and the absent-reference placeholder — SHALL come from the message
catalogue in the active display language. The basis, the document reference and
the counterparty are user content and SHALL be rendered as entered, never
translated.

#### Scenario: The card lists the deed costs
- GIVEN a deal with three acquisition costs recorded
- WHEN the expenses view renders
- THEN the card shows three rows with their kinds, bases and amounts, and a
  heading total returned by the API

#### Scenario: An empty card
- GIVEN a deal with no acquisition cost recorded
- WHEN the expenses view renders
- THEN the card shows an explicit empty state with the action that records the
  first cost, not a zero total presented as a result

#### Scenario: Recording a cost updates the figures
- GIVEN the expenses view with the card displayed
- WHEN the user records a new acquisition cost
- THEN the card, the deal's summary and the profit view's projected profit are
  all re-fetched, and none of them is left showing the previous total

#### Scenario: A cost without a document reference
- GIVEN an acquisition cost whose document reference is unset
- WHEN its row renders
- THEN that field shows an explicit placeholder rather than an empty space

#### Scenario: Both languages
- GIVEN the acquisition card rendered under `en` and under `pt-PT`
- WHEN each renders
- THEN every label comes from the catalogue for that language, no untranslated
  key appears, and no English copy remains under `pt-PT`
- AND the basis text the user entered is unchanged in both

#### Scenario: No deal selected
- GIVEN a fresh install with no deals
- WHEN the expenses view renders
- THEN no acquisition-cost request is made
