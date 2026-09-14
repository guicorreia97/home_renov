# Delta: Deal maths — exit costs, thresholds and scenarios

**Change ID:** `add-deal-maths`
**Affects:** `backend/app/src/models/`, `backend/app/src/repositories/`,
`backend/app/src/services/`, `backend/app/api/endpoints/`, `frontend/src/api/`

> Written against the app after PARTs 1, 2, 6 and 7 have archived:
> `redesign-flip-desk-skin` (the derived summary figures and the profit view),
> `add-deal-and-property` (the `deal_id` spine every record here hangs off),
> `add-acquisition-costs` (what closes with the deed) and
> `add-financing-and-equity` (the loan, its schedule and its interest). This
> delta is the judgement layer over those cost bases and is not worth applying
> without them — a margin computed over a cost base missing acquisition or
> finance costs is not conservative, it is wrong.

---

## Purpose

What it takes to decide whether a deal is worth doing: the costs of selling,
the price at which the deal makes nothing, the margin an investor will not go
below, and what happens to all of that if the sale price or the works come in
somewhere other than planned. Every figure is computed server-side against
exact decimals, and every figure states which costs it was computed over — a
judgement offered without that is a confident answer to a question nobody
asked.

## ADDED Requirements

### Requirement: Exit costs are recorded per deal and reduce what a sale yields

The system SHALL record, per deal, the costs of selling the property, and SHALL
subtract them from the sale price before any profit, margin or return is
reported. Selling a property is not free, and a profit figure that ignores the
cost of selling overstates the deal at the exit end exactly as omitting
acquisition costs overstates it at the entry end.

An exit cost SHALL carry a kind drawn from a closed set covering at least
agency commission, capital-gains tax, early-repayment charge, legal and
conveyancing, staging, and other; and SHALL be expressed either as a fixed
amount or as a rate over a named base, never as an unexplained number.

Where a cost is a rate over the sale price, the amount SHALL be derived from
the sale price under consideration rather than stored, so that changing the
sale price changes the cost. An agency commission SHALL be able to carry its
rate and its VAT rate separately, and the system SHALL derive the effective
deduction from the two, so the user records the terms they agreed rather than
an effective rate they had to compute.

Capital-gains tax SHALL be computed as a user-entered rate over a taxable gain
the system states — the sale price less the purchase price, the acquisition
costs and the qualifying works — and that gain SHALL be floored at zero, so a
loss-making deal never reports a negative tax that reads as a refund. The
system SHALL NOT derive a statutory rate or apply a statutory relief on the
user's behalf.

Every exit cost SHALL contribute a non-negative amount to the deal's costs.
Anything that increases what a sale yields is modelled as proceeds, never as a
negative cost.

#### Scenario: A commission expressed as a rate plus VAT
- GIVEN an agency commission of `5%` of the sale price with VAT at `23%`
- AND a sale price of `465000.00`
- WHEN the deal's exit costs are reported
- THEN the commission is reported as `28597.50`
- AND both the agreed rate and the VAT rate remain visible as the basis for it

#### Scenario: A rate-based cost follows the sale price
- GIVEN an exit cost expressed as a rate over the sale price
- WHEN the same deal is evaluated at two different sale prices
- THEN the cost differs between the two evaluations
- AND neither evaluation writes a derived amount back to the stored record

#### Scenario: A loss-making sale owes no capital-gains tax
- GIVEN a capital-gains rate is set
- AND the sale price under consideration is below the purchase price plus
  acquisition costs plus qualifying works
- WHEN the exit costs are reported
- THEN the capital-gains tax is `0.00` rather than a negative amount

#### Scenario: Settling the loan is not an exit cost
- GIVEN a financed deal with a balance outstanding at the target exit date
- WHEN the exit costs are reported
- THEN the outstanding balance is not among them
- AND only the charge for repaying early, where one applies, is reported as a
  cost
- AND the profit figure does not subtract the outstanding balance a second time

### Requirement: Every cost component declares whether it is recorded, not applicable, or not entered

The system SHALL report, alongside the figures it derives, the state of each
component of the cost base: the purchase price, the acquisition costs, the
works cost, the finance costs and the exit costs. Each component SHALL be in
exactly one of three states — **recorded**, meaning the deal holds figures for
it; **not applicable**, meaning the user has declared the deal has none of
these; or **not entered**, meaning nothing is known.

A component that is **not entered** SHALL NOT be treated as zero silently. The
system SHALL NOT infer "not applicable" from the absence of records: an
unfinanced deal and a financed deal whose loan has not been entered are
indistinguishable by their records and are not the same deal, and only the user
can say which this is.

A cost base SHALL be reported as **complete** only when every component is
either recorded or not applicable. This is the ordinary state of a deal being
evaluated, not an edge case: a deal typically acquires its acquisition costs
and its financing days or weeks after someone first wants to know what it makes.

