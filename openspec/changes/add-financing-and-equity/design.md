# Design: Financing, debt service and equity

## Context

See `proposal.md` — Why. The constraints that shape the approach:

- **The cost base is currently three terms.** `_projected_profit` is
  `target_sale_price - purchase_price - total_forecast`
  (`backend/app/src/services/budget_service.py:85-95`). Financing appears
  nowhere in it, so a leveraged deal and an all-cash deal report the same
  profit.
- **`PaymentMethod.FINANCING` already exists** (`app/src/models/expense.py:33`)
  and means only "settled from the loan". It carries no principal, rate or
  term, and it must not start to: an expense tagged that way is still an
  expense of its full amount.
- **Money is `Decimal`, quantised 2dp half-up** (`app/src/models/money.py:1-20`),
  `Money` is `ge=0` and `SignedMoney` is not. A down payment can be negative
  when the loan exceeds the purchase price, so it cannot be `Money`.
- **Ratios are numbers, not decimal strings.** `budget_used_percent` is a real
  `float` (`app/src/models/budget.py:56`) and PART 1's design fixed that as the
  precedent. Leverage and return on equity follow it.
- **PART 2 has already decided the spine**: `/deals/{deal_id}/…`, a directory
  per deal on disk, `deal_id` first on every repository method, an unknown deal
  is a 404. Financing attaches to that and introduces no new shape.
- **The mockup's own arithmetic is the reference, and it is float.**
  `Flip Desk.dc.html:475-500` computes the whole schedule in JavaScript numbers,
  and its equity expression double-counts the stamp duty on interest. It is a
  specification of *intent*, not of values; every figure in the specs here was
  recomputed in `Decimal` and reconciled.

## Goals / Non-Goals

**Goals:**
- The cost/transfer split is arithmetic, not prose: interest and fees reduce
  profit, principal does not, and a test proves the two views of profit agree.
- Interest accrual over a schedule never touches a float.
- A financed deal and an all-cash deal are distinguishable from a deal whose
  figures happen to be zero.
- Equity states its own composition, so a missing term is visible rather than
  silently absorbed.

**Non-Goals:**
- A variable-rate reset schedule. One rate, held constant across the schedule;
  see Risks.
- More than one loan per deal, mezzanine debt, or a second charge.
- The monthly holding cost and the sensitivity grid. The holding-cost card is
  PART 8's surface (`add-deal-maths` — "the check-card row beside it"), and
  building the figure here with nowhere to show it is the dead-code half of
  PART 1's Decision 4.
- Selling costs and capital gains. PART 8 owns the other end of the deal.
- Deriving Portuguese statutory rates. Consistent with PART 6's position, every
  rate here is user-entered.

## Decisions

### 1. A loan is recorded explicitly, and is never created empty on first read

`Budget` is created empty on first read, per deal after PART 2
(`budget.py:19-29`, PART 2 Decision 7). Financing deliberately does **not**
copy that.

An empty budget is harmless — three nulls that read as "unset". An empty loan is
not: a principal of zero at a rate of zero is a *valid, complete* description of
an all-cash deal, and once such a record exists nothing downstream can tell
"there is no loan" from "there is a loan of nothing". The header would have to
guess whether to draw the credit chip.

**Chosen:** `GET|PUT|DELETE /deals/{deal_id}/financing`. `GET` is 404 when no
loan has been recorded; `PUT` creates or replaces; `DELETE` returns the deal to
the all-cash state. `PUT` rather than `POST` mirrors the existing
`GET|PUT /budget` shape the repo already uses, and makes recording a loan
idempotent.

**Rejected:** create-empty-on-first-read, for the reason above. **Rejected:** a
`financed: bool` flag on the deal, which is a second source of truth that can
disagree with whether a loan record exists.

### 2. The schedule is derived on read and never stored

Storing the schedule — or even just the monthly payment — creates a value that
can disagree with the terms it came from. Change the rate and a stored payment
is quietly wrong; every figure downstream inherits the error.

