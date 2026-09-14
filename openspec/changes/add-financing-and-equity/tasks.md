## 1. Models

- [ ] 1.1 Add `FinancingProduct` as a closed enum (amortising annuity,
      interest-only) and verify a validation test rejects an unknown value
- [ ] 1.2 Add `FeeKind` (arrangement, valuation, stamp duty on drawdown, stamp
      duty on charges, mortgage registration, early repayment, other) and
      `FeeBasis` (fixed, rate on principal, rate on interest, rate on interest
      and commissions), and verify the commission-kind subset used by the
      fourth basis is asserted by a test rather than left implicit
- [ ] 1.3 Add `FinancingFee` (kind, basis, value) with the value typed as money
      for a fixed basis and as a rate otherwise, and verify a test that a rate
      basis rejects a money-shaped value and vice versa
- [ ] 1.4 Add `Financing` (principal, index rate percent, spread percent, term
      months, drawdown date, product, fees, optional early-repayment charge)
      plus `FinancingUpdate`, and verify a pytest round-trips it with no fees
      and with all five fee kinds
- [ ] 1.5 Verify the rate is not money-quantised: a test that an index of
      `2.310` plus a spread of `0.700` reports an annual rate of `3.010`, not
      `3.01`
- [ ] 1.6 Add `SchedulePeriod` (period, due date, opening balance, interest,
      principal, payment, closing balance, paid) and `FinancingSummary` with the
      figures the specs name, typing the down payment and both equity figures as
      `SignedMoney` and every ratio as a number, and verify ruff `ANN` passes

## 2. Storage and repositories

- [ ] 2.1 Add a `FinancingRepository` protocol with `deal_id` as the first
      parameter of every method (`get`, `set`, `delete`), and verify it
      type-checks under ruff `ANN`
- [ ] 2.2 Add the JSON implementation writing
      `data/<env>/deals/<deal_id>/financing.json` through the existing
      `JsonStore`, and verify a `tmp_path` test covers set, get, replace and
      delete
- [ ] 2.3 Verify absence is the all-cash state: a test that `get` on a deal with
      no financing file returns nothing rather than an empty `Financing`
- [ ] 2.4 Verify isolation: a test writing financing to two deals asserts each
      reads back its own and deleting one leaves the other intact
- [ ] 2.5 Extend PART 2's deal deletion to remove financing with the deal, and
      verify a test that a deleted deal's financing is gone

## 3. The schedule — the arithmetic core

- [ ] 3.1 Implement the annuity payment in `Decimal`, quantised once, and verify
      a test that `252000.00` at `3.010` percent over `480` months gives
      `903.57`
- [ ] 3.2 Implement period generation (interest quantised per period from the
      opening balance, principal as payment less interest, closing balance as
      opening less principal), and verify a test that for every period
      `interest + principal == payment` exactly with no residual cent
- [ ] 3.3 Implement the interest-only product and verify a test that each
      payment is `632.10`, all interest, and the balance stays `252000.00`
- [ ] 3.4 Verify no float: a test asserting every figure is `Decimal`, plus a
      grep over the financing service for `float(`, `math.` and `**` on a
      non-`Decimal` base
- [ ] 3.5 Verify the rate is never quantised: a test that quantising the monthly
      rate to money precision would yield zero interest, pinning why it is not
- [ ] 3.6 Verify the worked example end to end — `252000.00` at `3.010` percent,
      `480`-month term, eight periods held: interest `5037.65`, principal
      `2190.91`, balance `249809.09`, payments `7228.56`; and with five periods
      fallen due, interest to date `3153.68`
- [ ] 3.7 Verify the term/holding boundaries: tests for an exit date beyond the
      final period (balance `0.00`, no invented periods) and for an unset exit
      date (every *to exit* figure absent, *to date* still reported)

## 4. Fees

- [ ] 4.1 Implement the fixed and rate-on-principal bases and verify a test that
      `0.500` percent of `252000.00` is `1260.00` and `0.600` percent is
      `1512.00`
- [ ] 4.2 Implement the rate-on-interest basis and verify a test that moving the
      exit date earlier recomputes the fee against the smaller interest
- [ ] 4.3 Implement the rate-on-interest-and-commissions basis over the
      commission-kind fees only, and verify a test that `4.000` percent over
      `5037.65 + 350.00 + 1260.00` gives `265.91` and excludes the drawdown
      stamp duty and the registration cost
