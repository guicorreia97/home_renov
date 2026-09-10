# Proposal: Contractors

> **PART 4 of 8.** Stub — `design.md`, delta specs and `tasks.md` get written
> when this is picked up. **Depends on PART 2.** Independent of PARTs 3 and 5,
> though it improves both.

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

- **New `Contractor` model**: name, trade, contact details, notes. Belongs to a
  deal — or is shared across deals, which is the one design question worth
  settling before writing code, since a good contractor outlives a flip.
- **`Expense.payee` becomes `contractor_id`**, with the free-text value
  migrated to created contractors by exact-match dedupe, and an escape hatch for
  one-off payees that should not become records.
- **Routes**: CRUD under `/contractors` (or `/deals/{id}/contractors`), plus
  spend-per-contractor rollups computed server-side.
- **Frontend**: `payee` becomes a picker with create-on-the-fly rather than a
  bare text input; `EMPREITEIRO`/`FORNECEDOR` columns resolve real records.

## Capabilities

**New:** `contractors` — what a contractor is, how spend attributes to one, how
free-text payees migrate.

**Modified:** `frontend-expenses` (the form field and both table columns).

## Impact

Small backend: one model, one repository, one router. The migration is the
delicate half — a dedupe that silently merges two different contractors with
similar names is worse than leaving them apart. **Human review required** for
the on-disk format change.

**Rule 4 applies with force here.** Contractor details are exactly the content
`AGENTS.md` forbids logging: "Never log secrets, addresses, contractor details,
or any renovation note content — log IDs and counts instead."

## Deletes from PART 1

Nothing. PART 1 renders `payee` as the string it is; this upgrades it in place.
