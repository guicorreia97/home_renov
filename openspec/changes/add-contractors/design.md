# Design: Contractors

## Context

See `proposal.md` — Why. The constraints that shape the approach:

- **The payee is one required string, capped at 120 characters.**
  `ExpenseCreate.payee` is `Field(min_length=1, max_length=120)`
  (`backend/app/src/models/expense.py:58`), and `Expense` inherits it
  (`:83-88`). `model_config` sets `str_strip_whitespace=True` (`:52`), so a
  stored payee is always non-blank — a blank one can only reach the store by a
  hand edit of the JSON file, and such a record already fails
  `Expense.model_validate` on read (`json_expense_repository.py:27`). That
  narrows what the migration has to cope with, but does not remove the case.
- **The payee is woven through the client.** It is a form field
  (`ExpenseForm.tsx:76-83`), a validation rule (`validation.ts:30-33`), a table
  column (`ExpenseTable.tsx:36`, `ExpenseRow.tsx:31`), a diff field in the PATCH
  builder (`validation.ts:98`), and an interpolation into the delete
  confirmation (`DeleteConfirmDialog.tsx:36`). It also appears in six test files
  as fixture input.
- **The persistence guide already predicted this design.** It says to "reference
  what is shared or large (a contractor, by `contractor_id`)"
  (`docs/persistence-guide.md:19`) — the shape below is the one the repo already
  wrote down, not a new invention.
- **Rule 4 names contractors explicitly.** "Never log user content — no
  renovation notes, addresses, or contractor details. Log identifiers and
  counts" (`docs/backend-guide.md:62-63`). This change creates the entity that
  rule is about, and a migration that reads every payee string is exactly where
  it would be broken by accident.
- **PART 2 sets the spine.** `deal_id` is a path prefix, storage is
  `data/<env>/deals/<deal_id>/`, `deal_id` is the first repository parameter,
  derived figures are computed server-side in `Decimal`, and a startup migration
  already moves the flat files into place. This change composes with that one.
- **PART 1 sets the rollup shape.** Its `budget-summary` delta gives
  `CategoryTotal` a planned/pending/paid breakdown alongside the existing
  committed `amount`, which currently excludes PLANNED
  (`budget_service.py:97-108`). A contractor rollup mirrors it rather than
  inventing a second convention.
- **No combobox primitive exists.** The shared components are `Badge`, `Button`,
  `Modal`, `SelectField`, `TextField`, and the design system's Components
  section lists Button, Card, Input, Badge, Table and Empty state
  (`docs/design-system-guide.md:124-140`). A picker is built from what is there
  or it is a new primitive.

## Goals / Non-Goals

**Goals:**
- One party paid three times is one record with one spend history, across deals.
- Every payee recorded before this change survives it, attributed to a real
  contractor, with its expense identifier intact.
- Under-merging where the data is ambiguous, with an explicit merge to fix it —
  never an automatic merge that cannot be undone.
- Contractor detail stays out of the logs by construction, not by review.

**Non-Goals:**
- Rating, comparing or sourcing contractors, quotes, or anything resembling a
  marketplace. `AGENTS.md` rules that out of v1 and nothing here approaches it.
- Awarding work to a contractor. *Adjudicado* is a property of a line item, and
  line items are PART 5; this change gives PART 5 the party to award to.
- Attaching a contractor to a phase (PART 3) or to a line item (PART 5).
- Documents, invoices or attachments against a contractor. `invoice_reference`
  stays the text field it is.
- Any change to how `Money` is represented or where it is computed.

## Decisions

### 1. Contractors belong to the application, not to a deal

Routes are `/contractors`, not `/deals/{deal_id}/contractors`, and storage is
one `data/<env>/contractors.json` beside `deals.json` rather than a file inside
each deal's directory. `ContractorRepository` is therefore the one repository
in the codebase whose methods do **not** take `deal_id` first.

