# Delta: Acquisition costs

**Change ID:** `add-acquisition-costs`
**Affects:** `backend/app/src/models/`, `backend/app/src/repositories/`,
`backend/app/src/services/budget_service.py`, `backend/app/api/endpoints/`,
`frontend/src/api/`

> Written against the post-`add-deal-and-property` app (PART 2): every record
> here belongs to a deal and is addressed through it. It also assumes
> `redesign-flip-desk-skin` (PART 1) has archived. The corrections to
> `projected_profit`, `break_even_sale_price`, `margin_percent` and
> `return_on_cost_percent` are **not** here: they are requirements of this
> change's `budget-summary` delta, which is the capability PART 1 authored
> those figures in. One contract, one delta.

---

## Purpose

What closes with the deed rather than with the renovation: the taxes, fees and
commissions a buyer pays to acquire a property, how each one is recorded and
evidenced, and how they total. What that total then does to the profit,
break-even and ratio figures is `budget-summary`'s contract, not this one's.
This capability records and totals money that has already been decided
elsewhere; it is deliberately not a tax engine.

## ADDED Requirements

### Requirement: An acquisition cost is money spent to acquire, not to renovate

The system SHALL model an **acquisition cost** as a sum paid to take ownership
of a deal's property, over and above the purchase price. Acquisition costs SHALL
belong to a deal and SHALL be stored separately from that deal's expenses, so
that no acquisition cost is also an expense and no amount is counted twice.

An acquisition cost SHALL NOT contribute to any renovation figure: it SHALL be
absent from the committed, planned and forecast expense totals, from the
per-category breakdown, and from the budget-used percentage. The planned budget
is the budget for the works, and a purchase tax inside it would make the
percentage answer a question nobody asked.

Recurring costs of holding the property — municipal property tax, condominium
charges, insurance, utilities during the hold — SHALL NOT be recorded as
acquisition costs. They do not close with the deed, and admitting them would
make the acquisition total a different quantity each time it is read.

#### Scenario: An acquisition cost stays out of the works budget
- GIVEN a deal with a planned budget of `50000.00` and expenses forecasting
  `20000.00`
- WHEN an acquisition cost of `10205.00` is recorded for that deal
- THEN the forecast total, the per-category totals and the budget-used
  percentage are unchanged
- AND the acquisition cost appears in none of them

#### Scenario: Acquisition costs are not expenses
- GIVEN a deal with acquisition costs recorded
- WHEN that deal's expenses are listed
- THEN no acquisition cost is returned among them
- AND the expense categories offered when recording an expense do not include
  any acquisition-cost kind

#### Scenario: A cost belonging to another deal
- GIVEN an acquisition cost recorded on deal B
- WHEN it is requested through deal A
- THEN the response is 404 rather than the cost

#### Scenario: Deleting the deal takes its acquisition costs
- GIVEN a deal with acquisition costs recorded
- WHEN the deal is deleted
- THEN its acquisition costs are deleted with it and are addressable through no
  deal

### Requirement: Each cost carries its kind, its amount and the basis it was arrived at

An acquisition cost SHALL carry a **kind** drawn from a closed set covering the
transfer tax (IMT), stamp duty on the purchase (Imposto do Selo), notary and
deed costs, land-registry costs, legal fees, buyer-side agency commission, and
an explicit other, so that a cost with no matching kind can still be recorded
rather than being forced into a wrong one.

A cost SHALL carry a positive amount, the date it was incurred, and a
**basis** — free text stating how the figure was arrived at, in the user's own
words, such as an effective rate, a bracket, or "fixed fee". The basis SHALL be
treated as a note and never as a formula: the system SHALL NOT parse it,
recompute the amount from it, or reject a cost whose amount and basis disagree.

Where the same kind is paid more than once — two registry charges, two legal
invoices — the system SHALL allow more than one cost of that kind on a deal
rather than requiring one record per kind.

#### Scenario: Recording the transfer tax
- WHEN a cost is recorded with kind IMT, amount `10205.00`, its date, and the
  basis "effective rate 3.64% — bracket 2.2636% plus 7% on the excess"
- THEN all four are stored and returned unchanged
- AND the amount is exactly `10205.00`, not a figure derived from the basis text

#### Scenario: No statutory rate is applied
- GIVEN a deal with a purchase price recorded
- WHEN no acquisition cost has been entered
- THEN no IMT, stamp duty or any other cost is created or suggested as a stored
  value
- AND the acquisition total is zero rather than an estimate the system invented