- [ ] 4.4 Verify no fee enters its own basis: a test with two
      interest-and-commissions fees asserting neither includes the other or
      itself
- [ ] 4.5 Implement fee timing from the basis (interest-based accrue, early
      repayment at exit, the rest at drawdown) and verify a test that fees to
      date and fees to exit differ when interest-based fees are present

## 5. Cost, settlement and equity

- [ ] 5.1 Implement `finance_cost` (interest + fees) and `debt_service`
      (interest + principal + fees settled) as separate figures, and verify a
      test asserting they are `9125.56` and `7228.56` plus fees for the worked
      example and are never equal for an amortising loan
- [ ] 5.2 Implement the exit settlement as balance plus early-repayment charge,
      decomposed, and verify a test that the balance is absent from the profit
      while the charge is present in the finance cost
- [ ] 5.3 Verify the drawdown is not income: a test asserting no figure on the
      deal equals or contains the principal as a positive inflow
- [ ] 5.4 Implement equity (down payment + acquisition + works paid + fees
      settled + debt service paid) with its named components, both to date and
      at exit, and verify a test that equity at exit is `91191.47` for the
      worked example and lists five components
- [ ] 5.5 Verify the signed down payment: a test with a principal above the
      purchase price asserting a negative down payment rather than zero
- [ ] 5.6 Verify absence over zero: a test that an unset purchase price makes
      equity absent, while an all-cash deal reports finance cost, debt service
      and settlement as `0.00`
- [ ] 5.7 Implement `loan_to_price_percent` and `return_on_equity_percent` as
      numbers, and verify a test that they are `90.0` and `135.98` for the
      worked example and are not decimal strings

## 6. Profit integration

- [ ] 6.1 Subtract `finance_cost_to_exit` in `_projected_profit`
      (`backend/app/src/services/budget_service.py:85-95`) exactly once, and
      verify a test that the worked example gives `123999.44`
- [ ] 6.2 Verify the settlement is not subtracted: a test asserting the profit
      does not change when the balance outstanding changes with the finance cost
      held constant
- [ ] 6.3 Make `projected_profit` absent for a financed deal with no target exit
      date and report which input the summary is waiting on, and verify a test
      distinguishing that reason from an unset sale price
- [ ] 6.4 Verify an all-cash deal is unaffected: a test that its profit matches
      the pre-change calculation
- [ ] 6.5 **Verify the reconciliation identity** — a test asserting
      `sale − purchase − acquisition − works − finance_cost` equals
      `(sale − exit_settlement) − equity_at_exit` to the cent, both `123999.44`
      for the worked example; and a mutation test that subtracting the
      settlement from the profit makes it fail
- [ ] 6.6 Verify `PaymentMethod.FINANCING` changes no total: a test that an
      expense so tagged contributes its full amount and derives no interest
- [ ] 6.7 Verify finance costs are never written to the ledger: a test listing a
      financed deal's expenses and asserting none was created by the system
- [ ] 6.8 Verify the profit term coexists with PART 6: if `add-acquisition-costs`
      has landed, a test asserting both terms are subtracted; if not, a comment
      in `_projected_profit` naming the other term so the second change to land
      does not drop the first
- [ ] 6.9 Report the finance cost to exit on `BudgetSummary` as its own figure —
      `0.00` for an all-cash deal, absent wherever the profit is absent — and
      verify a test that it equals the financing summary's figure to the cent,
      so the waterfall reconciles from one response
- [ ] 6.10 Move `break_even_sale_price`, `margin_percent` and
      `return_on_cost_percent` onto the finance-inclusive cost base, and verify a
      test that break-even is `325875.56` for the worked example with no
      acquisition costs recorded and yields a profit of zero when set as the
      target sale price

## 7. Services and routes

- [ ] 7.1 Add `FinancingService` over the repository, raising a not-found error
      consistent with `ExpenseService`, and verify unit tests cover each path
      against a fake repository
- [ ] 7.2 Verify rule 4: a test asserting financing log records carry the deal
      id and no principal, rate, lender or schedule detail
- [ ] 7.3 Add `GET|PUT|DELETE /deals/{deal_id}/financing` with Pydantic request
      and response models, and verify a pytest covers each, including 404 on an
      unknown deal and 404 on `GET` for a deal with no loan
