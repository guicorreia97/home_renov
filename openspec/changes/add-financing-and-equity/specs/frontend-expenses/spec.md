# Delta: Frontend — Finance cost in the waterfall, settlement beside it

**Change ID:** `add-financing-and-equity`
**Affects:** `frontend/src/features/expenses/ExpensesScreen.tsx`,
`frontend/src/features/expenses/` (the profit view and the financing card),
`frontend/src/api/`

> "The profit view states the deal's arithmetic" is authored by
> `redesign-flip-desk-skin` (PART 1) and is not in
> `openspec/specs/frontend-expenses/spec.md` yet, so the block below is copied
> from PART 1's delta. PART 1 and `add-deal-and-property` (PART 2) must both
> archive before this delta, and the message catalogue from the archived
> `add-i18n-pt-en` is assumed present.
>
> `add-acquisition-costs` (PART 6) modifies the same waterfall requirement to
> add its own line. The two edits are additive and independent; whichever lands
> second keeps the other's line.

---

## MODIFIED Requirements

### Requirement: The profit view states the deal's arithmetic

The profit view SHALL show headline figures, then the calculation as a
sequence — target sale price, less purchase price, less forecast works cost,
less the finance cost to exit, giving the projected profit — followed by the
margin, the return on cost, the return on equity and the break-even sale price.

The finance cost line SHALL be the API's finance cost to exit, and SHALL be
labelled as interest and fees. The view SHALL NOT place the exit settlement, the
debt service or the principal repaid in the sequence, since none of those
reduces profit.

The exit settlement SHALL be shown, but outside the profit sequence and labelled
as what is owed on completion rather than as a cost. Where the settlement is
displayed, the view SHALL make visible that the balance within it is money
being returned rather than money being spent.

Every figure SHALL come from the API. The view SHALL NOT show a profit
projection derived from an incomplete cost base without the reader being able
to see which costs it contains.

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

#### Scenario: The finance cost is a line and the settlement is not
- GIVEN a financed deal with a finance cost to exit of `9125.56` and an exit
  settlement of `249809.09`
- WHEN the profit view renders
- THEN `9125.56` appears as a subtracted line in the sequence
- AND `249809.09` appears outside the sequence, subtracted from nothing

#### Scenario: A financed deal with no exit date
- GIVEN a financed deal whose target exit date is unset, for which the API
  reports the projected profit as absent
- WHEN the profit view renders
- THEN it states that the exit date is needed before a profit can be shown, and
  offers the action that sets it
- AND no profit, margin or return figure is rendered in its place

#### Scenario: An all-cash deal
- GIVEN a deal with no loan
- WHEN the profit view renders
- THEN no finance cost line and no settlement are shown, rather than lines
  reading `0,00 €`

#### Scenario: Return on equity sits beside return on cost
- GIVEN the API reports both ratios
- WHEN the view renders
- THEN both are shown and each is labelled by the base it is taken on
- AND neither is formatted as currency

## ADDED Requirements

### Requirement: The financing card separates what was borrowed from what it cost

The expenses view SHALL carry a financing card for a financed deal, showing the
loan's costs — the interest to date and to exit, and each fee with the basis it
was charged on, as the API returned them.

The card SHALL state plainly that the principal repaid over the holding period
is not a cost and that it reduces the balance settled on the sale, naming both
figures. This sentence is the card's reason for existing: it is the one place
the application explains the distinction that every profit figure depends on.

The card SHALL NOT render for a deal with no loan.

No amount on the card SHALL be computed in the client. Totals, subtotals, the
interest split and every fee come from the API.

#### Scenario: The card states the distinction
- GIVEN a loan whose principal repaid over the window is `2190.91` and whose
  balance at exit is `249809.09`
- WHEN the financing card renders
- THEN it states that the `2190.91` is not a cost and that it reduces the
  balance settled on sale to `249809.09`

#### Scenario: Fees show their basis
- GIVEN an arrangement fee of `1260.00` charged at `0.500` percent of the
  principal
- WHEN the card renders
- THEN the fee is shown with the basis the API returned, not as a bare amount

#### Scenario: Interest to date and to exit are both shown
- GIVEN interest to date of `3153.68` against interest to exit of `5037.65`
- WHEN the card renders
- THEN both are shown and distinguished, so the paid portion is not mistaken for
  the total

#### Scenario: An all-cash deal has no card
- GIVEN a deal with no loan
- WHEN the expenses view renders
- THEN no financing card is rendered, rather than a card of zeroes

#### Scenario: Both languages
- GIVEN the financing card and its explanatory sentence
- WHEN the view is rendered under `en` and under `pt-PT`
- THEN every string resolves from the catalogue, with no untranslated key and no
  English copy left under `pt-PT`
