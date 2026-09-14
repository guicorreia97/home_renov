# Proposal: Financing and equity

> **PART 7 of 8.** Fully planned: `design.md`, three delta specs and `tasks.md`
> are written. Assumes **PARTs 1 and 2 have archived** — PART 1
> (`redesign-flip-desk-skin`) authors the `frontend-shell` capability and the
> rule that every displayed total is derived server-side in `Decimal`; PART 2
> (`add-deal-and-property`) provides the `deal_id` spine this attaches to.
> **Not** independent of PART 6 (`add-acquisition-costs`): it adds its own term
> to the same profit calculation, and the equity this change derives counts the
> acquisition costs PART 6 records. Both modify PART 1's profitability
> requirement, so whichever archives second must re-copy the then-current text.

## Why

Two panels of the mockup are one balance sheet, which is why they are one PART.

The header carries *"Crédito {loan} @ 3,010%"*. The Despesas tab has a card
headed *"Custos de financiamento"* — a credit line over eight months, with
interest paid to date, and a footnote that does the single most important piece
of reasoning on the screen: *"Prestação 903,57 €/mês. Capital amortizado nos 8
meses não é custo — reduz o saldo a liquidar na venda."* Interest is a cost;
principal is not, it is a transfer that lowers what you settle on exit. And the
sidebar's `CAPITAL PRÓPRIO` is what falls out of that: entrada + impostos +
obras + serviço de dívida — the cash actually at risk.

None of it is modelled. `PaymentMethod.FINANCING`
(`backend/app/src/models/expense.py:33`) is a settlement tag on a single
expense — no principal, no rate, no term, no schedule. `projected_profit`
ignores financing entirely (`app/src/services/budget_service.py:84-95`), so a
leveraged deal and an all-cash deal report identical profit today.

Equity is also what makes return meaningful. Return on **cost** is the number
PART 1 can show; return on **equity** is the number an investor decides on, and
it needs this PART.

## What Changes

- **New `Financing` model** per deal: principal, annual rate, term in months,
  start date, product (interest-only vs amortising), and arrangement or
  valuation fees.
- **A derived schedule**, computed server-side in `Decimal`: monthly payment,
  interest and principal split per period, interest paid to date, principal
  amortised, and the balance outstanding at the target exit date.
- **Interest enters profit; principal does not.** `projected_profit` gains
  **exactly one** new line — the finance cost, which is interest plus fees. The
  exit settlement is reported *beside* the profit sequence and never inside it:
  subtracting the balance outstanding would charge the deal for repaying money
  it never counted as income. Finance cost and debt service are two different
  numbers and neither may stand in for the other — this is the correctness heart
  of the change. The figures taken over the same cost base — the break-even sale
  price and the two ratios — move with that term, the summary names the finance
  cost it subtracted, and `projected_profit` becomes **absent** for a financed
  deal with no target exit date, since the finance cost to exit is then
  unknowable. (An earlier draft of this proposal said profit gains an
  exit-settlement line too; that was wrong. See `design.md` Decision 7.)
- **Equity derived, not entered**: down payment + acquisition costs (PART 6) +
  works paid + loan fees settled + debt service paid — reported both as invested
  to date and as at exit, with its components named so what it contains is
  visible.
- **Frontend**: the financing card, the header's `Crédito @ rate`, the sidebar
  footer becoming real `CAPITAL PRÓPRIO`, and return-on-equity alongside
  return-on-cost.

## Capabilities

**New:** `financing` — the loan, its schedule, which parts of it are costs, and
what equity means.

**Modified:** `budget-summary` (`projected_profit` subtracts the finance cost to
exit and nothing else the loan produces, the summary names that cost, and the
profit is absent where a financed deal has no exit date), `frontend-shell` (the
sidebar footer), `frontend-expenses` (the waterfall gains finance cost and exit
settlement).

## Impact

Medium backend, but the highest arithmetic risk of the eight: an amortisation
schedule is easy to write and easy to get subtly wrong, and rounding must follow
the existing `Money` discipline — `Decimal`, quantised 2dp half-up
(`app/src/models/money.py:9-20`). Test it against a worked example, not against
itself.

## Deletes from PART 1

The sidebar footer's `remaining_budget` stand-in, and the header's three-item
assumptions strip, which gains its fourth.

PART 1's `budget-summary` spec also defines `break_even_sale_price` as
`purchase_price + total_forecast`, which a financed deal falsifies: break-even
is the price at which the projected profit is zero, and that profit now carries
the finance cost. The `budget-summary` delta amends that sentence rather than
leaving two main specs to disagree — the same amendment `add-acquisition-costs`
(PART 6) makes for its own term, and the two are additive.