This is a deliberate exception to PART 2's Decision 3, and it is worth being
explicit about, because an exception that is not written down reads as an
oversight later. PART 2's rule exists so that a record *owned by* a deal can
never be read through another. A contractor is not owned by a deal — the entire
premise of the change is that a good contractor outlives a flip, and scoping the
record per deal would recreate, one directory down, the exact duplication this
change exists to end: the same electrician as three records because he worked on
three flips.

What remains deal-scoped is the **attribution** and everything derived from it.
`Expense.contractor_id` lives on a deal's expense, and the spend rollup is
per-deal (Decision 5). So the isolation PART 2 guarantees is untouched: no deal
can read another's spend. Only the party's name and contact details are shared,
and those carry no money.

**Rejected:** contractors inside each deal's directory. It satisfies PART 2's
rule mechanically and defeats the change's purpose. It also makes the "same
contractor on two deals" scenario unrepresentable, which is the scenario the
user is most likely to want answered next.

**Rejected:** a deal-scoped copy with a link to a shared master. Two records for
one party, needing to be kept in step — a rename would have to fan out, and the
first time it half-failed the data would be worse than free text.

### 2. `payee` is removed, not kept as a fallback

`Expense.payee` is deleted and `Expense.contractor_id` replaces it, required.
There is no free-text escape hatch on the expense.

The stub proposal floated "an escape hatch for one-off payees that should not
become records". Working it through, it is the worse half of both options. A
record carrying both a `contractor_id` and a `payee` has no answer to which one
is true when they disagree, and nothing prevents them disagreeing. Every
consumer then needs a rule — the ledger column, the rollup, the merge, the
delete guard — and each will pick a slightly different one. That is the same
class of bug as today's, with more moving parts.

What the escape hatch was actually protecting against is real: the user should
not have to promote a hardware-shop receipt into something that looks like a
building contractor. That is answered by Decision 3 instead, at no structural
cost.

**Rejected:** `contractor_id` nullable with `payee` retained when unset. See
above — two sources of truth for one fact.

**Rejected:** `contractor_id` nullable with no fallback, leaving some expenses
unattributed. An expense is money that left the account; someone received it.
Today's model already requires a payee, so allowing nothing would be a
*loosening* of a constraint, shipped in the change meant to tighten it.

### 3. A contractor carries a kind: awarded works, or goods bought

`ContractorKind` is a closed two-value enum. The mockup asks for exactly this
distinction in its own vocabulary: the works budget table's column is
`EMPREITEIRO` (`Flip Desk.dc.html:146`) and the ledger's is `FORNECEDOR`
(`:259`) — the party awarded the work, and the party the invoice came from.
They are two roles of one kind of record, not two tables: `Acabamentos Vega`
appears as a line-item vendor and would equally appear on a ledger row
(`:402-403`).

This is what makes it acceptable for every one-off payee to become a record. A
tile shop is recorded as a supplier, the picker can group or filter on that, and
the list of parties actually awarded work stays legible without a second
concept.

The migration sets every contractor it creates to **supplier** (Decision 4),
never to contractor-awarded-works, because which of the two a payee string
described is not something the stored data says. Claiming otherwise would be
inventing a fact, which is what PART 1's Decision 4 forbids.

**Rejected:** a `trade` enum instead (electrician, plumber, carpenter…).
Inventing a closed list of Portuguese construction trades without having
surveyed one is the sort of guess that becomes a migration. `trade` is optional
free text; it is a label on a record, never a key anything joins on.

### 4. The migration matches payees exactly, and under-merges on purpose

Two payees collapse into one contractor when they are equal after trimming,
collapsing internal whitespace runs, and case-folding. Nothing else. No accent
folding, no punctuation stripping, no edit distance.

The asymmetry is the whole argument. **Under-merging is visible and
reversible**: two rows named almost the same in a list the user reads, fixed by
the merge operation in Decision 6. **Over-merging is invisible and
irreversible**: the distinct spelling that was the only evidence of the mistake
is gone, and every rollup from then on is quietly wrong. The proposal already
says a silent merge of two different contractors is worse than leaving them
apart; this is what that costs and it is worth it.