**Chosen:** the loan stores only its terms. The payment and every period are
derived per request. At v1 scale the derivation is a loop bounded by the holding
window, not the 480-month term, so this costs nothing.

**Rejected:** storing the payment as a convenience for the UI. It is one
multiplication to derive and a permanent consistency hazard to store.

### 3. The contractual term is not the holding period

This is the structural insight the mockup encodes and never states. Its loan is
`903.57/month` on `252.000 €` at `3,010%` — which is a **480-month** annuity,
not an 8-month one (`Flip Desk.dc.html:478-485`, whose loop is bounded by
`m <= 480 && m <= months`). The deal holds it for eight months and settles the
rest on sale.

**Chosen:** the term belongs to the loan; the holding window is derived from the
loan's drawdown date and the **deal's** target exit date (PART 2's `Deal`). The
window is never duplicated onto the loan — the same rule PART 2 applied to money
figures.

Everything is then reported as at two moments, *to date* and *to exit*. They are
different numbers and the API returns both rather than making the client choose.

**Rejected:** a `duration_months` on the loan. It would duplicate the deal's
exit date and the two would drift.

### 4. Money is quantised per period; rates are never quantised

The rounding discipline, stated so it can be tested:

| Quantity | Treatment |
|---|---|
| Monthly rate (`annual / 12`) | Full `Decimal` precision. **Never** quantised. |
| Annuity payment | Computed once from the terms, quantised to the cent. |
| Interest, per period | `quantize(opening_balance × monthly_rate)`. |
| Principal, per period | `payment − interest`. Exact by construction. |
| Closing balance | `opening − principal`. |

The rate rule is not pedantry: `3.010% / 12 = 0.002508…`, and quantising that to
money precision gives `0.00` — every interest figure in the application becomes
zero, silently and plausibly. That case is a scenario in the spec.

Quantising interest *per period* rather than accumulating unrounded and rounding
at the end is what makes `interest + principal == payment` hold exactly for
every row, with no residual cent to explain. The alternative produces a schedule
whose rows do not add up to the payment the user is actually charged.

**Rejected:** integer cents throughout. `Decimal` with the existing
`quantize_money` is already the codebase's money discipline, and a second
representation is a second set of rounding bugs.

**Rejected:** `float` anywhere, including for the exponentiation in the annuity
formula. `(1 + r) ** term` with a `Decimal` base and an `int` exponent stays in
`Decimal`; the moment it becomes a float the cent-level figures are no longer
reproducible.

### 5. A fee carries its basis, not just an amount

The mockup's finance card shows each fee **with the basis it was computed from**
— `0,50% s/ 252.000 €`, `4,00% s/ juros + comissões`
(`Flip Desk.dc.html:585-592`). Storing only the amount means the card's caption
must be invented, which is exactly the mock data PART 1's Decision 4 refuses.

It also breaks on change. Stamp duty on interest is a rate over the accrued
interest; move the exit date and a stored amount is wrong while a stored rate is
still right.

**Chosen:** four bases — a fixed amount, a rate on the principal, a rate on the
interest accrued, and a rate on the interest plus the bank's commissions. Timing
falls out of the basis rather than needing a field: interest-based fees accrue
with the interest, an early-repayment charge is charged at exit, everything else
at drawdown.

The fourth basis is Portuguese Imposto do Selo and needs one hard rule: it
computes over the interest plus the fees whose *kind* is a bank commission
(arrangement, valuation), and **never over itself or another fee on the same
basis**. Without that, the basis is circular. The mockup gets this right —
`0.04 * (interest + feeValuation + feeDossier)` excludes the stamp duty on the
drawdown and the registration cost, because neither is a bank commission.

**Rejected:** a free `taxable: bool` per fee. It moves the circularity from the
code into the user's hands, where nothing checks it — a user can mark the stamp
duty itself taxable and get a fee that feeds its own basis.

**Rejected:** hard-coding the 4% rate. PART 6 already took the position that
statutory rates are suggested, never silently computed, and a wrong tax figure
presented confidently is worse than an empty field.

### 6. Three kinds of movement, and profit sees only one of them

The classification the whole change turns on:

| Movement | Kind | Enters profit? | Enters equity (cash)? |
|---|---|---|---|
| Interest accrued | Cost | Yes | Yes, once paid |
| Fees, incl. early-repayment charge | Cost | Yes | Yes, once paid |
| Principal repaid | Transfer | **No** | Yes — and lowers the settlement |
| Principal drawn | Neither | No, and never income | Lowers the down payment |
| Balance outstanding at exit | Transfer | **No** | Settled from the proceeds |

`finance_cost = interest + fees` and `debt_service = interest + principal + fees
settled` are both real, both needed, and never the same number. Presenting one
where the other is meant is the defect this table exists to prevent.

### 7. Profit gains exactly one term, and becomes absent rather than wrong

`_projected_profit` subtracts `finance_cost_to_exit`. It does **not** subtract
the exit settlement — that would charge the deal for repaying money it never
counted as income, and would understate profit by roughly the entire loan.

> The stub proposal's "`projected_profit` gains a finance-cost line **and an
> exit-settlement line**" is wrong as written, and is corrected in the proposal
> as part of this change. The settlement is reported *beside* the profit
> sequence, never inside it.

The harder case: a financed deal whose target exit date is unset. The finance
cost to exit is then unknowable, and a profit figure that quietly omits it is
the precise bug this PART exists to fix.

**Chosen:** `projected_profit` is `None` for a financed deal with no exit date,
and the UI states which input is missing. This follows the established rule that
a figure whose inputs are unset is absent rather than zero
(`budget.py:53-62`, PART 1's budget-summary delta).

**Rejected:** falling back to the interest accrued to date. It is a smaller,
plausible, wrong number — the worst of the three options.

**Rejected:** leaving `projected_profit` alone and exposing the finance cost
separately for the client to subtract. That is client-side arithmetic on `Money`
(PART 1 Decision 6) and it is forbidden.

### 8. Equity is reported as a breakdown, at exit and to date

Equity is a **cash** measure, not a cost measure — which is why principal repaid
belongs in it even though principal repaid is not a cost. The two facts are
consistent, and the reconciliation in Decision 9 proves it.

Two figures, kept distinct: `equity_invested` (cash out to date) and
`equity_at_exit` (cash out over the whole deal). Return on equity uses
`equity_at_exit`, so a projected numerator meets a projected denominator.

**Rejected:** return on equity over cash-to-date. It flatters the number early
in the deal and drifts as spend lands — the same figure would fall as a deal
proceeds normally. The mockup uses its at-exit works figure for the same reason.

The breakdown matters for sequencing. PART 6 (acquisition costs) may not have
landed, and equity would then be understated by IMT and the notary. Returning
equity as **named components plus a total** means the UI states what the figure
contains, which is PART 1's rule for an incomplete cost base applied to a
different figure.

### 9. The reconciliation identity is the test that matters

For the same deal, these must be equal to the cent:

```
accrual:  sale − purchase − acquisition − works − finance_cost
cash:     (sale − exit_settlement) − equity_at_exit
```

They are algebraically identical once the drawdown is excluded from income and
the principal from cost — the `loan` and `principal_repaid` terms cancel. Worked
through with the mockup's figures, both give **123 999,44 €**
(details in `tasks.md` 3.6).

This single assertion catches a sign error, a double count, principal leaking
into the cost base, and the settlement being subtracted twice. It is worth more
than any number of per-field tests, and the specs make it normative.

### 10. Only the held window's periods cross the wire

The schedule has 480 rows; the screen shows eight. Returning the whole
amortisation table would be a payload nobody renders.

**Chosen:** the summary carries the aggregates plus the periods up to the exit
date, each flagged paid or not. **Rejected:** a separate paginated schedule
endpoint — nothing in the mockup asks for month 300.

### 11. The rate is stored as index plus spread

The header says `@ 3,010%`; the fee card says `Euribor 6M 2,310% + spread
0,700%`. Storing only the all-in rate makes the second caption unwriteable
without inventing it.

**Chosen:** store both components; derive the annual rate as their sum at rate
precision. **Rejected:** an all-in rate plus a free-text basis string, which is
two fields that can contradict each other.

## Risks / Trade-offs

- **PART 6 and PART 7 both edit `_projected_profit`
  (`budget_service.py:85-95`).** → The edits are additive — one subtracts
  acquisition costs, the other the finance cost — but whichever lands second
  must keep the first's term. Both specs state the resulting sequence in full,
  and the reconciliation test in Decision 9 fails loudly if a term is dropped.
- **This change edits `BudgetSummary`, which the `budget-summary` capability
  owns.** → **Closed.** The change now declares `budget-summary` as a modified
  capability and carries `specs/budget-summary/spec.md`, which MODIFIES PART 1's
  "Profitability figures are derived from the targets" and ADDs the two figures
  the summary gains — the finance cost it subtracted, and the input an absent
  profit is waiting on. The profit contract was **moved** out of the `financing`
  delta rather than copied into a second one: it is asserted in exactly one
  place, and the `financing` delta now owns only the loan.
- **`openspec validate --strict` reports the change valid and emits three
  archive-sequencing INFOs.** Verified this session:
  - `budget-summary: target spec does not exist` — PART 1 authors that
    capability too, so its MODIFIED block is copied from PART 1's delta.
  - `frontend-shell: target spec does not exist` — PART 1 authors that
    capability and has not archived, so there is no main spec to modify yet.
  - `frontend-expenses MODIFIED failed for header "### Requirement: The profit
    view states the deal's arithmetic" - not found` — the main spec *does*
    exist, but that particular requirement is ADDED by PART 1 and is not in it
    yet.
  → All three are expected and correct for this sequencing, and all three clear
  once PART 1 archives. Do not restructure the deltas to silence them: the fix
  for any of them would be to drop a MODIFIED that genuinely modifies, or to
  re-ADD a requirement that already has an author.
- **`projected_profit` becomes absent for a financed deal with no exit date.**
  → A visible behaviour change on a figure users already read. Call it out in
  the PR body, as PART 6 does for its own correction.
- **One rate, held constant.** Euribor resets; the specs' figures are a
  projection at today's index. → Stated as a Non-Goal, and the rate is stored as
  index plus spread precisely so a future reset schedule has somewhere to attach
  without a migration.
- **A user can still record interest as an ordinary expense**, double-counting
  it against the derived finance cost. → The system never creates such an
  expense, the financing card names where its figures come from, and the spec
  forbids writing finance costs into the ledger. Detecting a hand-entered one is
  out of scope; a categorisation rule would be guesswork.
- **The mockup is a float reference and disagrees in the last cents.** → Its
  `9.126 €` is `9125.56` in `Decimal`; its equity expression double-counts the
  stamp duty on interest. Test against the worked example in `tasks.md` 3.6, not
  against the mockup's rendered strings.
- **`Money` is `ge=0`.** → The down payment, the equity figures and the profit
  are `SignedMoney`; a loan exceeding the purchase price is a real case that
  `Money` would reject at the boundary.

## Migration Plan

1. **No data migration.** Financing is a new per-deal file
   (`data/<env>/deals/<deal_id>/financing.json`) alongside PART 2's layout.
   Absence of the file is the all-cash state, which is the correct reading for
   every existing deal.
2. **Backend first, on its own branch**: models, repository, the schedule
   service and its tests, then the profit and equity integration, then the
   routes. The schedule arithmetic is green before anything depends on it.
3. **Frontend second**: API client and types, then the financing card, then the
   header credit item and the sidebar footer.
4. **Rollback** is deleting the financing router and the profit term; the stored
   files are inert without them, and no existing file's shape changed.
