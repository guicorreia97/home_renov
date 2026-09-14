# Design: The deal and property spine

## Context

See `proposal.md` — Why. The constraints that shape the approach:

- **The singleton is written down in three places**, not one. `Budget`'s
  docstring states "exactly one budget exists, and it is created empty on first
  read" (`backend/app/src/models/budget.py:19-29`); both repository protocols
  take no deal identifier (`budget_repository.py:6-11`,
  `expense_repository.py:10-21`); and the frontend hook loads one expense list,
  one budget and one summary in parallel at mount
  (`frontend/src/features/expenses/useExpensesData.ts:45-175`). All three have to
  move together.
- **Storage is two flat files per environment.** `data/<APP_ENV>/budget.json`
  holds one object, `data/<APP_ENV>/expenses.json` holds an array, both through
  `JsonStore(data_dir, name)` with an atomic temp-file-then-`os.replace` write
  (`json_store.py:10-40`, `config/settings.py:49-51`).
- **Ten routes exist.** One root, one healthcheck, three budget, five expense
  (`app/api/endpoints/`). The eight budget and expense routes become
  deal-scoped; the other two do not.
- **`Money` is a `Decimal` server-side and a string on the wire**
  (`models/money.py:1-20`), and the client is forbidden arithmetic on it
  (`openspec/specs/frontend-expenses/spec.md:65-79`). Nothing here relaxes that.
- **This trips two agent-loop rules.** It changes the storage layer and its
  on-disk format, so it needs human review; and it rewrites the product line in
  `AGENTS.md`/`CLAUDE.md`, which is a rule 8 file.

## Goals / Non-Goals

**Goals:**
- One deal owns its expenses and its budget, with no path from a deal to another
  deal's records.
- Existing stored data lands in a real deal, with identifiers intact.
- The singleton disappears from the model, the repositories, the routes and the
  client in one coherent change rather than half of it.
- The `deal_id` spine is shaped so PARTs 3–8 attach to it without a second
  migration.

**Non-Goals:**
- Multi-user, accounts, auth or sharing. Single-user and local-first survive this
  change untouched; only single-*property* dies.
- MongoDB. The repository interface is where that lands later; this change stays
  on JSON files.
- The panels, phases, line items, contractors or financing of PARTs 3–8.
- Any change to how `Money` is represented or where it is computed.

## Decisions

### 1. `deal_id` is a path prefix, not a query parameter

The eight budget and expense routes move under `/deals/{deal_id}/…`. The deal is
part of the resource's identity, not a filter over a global collection, and a
path makes a missing deal a 404 on the resource rather than an empty list that
reads as "no expenses yet".

**Rejected:** `?deal_id=`. It leaves the singleton routes standing and lets a
caller omit the parameter, which is precisely the bug this change exists to make
impossible.

### 2. Each deal gets its own directory on disk

```
data/<APP_ENV>/
  deals.json                 # the deals themselves, an array
  deals/<deal_id>/
    expenses.json            # an array, as today
    budget.json              # one object, as today
```

`JsonStore` already takes `(data_dir, name)`, so a per-deal store is
`JsonStore(data_path / "deals" / deal_id, "expenses")` with no change to the
store itself. The atomic-write guarantee is preserved exactly as it is.

Deleting a deal becomes removing a directory, which is why the
delete-takes-its-records-with-it requirement is cheap to honour here.

**Rejected:** one `expenses.json` keyed by deal. Every read would load every
deal's expenses, and a partial write would put two deals' data at risk in one
file. The current file-per-collection shape is the thing that makes the atomic
write meaningful, and it should survive.

### 3. `deal_id` becomes the first parameter of every repository method

`ExpenseRepository.list(deal_id)`, `.add(deal_id, expense)`, and so on; likewise
`BudgetRepository.get(deal_id)` and `.update(deal_id, changes)`. A new
`DealRepository` handles the deals themselves.