Case and whitespace are safe because they are presentation, not identity — no
one is two contractors because a capital letter slipped. Accents are not safe in
Portuguese, where they can distinguish words, so they are left alone.

A missing or blank payee — reachable only by hand-editing the JSON, since
`min_length=1` and `str_strip_whitespace` rule it out through the API — is
attributed to one explicitly-named unattributed contractor, created only if such
a record exists. Naming the gap is not mock data: a fabricated *name* would be,
but a record whose entire content is "we do not know" is the honest form of the
same fact, and it keeps the attribution required rather than punching a hole in
Decision 2 for one hand-edited row.

**Rejected:** fuzzy matching on a similarity threshold. It is a tuning parameter
that decides, unattended and unlogged, that two of the user's contractors are
one. There is no threshold at which its mistakes become visible.

**Rejected:** refusing to boot and demanding the user disambiguate first. The
repo has already been bitten by an app that raises at import time when a file is
missing (`AGENTS.md`, Recurrent errors); a local-first tool that will not start
until an interactive cleanup is done is worse than one that makes a conservative
choice the user can correct.

### 5. Spend rolls up per contractor per deal, inside `BudgetSummary`

The deal's summary gains `by_contractor: list[ContractorTotal]`, sitting beside
`by_category` and computed in the same pass over the same expense list
(`budget_service.py:37-66`). `ContractorTotal` mirrors the `CategoryTotal` shape
PART 1 establishes — planned, pending, paid, and a committed `amount` excluding
planned — so the two breakdowns of one expense list reconcile against each other
and against the deal's totals.

No new endpoint. The summary is already the place the repo answers "where do we
stand", the client is already forbidden arithmetic on `Money`
(`openspec/specs/frontend-expenses/spec.md:65-79`), and a second endpoint would
be a second thing to keep in step after every mutation.

A contractor with no spend on the deal is **absent** from the list rather than
present with zeroes, exactly as `_by_category` already omits unused categories
(`budget_service.py:104-108`).

**Rejected:** a cross-deal `GET /contractors/{id}/spend` total. It is a
genuinely interesting figure and it is not this change's job — it invites a
number that no deal's arithmetic should ever move, and PART 8 is where
deal-level maths gets settled. The per-deal rollup is what the mockup's columns
need.

### 6. Merging is an explicit operation that re-attributes, then deletes

`POST /contractors/{id}/merge` naming the survivor: every expense across every
deal referencing the merged-away contractor is re-attributed, then that record
is removed. It is the only sanctioned way to fix a duplicate, and it is what
makes Decision 4's conservatism honest rather than a dead end.

Deletion of a contractor with spend attributed to it is refused. The alternative
— cascading, or nulling the reference — either destroys expenses the user did
not ask to delete or creates the unattributed expense Decision 2 rules out.
Archiving covers "we do not use them any more" without touching history.

**Rejected:** deleting and leaving dangling references for the UI to cope with.
It moves an integrity problem into every read path, forever.

### 7. The picker is a `SelectField` plus a create action, not a new combobox

The form field becomes the existing `SelectField` (`components/SelectField.tsx`)
listing active contractors, beside a button that opens the contractor form and
selects what it creates.

A typeahead combobox is the single most accessibility-hostile widget to
hand-roll — listbox semantics, active-descendant management, focus handling —
and the design system has no tokens for a floating listbox
(`docs/design-system-guide.md:115-140` covers dropdown elevation but nothing
below it). Rule 7 forbids inventing tokens. The repo has already made this
argument once and been right: the native `<dialog>` supplies the focus trap and
modal semantics rather than reimplementing them
(`openspec/specs/frontend-expenses/spec.md:119-125`). A native `<select>` is the
same trade.

The cost is honest: a `<select>` degrades past roughly fifty options. A single
renovation's contractor list is a few dozen at most, and archiving (Decision 3's
companion in the spec) keeps the active list shorter than the full one. If it
becomes uncomfortable, a combobox is a component swap behind an unchanged field
contract, not a rework.

**Rejected:** an `<input list>` with a `<datalist>`. It looks like the cheap
answer and it accepts arbitrary typed text, which is precisely what Decision 2
removes — the free-text field would come back through the widget.