#### Scenario: A kind outside the set
- WHEN a cost is recorded with a kind that is not in the closed set
- THEN it is rejected as invalid
- AND a cost that genuinely has no matching kind can be recorded under the
  explicit other kind with its own description

#### Scenario: Two costs of the same kind
- GIVEN a deal that already has a legal-fees cost recorded
- WHEN a second legal-fees cost is recorded
- THEN both are stored, both appear in the list, and the total includes both

#### Scenario: A non-positive amount
- WHEN a cost is recorded with an amount of `0` or a negative amount
- THEN it is rejected, because a cost that was not paid is not recorded as a
  cost of zero

### Requirement: A cost states whether it is settled or still an estimate

Every acquisition cost SHALL carry one of exactly two states: **estimated**,
meaning the figure is the user's forecast of what the deed will cost, and
**settled**, meaning the money has left and the figure is final.

Both states SHALL count towards the acquisition total and towards profit. An
estimated transfer tax is money that will be spent, and excluding it would
recreate the overstatement this capability exists to remove.

The settled and estimated portions SHALL remain distinguishable rather than
collapsed into one figure, so that a reader can see how much of the acquisition
base is still a forecast without subtracting one figure from another. Where
those portions are carried on the deal's summary response is specified in
`budget-summary`.

#### Scenario: A mixed acquisition base
- GIVEN a deal with a settled cost of `2680.00` and an estimated cost of
  `10205.00`
- WHEN the deal's acquisition totals are computed
- THEN the settled portion is `2680.00`, the estimated portion is `10205.00`,
  and the combined acquisition total is `12885.00`

#### Scenario: An estimate becomes settled
- GIVEN an estimated cost of `10205.00`
- WHEN it is settled at a final amount of `10318.40`
- THEN the settled portion rises by `10318.40`, the estimated portion falls by
  `10205.00`, and the combined total reflects the new amount
- AND the change is a change to the existing record, not a second cost

### Requirement: Each cost records the document that evidences it

An acquisition cost SHALL carry an optional reference to the document that
evidences it — the deed, the tax settlement, the notary's invoice — and an
optional counterparty, being who was paid.

A cost with no document reference SHALL report that absence explicitly rather
than as an empty value, so that an unevidenced cost is visibly unevidenced and
not mistaken for a rendering fault.

The basis, the document reference, the counterparty and any note attached to a
cost SHALL NOT be written to a log line, in keeping with the project's logging
rule. Identifiers, kinds and counts may be logged; the content may not.

#### Scenario: An evidenced cost
- WHEN a cost is recorded with a document reference and a counterparty
- THEN both are stored and returned with the cost

#### Scenario: An unevidenced cost
- GIVEN a cost whose document reference is unset
- WHEN it is read
- THEN the reference is reported as absent rather than as an empty string
- AND the cost is still valid and still counts towards the total

#### Scenario: Cost content never reaches the logs
- GIVEN an acquisition cost is created, updated or deleted
- WHEN the operation is logged
- THEN the log line carries the deal identifier, the cost identifier and the
  kind, and carries no basis text, document reference, counterparty or note

### Requirement: Acquisition costs total per deal, server-side

The system SHALL compute every acquisition total for a deal in exact decimal
arithmetic on the server, leaving none of it to a client, under the same rule
that already forbids a client from summing money. Which of those totals the
deal's summary response carries is `budget-summary`'s contract, not this
capability's.

The system SHALL also report the per-kind totals for a deal, in a stable order,
so that the interface can list what the deed cost without grouping the costs
itself. A kind with no cost recorded SHALL be absent from that breakdown rather
than present as a zero.

#### Scenario: Exactness survives the total
- GIVEN acquisition costs of `0.10` and `0.20`
- WHEN they are totalled
- THEN the total is exactly `0.30`

#### Scenario: A per-kind breakdown
- GIVEN a deal with two legal-fee costs of `600.00` and `400.00` and one
  notary cost of `2680.00`
- WHEN the breakdown is requested
- THEN legal fees report `1000.00`, notary reports `2680.00`, and no other kind
  appears

#### Scenario: The total is read, not recomputed
- GIVEN the acquisition card is displayed with its individual costs
- WHEN the card's heading total renders
- THEN it is a value returned by the API
- AND no arithmetic is applied to any amount in the client to produce it

#### Scenario: Totals are scoped to one deal
- GIVEN acquisition costs recorded on two deals
- WHEN one deal's totals are requested
- THEN they cover that deal's costs alone