#### Scenario: A deal with no acquisition costs entered
- GIVEN a deal with a purchase price, works expenses and exit costs recorded
- AND no acquisition cost record and no declaration that there are none
- WHEN the deal's maths is requested
- THEN the acquisition component reports `not entered`
- AND the cost base reports as incomplete
- AND the acquisition component contributes nothing rather than a zero
  presented as a total

#### Scenario: An all-cash deal
- GIVEN a deal the user has declared has no financing
- WHEN the deal's maths is requested
- THEN the finance component reports `not applicable`, not `not entered`
- AND the cost base can still report as complete

#### Scenario: Absence is not inferred
- GIVEN a deal with no financing record and no declaration either way
- WHEN the deal's maths is requested
- THEN the finance component reports `not entered`, never `not applicable`

### Requirement: A favourable judgement is withheld over an incomplete cost base

Where the cost base is incomplete, the system SHALL still report the arithmetic
it can — profit, margin, return, break-even — and SHALL mark every one of those
figures as computed over an incomplete cost base, naming the components missing.

The system SHALL NOT report that a deal **meets** a minimum-margin threshold
while its cost base is incomplete. Every component that can still be added is a
cost, so an incomplete cost base can only overstate profit; a figure that clears
the threshold today may not clear it once the missing costs arrive, and a
verdict of "meets" would be an unearned reassurance.

The system MAY report that a deal **fails** a threshold over an incomplete cost
base, because adding the missing costs can only lower the margin further. A
failing verdict over an incomplete base is sound and SHALL be reported.

#### Scenario: A flattering figure over an incomplete base
- GIVEN a minimum margin of `20` percent
- AND a margin of `24` percent computed over a cost base missing its
  acquisition costs
- WHEN the deal's maths is requested
- THEN the margin is reported, marked as computed over an incomplete cost base
- AND no verdict that the threshold is met is reported
- AND the missing component is named

#### Scenario: A failing figure over an incomplete base
- GIVEN a minimum margin of `20` percent
- AND a margin of `14.43` percent computed over a cost base missing its finance
  costs
- WHEN the deal's maths is requested
- THEN the threshold is reported as not met
- AND the figure remains marked as computed over an incomplete cost base

#### Scenario: A complete cost base
- GIVEN every component is recorded or declared not applicable
- WHEN the deal's maths is requested
- THEN the cost base reports as complete and the verdict is reported in both
  directions

### Requirement: The break-even sale price is the price at which the deal makes nothing

The system SHALL report the sale price at which the deal's projected profit is
zero. The reported price SHALL satisfy that property: evaluating the deal at
the break-even price SHALL give a projected profit of zero when rounded to the
cent.

Because exit costs vary with the sale price, the break-even price SHALL be
solved for rather than obtained by adding the exit costs computed at the target
price to the cost base. The two differ by the commission on the difference
between the two prices, and the second is wrong.

The system SHALL report the break-even price whenever the cost base holds any
cost, including when no target sale price is set — break-even does not depend
on the target. Where the deal's exit costs consume the whole sale price so that
no price breaks even, the system SHALL report that no break-even price exists
rather than a very large number.

#### Scenario: Break-even with a price-proportional commission
- GIVEN a cost base of `370000.00` before exit costs
- AND an agency commission of `6%` of the sale price, VAT included
- WHEN the deal's maths is requested
- THEN the break-even sale price is `393617.02`
- AND evaluating the deal at that price gives a projected profit of `0.00`

#### Scenario: Break-even is not the cost base plus commission at target
- GIVEN the same deal with a target sale price of `465000.00`
- WHEN the break-even price is compared with the cost base plus the commission
  computed at the target price
- THEN the two differ, and the reported break-even is the one whose profit is
  zero at that price

#### Scenario: No target sale price
- GIVEN a deal with costs recorded and no target sale price
- WHEN the deal's maths is requested
- THEN the break-even price is still reported
- AND the margin, the return and the gap to the minimum margin are absent
  rather than zero

### Requirement: A minimum margin is a per-deal input and is never defaulted

The system SHALL allow a minimum acceptable margin to be set per deal, as a
percentage of the sale price. It SHALL have no default: a deal with no minimum
margin set SHALL report no threshold, no gap and no required price, rather than
being judged against a figure the application invented.

Where a minimum margin is set, the system SHALL report the margin achieved, the
shortfall in money between the profit achieved and the profit the threshold
requires, and the sale price at which the threshold would be met. The reported
required price SHALL satisfy its property: evaluating the deal at that price
SHALL give a margin equal to the minimum margin.

The shortfall SHALL be reported as money and the margins as numbers, so that no
formatter can present a percentage as currency.

#### Scenario: A deal below its minimum margin
- GIVEN a cost base of `370000.00` before exit costs
- AND an agency commission of `6%` of the sale price, VAT included
- AND a target sale price of `465000.00` and a minimum margin of `20` percent
- WHEN the deal's maths is requested
- THEN the projected profit is `67100.00` and the margin is `14.43`
- AND the shortfall is `25900.00`
- AND the required sale price is `500000.00`
- AND evaluating the deal at `500000.00` gives a margin of `20`

