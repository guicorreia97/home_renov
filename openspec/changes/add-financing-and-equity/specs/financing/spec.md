# Delta: Financing, debt service and equity

**Change ID:** `add-financing-and-equity`
**Affects:** `backend/app/src/models/`, `backend/app/src/repositories/`,
`backend/app/src/services/`, `backend/app/api/endpoints/`, `frontend/src/api/`

> Written against the post-`add-deal-and-property` backend (PART 2): financing
> hangs off a `deal_id`, is addressed under `/deals/{deal_id}/…`, and is stored
> in that deal's directory. It also assumes `redesign-flip-desk-skin` (PART 1)
> has archived, since that change established that every figure a screen shows
> is computed server-side in `Decimal` and that ratios cross the wire as numbers.
>
> `add-acquisition-costs` (PART 6) is **not** a prerequisite. Both changes add a
> term to the same profit calculation and both report the composition of what
> they compute, so whichever lands second adds its term without removing the
> other's.
>
> The contract on `BudgetSummary` — that `projected_profit` subtracts the
> finance cost to exit, subtracts nothing else the loan produces, and is absent
> where a financed deal has no exit date — is asserted once, in this change's
> `budget-summary` delta, and deliberately not here. What this delta owns is the
> loan: its terms, its schedule, the classification that makes the finance cost
> the only term profit may take, the exit settlement and equity.

---

## Purpose

The loan behind a deal: its terms, the repayment schedule derived from them,
which parts of it are costs and which are transfers, what is owed when the
property sells, and how much of the user's own cash is actually in the deal.
Getting the cost/transfer split wrong makes every profit figure in the
application wrong, so this capability defines it arithmetically rather than
descriptively.

## ADDED Requirements

### Requirement: A deal is financed by at most one loan

The system SHALL allow a deal to record one loan, and SHALL NOT allow a second
loan on the same deal. A deal with no loan is an all-cash deal and SHALL remain
fully usable.

A loan SHALL carry the principal drawn, the annual rate expressed as an index
rate plus a spread, the contractual term in whole months, the drawdown date, and
the repayment product — either an amortising annuity or interest-only.

The rate SHALL be recorded as a rate, not as money: it is held to at least three
decimal places of a percent, and it SHALL NOT be quantised to two decimal
places, which is the precision money uses.

The loan's terms are user content in the sense of the project's logging rule:
log lines about a loan SHALL carry the deal identifier and SHALL NOT carry the
principal, the rate, the lender or the schedule.

#### Scenario: Recording a loan
- GIVEN a deal with no financing
- WHEN a loan of `252000.00` is recorded at an index rate of `2.310` percent
  plus a spread of `0.700` percent, over a term of `480` months, amortising
- THEN the loan is stored against that deal
- AND its annual rate is reported as `3.010` percent, the two components summed
  at rate precision rather than rounded to `3.01`

#### Scenario: A second loan is refused
- GIVEN a deal that already has a loan
- WHEN another loan is recorded against it
- THEN the request is refused and the existing loan is unchanged

#### Scenario: The terms never reach the logs
- GIVEN a loan is recorded, read, updated or deleted
- WHEN the operation is logged
- THEN the log line carries the deal identifier and no principal, rate, lender
  or schedule detail

### Requirement: The repayment schedule is derived from the terms, never entered

The system SHALL derive the repayment schedule from the loan's terms. No period
of the schedule SHALL be user-entered, and the monthly payment SHALL NOT be
stored — storing it would let it disagree with the terms it is supposed to
follow.

For an amortising loan the monthly payment SHALL be the annuity payment over the
contractual term. For an interest-only loan the payment SHALL be the period's
interest and the balance SHALL NOT reduce.

Each period SHALL report its due date, its opening balance, the interest
accrued, the principal repaid, the payment, and the closing balance.

**The contractual term is not the holding period.** The schedule runs over the
loan's term; the deal exits on the deal's target exit date. Figures SHALL be
reported as at two moments — *to date*, covering periods due on or before today,
and *to exit*, covering periods due on or before the target exit date.

#### Scenario: An amortising loan held far short of its term
- GIVEN a loan of `252000.00` at `3.010` percent over `480` months, amortising
- WHEN the schedule is derived
- THEN the monthly payment is `903.57`
- AND after eight periods the interest accrued is `5037.65`, the principal
  repaid is `2190.91`, and the balance outstanding is `249809.09`

