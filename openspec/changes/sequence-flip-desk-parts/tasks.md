## 1. Before any PART is applied

- [ ] 1.1 Verify all eight changes still validate: run `openspec validate
      --strict <id>` for each and confirm `exit=0`, zero errors, zero warnings
- [ ] 1.2 Verify the only remaining issues are `Archive would refuse this delta`
      INFOs, and that each names a capability or requirement authored by an
      earlier unarchived PART — any other INFO is a real defect
- [ ] 1.3 Confirm PART 1 (`redesign-flip-desk-skin`) is the first to archive; it
      authors `frontend-shell` and `budget-summary`, and seven siblings MODIFY
      them. Verify by checking `openspec/specs/` contains both afterwards

## 2. PART 2 — the spine

- [ ] 2.1 Apply `add-deal-and-property` before any of PARTs 3-8, and verify no
      other PART has landed first by checking `openspec/specs/deals/` exists
- [ ] 2.2 **Human review before merge** — changes the storage layer and its
      on-disk format (agent-loop rule). Verify the reviewer saw the migration
- [ ] 2.3 **Ask the user** before editing the single-property product line in
      `AGENTS.md`/`CLAUDE.md`; if granted, its own commit touching nothing else
      (rule 8). Verify the commit contains only that file
- [ ] 2.4 Verify the migration preserved every expense id, by running it against
      a populated legacy store and diffing ids before and after

## 3. PARTs 3 and 4 — the ledger collision

- [ ] 3.1 Apply `add-works-phases` (PART 3) after PART 2, and verify
      `openspec/specs/phases/` exists afterwards
- [ ] 3.2 **Human review before merge** for PART 3 — on-disk format change, and
      rollback needs a pre-upgrade copy of each deal's `expenses.json` because
      `extra="forbid"` (`backend/app/src/models/expense.py:52`) rejects a stored
      `phase_id` on an older build
- [ ] 3.3 Amend `docs/design-system-guide.md` for phase identity colours —
      "colour means status" becomes "status or identity", with a palette table
      excluding every status hue. Verify `make harness-check` passes and that
      CODEOWNERS requested a human reviewer on the PR
- [ ] 3.4 Apply `add-contractors` (PART 4), and verify its free-text payee
      migration under-merges rather than over-merges: distinct spellings stay
      distinct unless they differ only by case or surrounding whitespace
- [ ] 3.5 **Whichever of PARTs 3 and 4 archives second**: re-copy `### Requirement:
      The ledger shows how each expense was settled and evidenced` from the
      then-current `openspec/specs/frontend-expenses/spec.md` before archiving,
      then re-apply this change's edit. Verify the archived requirement carries
      both the phase column and the contractor field
- [ ] 3.6 **Human review before merge** for PART 4 — it rewrites records in
      place, so rollback needs a pre-upgrade copy of each deal's `expenses.json`

## 4. PART 5 — line items inside phases

- [ ] 4.1 Apply `add-line-item-budgeting` only after PART 3, and verify
      `openspec/specs/phases/` exists first
- [ ] 4.2 Before archiving, re-copy `### Requirement: The works budget view
      groups expenses by category` from the then-current main spec — PART 3
      modifies it too, and PART 5 pins its header byte-identical on purpose.
      Verify the archived requirement groups by phase and by line item
- [ ] 4.3 Verify the reconciliation holds in the archived spec:
      `works_budget.invoiced + works_budget.unassigned_invoiced == total_committed`
- [ ] 4.4 Verify `total_committed`, `total_paid`, `total_planned` and
      `total_forecast` kept their names, meanings and values, by running the
      regression test PART 5 specifies

## 5. PARTs 6, 7, 8 — the profit cost base

- [ ] 5.1 Apply `add-acquisition-costs` (PART 6) and verify `projected_profit`
      becomes `sale − purchase − acquisition − forecast`, with
      `break_even_sale_price` and both ratios moving with it
- [ ] 5.2 Apply `add-financing-and-equity` (PART 7) after PART 6. **Before
      archiving, re-copy `### Requirement: Profitability figures are derived from
      the targets` from the then-current main spec**, which by then carries PART
      6's acquisition term. Verify the archived requirement subtracts both
      acquisition and finance
- [ ] 5.3 Verify PART 7 subtracts exactly one loan-derived term — the finance
      cost. The exit settlement, the outstanding balance, debt service and
      principal repaid SHALL NOT be subtracted; a test asserting profit is
      unchanged by the settlement catches the regression
- [ ] 5.4 Apply `add-deal-maths` (PART 8) last. **Re-copy the same requirement
      again** — by then it carries PART 6's and PART 7's terms — then add exit
      costs. Verify all three terms survive in the archived spec
- [ ] 5.5 Verify the declaration model is consistent across PARTs 7 and 8: a
      finance cost of `0.00` only for a deal declared unfinanced, absent when no
      loan is recorded and nothing declared, with the cost base marked incomplete
- [ ] 5.6 Verify break-even is solved rather than computed at the target price —
      exit costs vary with the sale price, so the naive form is wrong by the
      commission on the gap

## 6. Across the programme

- [ ] 6.1 Name the falling profit figure in the PR body of PARTs 6, 7 and 8 —
      three consecutive drops with no explanation reads as a regression
- [ ] 6.2 After each PART archives, re-run `openspec validate --strict` on every
      remaining change and verify the INFO count fell rather than rose; a rising
      count means a delta is targeting something that just moved
- [ ] 6.3 Verify no PART logs an address, a contractor detail or any renovation
      note content — ids and counts only (rule 4)
- [ ] 6.4 Verify `make check` is green before each merge; it is the definition of
      done and covers both halves of the repo
- [ ] 6.5 Archive this change last, once all eight have landed