- [ ] 7.4 Verify a second loan is refused: a test asserting `PUT` replaces
      rather than accumulates and that no deal ever holds two loans
- [ ] 7.5 Add `GET /deals/{deal_id}/financing/summary` returning the aggregates
      plus the held window's periods only, and verify a test that a `480`-month
      loan held eight months returns eight periods, each flagged paid or not
- [ ] 7.6 Verify the all-cash summary: a test that a deal with no loan returns a
      summary reporting it unfinanced with zeroed cost figures and absent loan
      figures
- [ ] 7.7 Verify `cd backend && uv run pytest` is green

## 8. Frontend — data layer

- [ ] 8.1 Add `frontend/src/types/financing.ts` mirroring the backend models,
      with every amount typed `Money`/`SignedMoney` and every ratio `number`,
      and verify the build type-checks
- [ ] 8.2 Add `frontend/src/api/financing.ts` as the only caller of the new
      endpoints, and verify fetch-mocked tests assert the deal-scoped URLs
- [ ] 8.3 Extend the expenses data hook to load the financing summary for the
      selected deal, scoped and refetched on a deal switch like PART 2's other
      three requests, and verify tests for the switch and for no deal selected
- [ ] 8.4 Verify no client arithmetic: a test asserting no `Number()`,
      `parseFloat` or operator is applied to any financing `Money` value

## 9. Frontend — the financing card

- [ ] 9.1 Build the financing card for a financed deal showing interest to date
      and to exit and each fee with its returned basis, and verify a Vitest
      covering all three
- [ ] 9.2 Render the card's explanatory sentence naming the principal repaid and
      the resulting balance, and verify a test that `2190.91` is stated as not a
      cost and `249809.09` as the balance settled on sale
- [ ] 9.3 Verify the card does not render for an all-cash deal, in place of a
      card of zeroes
- [ ] 9.4 Verify both locales: a test under `en` and `pt-PT` asserting no
      untranslated key and no English copy under `pt-PT`, with the catalogue
      keys added to both `messages.en.ts` and `messages.pt.ts` so
      `i18n/parity.test.ts` passes

## 10. Frontend — shell and profit view

- [ ] 10.1 Add the credit item to the header (principal and rate) for a financed
      deal, and verify tests that it renders at `3,010%` precision and is absent
      entirely for an all-cash deal
- [ ] 10.2 Make the sidebar footer lead with equity and its returned
      composition, keeping the budget position and its threshold colours
      beneath, and verify tests for both halves
- [ ] 10.3 Verify the footer's absent case: a test that an unset purchase price
      produces the explanatory state and the action that sets it, not a `0`
- [ ] 10.4 Add the finance cost line to the profit waterfall and place the exit
      settlement outside the sequence, and verify a test that `9125.56` is a
      subtracted line while `249809.09` is subtracted from nothing
- [ ] 10.5 Add return on equity beside return on cost, each labelled by its
      base, and verify a test that neither is formatted as currency
- [ ] 10.6 Verify the financed-with-no-exit-date state: a test that the profit
      view names the missing exit date and renders no profit, margin or return
- [ ] 10.7 Verify `make check-frontend` is green

## 11. Documentation and harness

- [ ] 11.1 Document the financing file in `docs/persistence-guide.md` and verify
      `make harness-check` passes
- [ ] 11.2 Document the cost/transfer/neither classification and the rounding
      rules in `docs/backend-guide.md` — this is the reference the next change
      to touch profit will read — and verify `make harness-check` passes
- [ ] 11.3 Correct the stub proposal's claim that `projected_profit` gains an
      exit-settlement line; the settlement never enters profit (design.md
      Decision 7), and verify the proposal and the specs now agree
- [ ] 11.4 At archive time, apply `specs/budget-summary/spec.md` onto PART 1's
      archived spec — keeping `add-acquisition-costs`' term in the requirement if
      that change landed first — and verify `openspec validate --strict` reports
      no archive-sequencing INFO for `budget-summary` afterwards

## 12. Gate

- [ ] 12.1 Verify `make check` is green — harness coherence, ruff, format,
      secrets, pytest and the frontend gate
- [ ] 12.2 Run the `reviewer` sub-agent over the branch diff and resolve what it
      finds
- [ ] 12.3 Flag for human review before merge: `projected_profit` changes value
      for every financed deal and becomes absent where the exit date is unset —
      state both in the PR body