**Rejected:** a per-deal repository instance built by a factory
(`repo_for(deal_id).list()`). It reads better at the call site and hides the
scoping in construction, where a service could hold a stale instance across a
deal switch. An explicit parameter cannot be forgotten — the type checker asks
for it at every call.

### 4. The migration runs at startup, guarded by the legacy files

On startup, if `data/<env>/expenses.json` or `budget.json` exists at the old flat
path, a deal is created, both files move into its directory, and the legacy paths
are removed. Absence of the legacy files is the "already migrated" signal, which
is what makes it idempotent without a version marker.

The created deal's property carries no invented address. It is created with the
fields unset, for the user to fill in — a fabricated address would be exactly the
mock data PART 1 refused to introduce.

**Rejected:** a separate `make migrate` step. A local-first app that refuses to
boot until the user runs a command they have not been told about is worse than
one that moves two files; and the guard makes the automatic path safe to repeat.

**Rejected:** a schema-version field in the JSON. It is the right answer for the
third migration, not the first, and the file's own location already answers the
question this one asks.

### 5. Works-window progress is computed server-side

"Month five of eight" is arithmetic over dates, and the same argument that keeps
`Money` arithmetic on the server applies: the client formats what it is given.
This also keeps the overrun case — month nine of eight — testable in pytest
rather than only observable in a browser.

The figure is an integer month count, not money and not a ratio, so it is
returned as a number and kept distinct from both.

### 6. The selected deal lives in the URL

The client holds the selected deal in the route, not in React state alone. A
refresh keeps the user on the deal they were looking at, and the deal-switch
behaviours the specs require — refetch all three requests, drop the category
filter, discard a late response for the previous deal — hang off one change of
that value.

**Rejected:** context-only state. It makes every deal-scoped view unlinkable and
turns a refresh into a silent jump back to the first deal.

### 7. `Budget` stops documenting a singleton, and keeps creating itself

The docstring at `budget.py:19-29` is deleted, not amended — it is the sentence
this change exists to falsify. The create-empty-on-first-read behaviour survives
per deal, because it is what lets a new deal render a budget screen without a
creation step.

### 8. The `AGENTS.md` product-line edit is a separate, user-requested commit

`AGENTS.md` and `CLAUDE.md` say "single-user, local-first. No user accounts, no
auth, no marketplace in v1" and, through `Budget`, single-property. This change
falsifies the single-property half. Under rule 8 that edit is never made
unprompted and always lands in its own commit — so it is listed in the tasks as a
step to *ask for*, not to perform.

## Risks / Trade-offs

- **The migration is the one step that can lose real data.** → It moves files
  rather than rewriting them, preserves every identifier, and is covered by a
  test that starts from a populated legacy store and asserts every expense id
  survives. The atomic write in `JsonStore` is untouched.
- **Eight routes change shape at once, and every frontend call site with them.**
  → The backend and frontend land on separate branches, with the backend first;
  the API client (`frontend/src/api/`) is the single place `fetch` is called, so
  the client-side blast radius is two files plus the hook.
- **The whole pytest suite is deal-shaped after this** — 57 tests across 7 files,
  most of which construct a budget or an expense. → The `client` fixture
  (`tests/conftest.py:13-20`) gains a deal and becomes the one place the new
  scoping is expressed, rather than every test growing a `deal_id` literal.
- **A deal switch mid-flight can show one deal's figures under another's
  header.** → Specified explicitly (late responses are discarded) rather than
  left to whichever request happens to resolve last.
- **PART 1 must archive before this change's `frontend-shell` delta makes
  sense** — it is that capability's author. → Stated in the delta itself, and the
  proposal already sequences this as PART 2.

## Migration Plan

1. Backend lands first and is green on its own: models, `DealRepository`,
   deal-scoped repositories, the startup migration, then the routes.
2. The frontend follows: API client, the selected-deal route, the sidebar
   destinations and header identity.
3. Rollback is restoring the two legacy files from `deals/<id>/` to the flat
   path; the migration moves rather than transforms, so nothing needs converting
   back.