#### Scenario: No minimum margin set
- GIVEN a deal with no minimum margin
- WHEN the deal's maths is requested
- THEN no threshold, shortfall, required price or verdict is reported
- AND the margin itself is still reported

#### Scenario: A threshold no price can meet
- GIVEN a minimum margin that the deal's exit-cost rates make unreachable at
  any sale price
- WHEN the deal's maths is requested
- THEN the system reports that no sale price meets the threshold rather than an
  arbitrarily large required price

### Requirement: Profit sensitivity is reported as a grid computed over the same cost base as the headline figure

The system SHALL report the projected profit across a grid of assumptions: a
range of sale prices spanning the target, against a range of works outcomes
spanning at least the works budget, the current works forecast and an overrun
above the budget.

Every cell SHALL be computed server-side over the same cost base, the same exit
costs and the same rules as the headline projected profit. The cell matching
the deal's current assumptions SHALL be identified in the response, and its
profit SHALL equal the projected profit reported for the deal. A grid whose
base cell disagrees with the headline figure is reporting two different deals.

Each cell SHALL carry its profit and its margin, and — subject to the withheld
-judgement rule — whether it meets the minimum margin. Cells SHALL NOT be
derived in the client by scaling one profit figure across a row or a column.

Where the cost base is incomplete, the grid SHALL carry the same
incomplete-cost-base marking as every other figure, so a nine-cell table of
confident numbers cannot be read without it.

#### Scenario: The base cell agrees with the headline
- GIVEN a deal with a target sale price and a works forecast
- WHEN the deal's maths is requested
- THEN one cell is identified as the base case
- AND its profit equals the projected profit reported for the deal

#### Scenario: The axes come from the deal's own figures
- GIVEN a works budget and a works forecast that differ
- WHEN the grid is reported
- THEN the works axis includes both, and an overrun case above the budget
- AND the sale-price axis spans the target sale price

#### Scenario: A cell below break-even
- GIVEN a sale price on the grid below the deal's break-even price
- WHEN the grid is reported
- THEN that cell's profit is negative and carries its sign

#### Scenario: The grid over an incomplete cost base
- GIVEN a cost base missing its finance costs
- WHEN the grid is reported
- THEN every cell is marked as computed over an incomplete cost base
- AND no cell reports that the minimum margin is met

### Requirement: A scenario is a saved set of assumptions that never changes what is stored

The system SHALL allow named scenarios to be saved per deal, each carrying the
assumptions it varies — the sale price and the works basis at least — and SHALL
report the deal's maths under any one of them.

Evaluating or saving a scenario SHALL NOT alter the deal's stored budget, its
expenses, its exit costs or its threshold. A scenario is an overlay on the
deal's own figures, and the deal's own figures remain the base case, which
SHALL always be available to return to.

Scenario names are user content. They SHALL NOT be written to a log line; log
records SHALL carry the deal identifier, the scenario identifier and counts
only, in keeping with the project's logging rule.

#### Scenario: Evaluating a scenario leaves the deal alone
- GIVEN a deal with a target sale price of `465000.00`
- WHEN a scenario assuming a sale price of `485000.00` is evaluated
- THEN the maths is reported under `485000.00`
- AND the deal's stored target sale price is still `465000.00`

#### Scenario: Returning to the base case
- GIVEN a scenario has been evaluated
- WHEN the base case is requested
- THEN the maths reported is that of the deal's own stored figures

#### Scenario: A scenario belongs to one deal
- GIVEN a scenario saved on deal A
- WHEN deal B's scenarios are listed
- THEN it is not among them

#### Scenario: Scenario names stay out of the logs
- GIVEN a scenario is created, evaluated or deleted
- WHEN the operation is logged
- THEN the log record carries identifiers and counts and no scenario name

### Requirement: Every figure is computed server-side, money exactly and ratios as numbers

Every figure this capability reports SHALL be computed server-side in exact
decimal arithmetic under the existing money discipline, extending the guarantee
already made for the budget summary. No client may sum, subtract, divide or
compare money values to produce a figure it displays, including the cells of
the sensitivity grid and the shortfall to a threshold.

Money-valued figures SHALL be quantised to two places half-up. Ratios —
margins, returns, threshold percentages — SHALL be returned as numbers, not as
decimal strings.

Exactly one projected profit SHALL exist for a deal. Where the same figure is
reported by more than one response, the responses SHALL agree; the profit shown
beside the expense summary and the profit shown by the deal's maths SHALL be
the same value, computed once.

#### Scenario: The two responses agree
- GIVEN a deal with exit costs, acquisition costs and finance costs recorded
- WHEN the expense summary and the deal's maths are both requested
- THEN the projected profit is identical in both

#### Scenario: Exactness survives the exit costs
- GIVEN a sale price of `465000.00` and an exit cost rate that yields a
  fractional cent
- WHEN the profit is reported
- THEN it is quantised to two places half-up, and the grid's base cell carries
  that same quantised value

#### Scenario: A ratio is not a currency
- GIVEN a margin of `14.43` percent
- WHEN the deal's maths is requested
- THEN the margin is a number and not a decimal string
