# Proposal: Contractors

> **PART 4 of 8.** Fully planned: `design.md`, two delta specs and `tasks.md`
> are written. Assumes **PARTs 1 and 2 have archived** — PART 2 for the
> `deal_id` spine and the per-deal storage this migration runs after, PART 1 for
> the per-status `CategoryTotal` shape the contractor rollup mirrors and the
> ledger requirement this change modifies. Independent of PARTs 3 and 5, though
> it improves both.

## Why

The mockup has an `EMPREITEIRO` column in the budget table and a `FORNECEDOR`
column in the ledger, and its sidebar copy distinguishes *adjudicado* (awarded)
from *faturado* (invoiced) — language that only means something when there is a
party on the other side of the award.

Today the party is a string. `Expense.payee` is `str` with a 120-character cap
(`backend/app/src/models/expense.py:58`), left as free text deliberately when
the expenses UI shipped (`openspec/changes/archive/2026-09-09-complete-expenses-ui/proposal.md:71`).
That was right then and is the constraint now: the same contractor spelled
three ways is three contractors, nothing can be totalled per contractor, and
there is nowhere to record a trade, a contact, or which phases they are on.

`AGENTS.md` names contractors as a v1 concern ("plan and track rooms, tasks,
budget, contractors and timeline"). This is that.

## What Changes

- **New `Contractor` model**: name, trade, contact details, notes, plus a kind
  distinguishing a party awarded works from a party goods are bought from.
  **Shared across deals**, not owned by one — a good contractor outlives a flip,
  and a per-deal record would recreate the duplication this change exists to end
  (`design.md` Decision 1, the one deliberate exception to PART 2's
  `deal_id`-first repository rule).
- **`Expense.payee` becomes `contractor_id`**, required, with the free-text
  value migrated to created contractors by exact-match dedupe. The free-text
  field is **removed rather than kept as a fallback**: two fields describing who
  was paid have no answer when they disagree. The one-off payee it was meant to
  protect is handled by the supplier kind instead (`design.md` Decisions 2–3).
- **Routes**: CRUD under `/contractors` at the application level, a merge
  operation for duplicates the migration deliberately leaves apart, and
  spend-per-contractor rollups computed server-side into `BudgetSummary`.
- **Frontend**: `payee` becomes a picker with create-on-the-fly rather than a
  bare text input; `EMPREITEIRO`/`FORNECEDOR` columns resolve real records.

## Capabilities

**New:** `contractors` — what a contractor is, how spend attributes to one, how
free-text payees migrate.

**Modified:** `frontend-expenses` (the form field and both table columns).

## Impact

One model, one repository, one router — plus a merge operation, a rollup added
to the existing summary pass, and a required-field change that touches every
test constructing an expense (7 backend files, 6 frontend ones). The migration
is the delicate half — a dedupe that silently merges two different contractors
with similar names is worse than leaving them apart, so it under-merges on
purpose and ships the merge that fixes it. **Human review required** for the
on-disk format change: unlike PART 2's file move, this migration rewrites
records in place, so the rollback is a pre-upgrade copy of each deal's
`expenses.json`.

**Rule 4 applies with force here.** Contractor details are exactly the content
`AGENTS.md` forbids logging: "Never log secrets, addresses, contractor details,
or any renovation note content — log IDs and counts instead."

## Deletes from PART 1

No panel and no decision. PART 1 renders `payee` as the string it is and this
upgrades it in place — but the upgrade does edit PART 1's ledger requirement,
which names "the payee" as a column, so that requirement is carried into this
change's `frontend-expenses` delta and modified there.