#### Scenario: An interest-only loan
- GIVEN a loan of `252000.00` at `3.010` percent, interest-only
- WHEN the schedule is derived
- THEN each period's payment is `632.10`, all of it interest
- AND the balance after every period is still `252000.00`

#### Scenario: Figures to date and figures to exit differ
- GIVEN an eight-month holding period of which five periods have fallen due
- WHEN the financing figures are requested
- THEN the interest to date is `3153.68` and the interest to exit is `5037.65`
- AND the two are reported as distinct figures, not as one

#### Scenario: The exit date falls beyond the loan's term
- GIVEN a target exit date after the final period of an amortising loan
- WHEN the figures to exit are computed
- THEN the balance outstanding at exit is `0.00` and no period beyond the term
  is invented

#### Scenario: No target exit date
- GIVEN a financed deal whose target exit date is unset
- WHEN the financing figures are requested
- THEN every *to exit* figure is absent rather than `0.00`, and the figures to
  date are still reported

### Requirement: Financing arithmetic is exact decimal arithmetic

Every monetary figure in this capability SHALL be computed in `Decimal` and
quantised to two decimal places half-up, under the existing money types. No
financing figure SHALL be produced by, or pass through, a binary floating-point
value at any point in its derivation — including the exponentiation in the
annuity formula and the accumulation of interest across periods.

Interest SHALL be quantised once per period, from that period's opening balance,
so that the schedule is a sequence of exact cent amounts rather than a running
unrounded quantity rounded at the end.

Rates and ratios SHALL NOT be quantised to money precision. They are returned
to the client as numbers, never as decimal strings, so that nothing downstream
can format a percentage as currency.

#### Scenario: A rate quantised as money would erase the interest
- GIVEN a monthly rate of `3.010` percent divided by twelve
- WHEN the rate is held at rate precision
- THEN interest accrues
- AND had the rate been quantised to two decimal places it would have been
  `0.00` and every interest figure zero, which is why rates are never quantised

#### Scenario: Each period reconciles exactly
- GIVEN any period of an amortising schedule
- WHEN its figures are read
- THEN the interest plus the principal equals the payment exactly, with no
  residual cent
- AND the closing balance equals the opening balance less the principal

#### Scenario: The window reconciles exactly
- GIVEN eight periods of a loan whose payment is `903.57`
- WHEN the window's figures are summed
- THEN the interest to exit plus the principal repaid equals `7228.56`, which is
  the payment multiplied by eight
- AND the principal repaid equals the principal drawn less the balance
  outstanding

#### Scenario: Ratios are numbers
- GIVEN a loan of `252000.00` against a purchase price of `280000.00`
- WHEN the loan-to-price ratio is reported
- THEN it is the number `90.0`, not the string `"90.00"`

### Requirement: A fee states the basis it is charged on

Each fee on a loan SHALL carry its kind, the basis it is charged on and the
value of that basis, so the interface can state how the fee was arrived at
rather than presenting a bare amount.

A basis SHALL be one of: a fixed amount; a rate on the principal; a rate on the
interest accrued; or a rate on the interest accrued plus the bank's commissions.

A fee charged on interest and commissions SHALL compute over the interest
accrued plus those fees whose kind is a bank commission. It SHALL NOT include
itself, and SHALL NOT include another fee charged on the same basis — a fee may
never enter its own basis.

Timing follows the basis: a fee charged on interest accrues as the interest
does; every other fee is charged at drawdown; an early-repayment charge is
charged at exit.

#### Scenario: A rate on the principal
- GIVEN a loan of `252000.00` and an arrangement fee of `0.500` percent of the
  principal
- WHEN the fee is computed
- THEN it is `1260.00` and its stated basis names the principal it was taken on

#### Scenario: A fee on interest and commissions
- GIVEN interest to exit of `5037.65`, a valuation fee of `350.00` and an
  arrangement commission of `1260.00`, and a stamp duty of `4.000` percent
  charged on interest and commissions
- WHEN the stamp duty is computed
- THEN it is `265.91`
- AND it is computed over `6647.65`, excluding itself and excluding the stamp
  duty charged on the drawdown, which is not a bank commission

#### Scenario: A fee on interest moves with the exit date
- GIVEN a fee charged on the interest accrued
- WHEN the target exit date is brought forward
- THEN the fee is recomputed against the smaller interest figure rather than
  keeping the amount it had

### Requirement: Interest and fees are costs; principal is not