### 8. No agent-control file needs editing

Checked rather than assumed: `AGENTS.md` already names contractors as a v1
concern ("plan and track rooms, tasks, budget, contractors and timeline"), and
`docs/persistence-guide.md:19` already prescribes referencing a contractor by
`contractor_id`. This change makes both true rather than falsifying either, so
unlike PART 2 it triggers no rule 8 edit. `docs/persistence-guide.md` and
`docs/backend-guide.md` do need updating for the new collection and routes, and
neither is a rule 8 file.

## Risks / Trade-offs

- **The migration is the one step that can lose real data.** → It preserves
  every expense identifier, amount and timestamp, is covered by a test starting
  from a populated pre-migration store, and is idempotent. Its already-run
  signal is that no expense still carries a `payee` — deliberately *not* the
  presence of `contractors.json`, which the user may have created by hand before
  any migration ran.
- **Two startup migrations now run in order**, PART 2's moving files into
  per-deal directories and this one rewriting the records inside them. → This
  one reads expenses through the deal-scoped repository, so it cannot run before
  PART 2's has put them where it looks. A test asserts a legacy flat store
  migrates correctly through both in one boot.
- **The conservative dedupe will leave visible duplicates on real data**, and
  the user will meet them as their first impression of the feature. → Accepted
  and mitigated by the merge operation shipping in the same change, not a later
  one. A migration that silently merged would look better on day one and be
  unfixable on day thirty.
- **`payee` removal touches six frontend test files and the PATCH diff
  builder** (`validation.ts:90-107`). → The compiler finds all of it:
  `ExpenseFormValues`, `Expense` and `ExpenseCreate` are typed
  (`types/expense.ts`), so a missed call site is a build failure, and
  `make check-frontend` type-checks via `npm run build`.
- **`expense.delete.confirm` interpolates `{payee}`**
  (`messages.en.ts:76`, `messages.pt.ts:74`). The dialog has an expense but not
  a contractor name. → The dialog resolves the name from the loaded contractor
  list like the ledger does, and the catalogue key is renamed with it. A key
  present in one language only fails the gate (`frontend-i18n` spec), so the
  rename cannot land half-done.
- **A rollup that double-counts is the kind of bug tests catch and eyes do
  not.** → The reconciliation scenario asserts the per-contractor breakdown sums
  to the same deal totals `by_category` does, with a PLANNED expense present —
  the case PART 1's design already flags as the one that catches a mistaken
  `amount` meaning.
- **`openspec validate --strict` emits one INFO**, verified in this session:
  `frontend-expenses/spec.md: Archive would refuse this delta:
  frontend-expenses MODIFIED failed for header "### Requirement: The ledger
  shows how each expense was settled and evidenced" - not found`. That is
  expected and correct for this sequencing — that requirement is authored by
  PART 1 and genuinely is not in the main spec yet. The other MODIFIED block,
  **Expense data loading reports its state**, raises nothing, because it already
  exists in `openspec/specs/frontend-expenses/spec.md:143` and this delta edits
  the text PART 2 leaves behind. The INFO resolves when PART 1 archives ahead of
  this change, and must not be silenced by restructuring the delta.

## Migration Plan

1. Backend lands first and is green on its own: `Contractor` model and enums,
   `ContractorRepository` and its JSON implementation, `ContractorService`
   including merge, then the routes.
2. `Expense.payee` → `contractor_id` and the startup migration land together —
   splitting them would leave a model whose required field nothing populates.
3. The rollup follows, extending `BudgetSummary` in the existing single pass.
4. The frontend follows: API client, the hook's contractor load, the form
   picker, then both table columns and the catalogue keys.
5. Rollback is the pre-migration data, which the migration rewrites in place
   rather than moving — so unlike PART 2's, a rollback needs a copy of
   `deals/<id>/expenses.json` taken before the first boot on this version. The
   tasks call that out as the human-review checkpoint, since it changes the
   on-disk format (agent-loop rule).
