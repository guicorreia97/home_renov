# Proposal: Financing and equity

> **PART 7 of 8.** Stub — `design.md`, delta specs and `tasks.md` get written
> when this is picked up. **Depends on PART 2.**

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
- **Interest enters profit; principal does not.** `projected_profit` gains a
  finance-cost line and an exit-settlement line that are not the same number —
  this is the correctness heart of the change.
- **Equity derived, not entered**: down payment + acquisition costs (PART 6) +
  works spend + debt service to date.
- **Frontend**: the financing card, the header's `Crédito @ rate`, the sidebar
  footer becoming real `CAPITAL PRÓPRIO`, and return-on-equity alongside
  return-on-cost.

## Capabilities

**New:** `financing` — the loan, its schedule, which parts of it are costs, and
what equity means.

**Modified:** `frontend-shell` (the sidebar footer), `frontend-expenses` (the
waterfall gains finance cost and exit settlement).

## Impact

Medium backend, but the highest arithmetic risk of the eight: an amortisation
schedule is easy to write and easy to get subtly wrong, and rounding must follow
the existing `Money` discipline — `Decimal`, quantised 2dp half-up
(`app/src/models/money.py:9-20`). Test it against a worked example, not against
itself.

## Deletes from PART 1

The sidebar footer's `remaining_budget` stand-in, and the header's three-item
assumptions strip, which gains its fourth.