This is the correctness heart of the capability. The system SHALL classify every
movement on a loan into exactly one of three kinds, and SHALL NOT let a figure
of one kind be used where another is meant:

- **Costs** — the interest accrued and every fee, including any early-repayment
  charge. These reduce profit.
- **Transfers** — the principal repaid. It SHALL NOT reduce profit. It reduces
  the balance that is settled when the property sells.
- **Neither** — the drawdown of the principal. It SHALL NOT be recorded as
  income, as revenue, or as a negative cost.

The system SHALL report the finance cost and the debt service as separate
figures and SHALL NOT present one as the other. The finance cost is interest
plus fees; the debt service is the cash paid over the window, which is interest
plus principal plus the fees settled.

Finance costs SHALL be derived from the loan and SHALL NOT be written into the
expense ledger. An expense whose payment method records that it was settled from
the loan SHALL be treated exactly as any other expense of its amount — the
payment method is a settlement tag and changes no total.

#### Scenario: The two figures are not the same number
- GIVEN interest to exit of `5037.65`, fees of `4087.91`, and eight payments of
  `903.57`
- WHEN the figures are reported
- THEN the finance cost to exit is `9125.56` and the debt service to exit is
  `7228.56` plus the fees settled
- AND neither figure is presented as the other

#### Scenario: Repaying principal does not cost anything
- GIVEN a deal whose loan has repaid `2190.91` of principal
- WHEN the projected profit is computed
- THEN that `2190.91` does not appear in it
- AND the balance settled on exit is lower by exactly that amount

#### Scenario: The drawdown is not income
- GIVEN a loan of `252000.00` is drawn
- WHEN every figure on the deal is read
- THEN no revenue, income or negative cost of `252000.00` appears anywhere

#### Scenario: A works expense settled from the loan
- GIVEN a works expense of `4000.00` whose payment method records financing
- WHEN the deal's totals are computed
- THEN the works total includes `4000.00` exactly as it would for a cash payment
- AND no interest or fee is derived from that expense

#### Scenario: Finance costs are not ledger entries
- GIVEN a financed deal
- WHEN its expenses are listed
- THEN no expense representing interest, an arrangement fee or a stamp duty on
  the loan has been created by the system

### Requirement: The exit settlement states what is owed when the property sells

The system SHALL report the exit settlement: the balance outstanding on the
target exit date plus any early-repayment charge. This is the amount that leaves
the sale proceeds before the user sees any of them.

The settlement SHALL be decomposed, because its parts are not alike: the balance
outstanding is a transfer and is not a cost, while the early-repayment charge is
a cost and enters the finance cost.

An early-repayment charge SHALL be user-entered, as an amount or as a rate on
the capital repaid, and SHALL default to absent. The system SHALL NOT apply a
statutory rate of its own.

#### Scenario: The settlement and its parts
- GIVEN a loan whose balance outstanding at exit is `249809.09` and which
  carries no early-repayment charge
- WHEN the exit settlement is reported
- THEN it is `249809.09`, of which `249809.09` is balance and `0.00` is charge
- AND the balance does not appear in the projected profit

#### Scenario: An early-repayment charge
- GIVEN an early-repayment charge is recorded
- WHEN the figures are computed
- THEN the charge is added to the exit settlement and to the finance cost
- AND the balance outstanding is unchanged by it

#### Scenario: No charge is invented
- GIVEN a loan with no early-repayment charge recorded
- WHEN the exit settlement is reported
- THEN no charge is derived from a statutory rate, and the settlement is the
  balance alone

### Requirement: Equity is the cash the user actually has in the deal

The system SHALL report equity as the user's own cash committed to the deal:
the down payment, plus acquisition costs, plus works paid, plus the loan fees
settled, plus the debt service paid. The down payment is the purchase price less
the principal drawn.

Equity SHALL be reported as a breakdown of its named components alongside its
total, so a reader can see what the figure contains. A total SHALL NOT be shown
without the composition being available, since a component the application
cannot yet source would otherwise be invisible.

Two equity figures SHALL be reported and kept distinct: equity invested to date,
and equity at exit. Return on equity SHALL be the projected profit over equity
at exit, so that a projected numerator is not divided by a cash-to-date
denominator.

The down payment SHALL be a signed figure: a loan larger than the purchase price
funds part of the works and genuinely reduces the cash committed, and reporting
that as zero would overstate the equity.

Equity SHALL be absent rather than zero where the purchase price is unset, since
the down payment is then unknown.

#### Scenario: Equity at exit
- GIVEN a purchase price of `280000.00`, a principal of `252000.00`,
  acquisition costs of `15125.00`, works of `36750.00`, loan fees of `4087.91`
  and debt service of `7228.56`
- WHEN equity at exit is reported
- THEN the down payment is `28000.00` and the total is `91191.47`
- AND each of the five components is reported alongside the total

#### Scenario: Principal repaid is cash in, and nets out
- GIVEN debt service that includes `2190.91` of principal repaid
- WHEN equity and the exit settlement are read together
- THEN the `2190.91` raises the equity and lowers the settlement by the same
  amount, so the deal's profit is unchanged by it

#### Scenario: Return on equity uses the matching denominator
- GIVEN a projected profit of `123999.44` and equity at exit of `91191.47`
- WHEN the return on equity is reported
- THEN it is the number `135.98`
- AND it is not computed against the equity invested to date

#### Scenario: No purchase price
- GIVEN a deal whose purchase price is unset
- WHEN equity is requested
- THEN it is absent rather than `0.00`, and the missing purchase price is the
  stated reason

### Requirement: The accrual profit and the cash reconciliation agree

The projected profit computed as costs against the sale price SHALL equal the
projected profit computed as cash: the sale proceeds less the exit settlement,
less the equity committed. The two SHALL agree to the cent.

This identity is the guarantee that the cost/transfer split is coherent. A sign
error, a double count, or principal leaking into the cost base breaks it, and it
SHALL be verified by test rather than by inspection.

#### Scenario: Both routes give the same profit
- GIVEN a sale price of `465000.00`, a purchase price of `280000.00`,
  acquisition costs of `15125.00`, works of `36750.00`, a finance cost to exit
  of `9125.56`, an exit settlement of `249809.09` and equity at exit of
  `91191.47`
- WHEN the profit is computed by subtracting costs from the sale price
- THEN it is `123999.44`
- AND computing it as `465000.00` less `249809.09` less `91191.47` gives
  `123999.44` as well

#### Scenario: Double counting is caught
- GIVEN the exit settlement is subtracted from the profit in addition to the
  finance cost
- WHEN the reconciliation is checked
- THEN the two routes disagree and the check fails

### Requirement: An unfinanced deal is reported as unfinanced, not as a zero-rate loan

The system SHALL distinguish a deal with no loan from a loan whose figures
happen to be zero. A loan SHALL be recorded explicitly and SHALL NOT be created
empty on first read.

For a deal with no loan, the loan's own figures — principal, rate, term,
payment, balance — SHALL be absent, while figures that are genuinely zero for an
all-cash deal SHALL be reported as `0.00`: the finance cost, the debt service
and the exit settlement.

Deleting the loan SHALL return the deal to the all-cash state and SHALL restore
every figure the loan was contributing to, leaving no residue.

#### Scenario: An all-cash deal
- GIVEN a deal with no loan
- WHEN its financing figures are requested
- THEN it is reported as unfinanced, the principal and rate are absent, and the
  finance cost, debt service and exit settlement are each `0.00`
- AND equity is still reported, its down payment being the whole purchase price

#### Scenario: A loan is not conjured by reading
- GIVEN a deal that has never had a loan recorded
- WHEN its financing is read repeatedly
- THEN no loan is created and it stays unfinanced

#### Scenario: Removing the loan
- GIVEN a financed deal whose projected profit carries a finance cost
- WHEN the loan is deleted
- THEN the deal is unfinanced, the finance cost is `0.00`, and the projected
  profit returns to its unfinanced value

### Requirement: Financing is addressed through the deal that owns it

Financing SHALL be read and written under the deal it belongs to. A request
naming a deal that does not exist SHALL be refused as not found, and SHALL NOT
fall back to another deal's loan or create one implicitly.

A deal's financing figures SHALL cover that deal alone. Deleting a deal SHALL
delete its financing with it.

#### Scenario: An unknown deal
- WHEN financing is requested for a deal identifier that does not exist
- THEN the response is 404 and no financing is returned

#### Scenario: Loans are isolated between deals
- GIVEN deal A is financed and deal B is not
- WHEN deal B's financing figures are requested
- THEN deal B is reported as unfinanced and none of deal A's figures appear

#### Scenario: Deleting a financed deal
- GIVEN a deal with a loan
- WHEN the deal is deleted
- THEN its loan is deleted with it and other deals' loans are untouched
