# Design: Acquisition costs

## Context

See `proposal.md` — Why. The constraints that shape the approach:

- **The profit figure is already wrong, and it is wrong quietly.**
  `_projected_profit` is `target_sale_price - purchase_price - total_forecast`
  (`backend/app/src/services/budget_service.py:85-95`). It returns a confident
  number, formatted like every other, with no indication that the entire cost of
  buying the property is missing from it. This change is a correction before it
  is a feature.
- **PART 1 builds three more figures on the same base.** `break_even_sale_price`
  is specified as `purchase_price + total_forecast`, with `margin_percent` and
  `return_on_cost_percent` derived from the profit
  (`openspec/changes/redesign-flip-desk-skin/specs/budget-summary/spec.md`).
  Correcting profit without them would leave a break-even price that disagrees
  with the profit printed above it.
- **PART 2 has already made everything deal-scoped**: `/deals/{deal_id}/…`,
  `deal_id` as the first repository parameter, one directory per deal under
  `data/<env>/deals/<deal_id>/`, and 404 for an unknown deal with no fallback
  (`openspec/changes/add-deal-and-property/design.md` — Decisions 1–3).
- **The expense model is a works model.** `ExpenseCategory`'s eleven values are
  all renovation concerns (`backend/app/src/models/expense.py:9-22`);
  `PERMITS_AND_FEES` is the only one an acquisition cost could be forced into,
  and it is a works permit, not a purchase tax.
- **The mockup already shows the shape.** Each acquisition row is label, a
  `basis` caption in mono, and an amount (`Flip Desk.dc.html:214-224`), fed by
  `acqCosts` where the basis values are strings such as
  `'taxa efetiva 3,64% · escalão 2,2636% + 7% s/ excedente'` and `'valor fixo'`
  (`:578-583`). The reference design's own basis field is prose, not a formula.
- **Money discipline is settled and not reopened here**: `Decimal` server-side,
  quantised 2dp half-up (`backend/app/src/models/money.py:1-20`), a string on
  the wire, and no arithmetic in the client.

## Goals / Non-Goals

**Goals:**
- Record what a Portuguese acquisition actually costs, accurately enough to be
  useful and without pretending to know a rate the user has not supplied.
- Correct `projected_profit` and everything derived from it, in one place, so
  that no two figures on a screen disagree about the cost base.
- Keep acquisition money out of every renovation figure, so `budget_used_percent`
  keeps meaning "how much of the works budget is spent".
- Leave the seams PARTs 7 and 8 attach to, without claiming their costs.

**Non-Goals:**
- **A Portuguese tax engine.** No IMT bracket table, no stamp-duty rates, no
  regional variants. See Decision 1.
- VAT decomposition. A recorded amount is the cash that left; agency commission
  is recorded inclusive of IVA rather than split into base and tax.
- Financing costs — mortgage registration, dossier and valuation fees, stamp
  duty on the drawdown, interest. Those are PART 7, and the mockup already puts
  them in a separate card (`Flip Desk.dc.html:586-591`).
- Exit costs — seller-side agency commission, capital gains. Those are PART 8.
- Holding costs — IMI, condomínio, insurance, utilities during the hold. They
  close with no deed and belong to neither of the cards this PART touches.
- Any change to how expenses are modelled, stored or categorised.

## Decisions

### 1. The app records and totals acquisition costs; it does not compute them

The user enters each amount. The system stores it, totals it, and subtracts it.
It holds no knowledge of what any Portuguese rate is or was.

IMT is not one rate. It is a bracket table with a marginal rate and a
*parcela a abater*, and the table differs by whether the property is a permanent
own residence, a secondary residence or neither, differs again for Madeira and
the Azores, differs for urban versus rustic, and is re-tabled in essentially
every Orçamento do Estado. Imposto do Selo on the purchase is a single rate
today, which is precisely what makes it tempting and precisely what makes a
hardcoded constant rot invisibly when it changes.

The maintenance burden of doing otherwise is worth stating plainly, because it
is the whole argument: a rate table in source has no test that can tell it is
out of date. Every pytest written against it would assert that the code computes
what the code says, and pass forever after the law moved. The failure mode is a
confidently wrong tax figure on a screen a user is deciding money with — which
is strictly worse than a blank field, because a blank field prompts them to go
and find the real number.

**Chosen:** amount is user-entered and authoritative; `basis` is free text in
the user's own words, stored as a note, never parsed and never used to derive or
validate the amount.

**Rejected: shipped rate tables for IMT and IS.** Rejected for the reasons
above. If it is ever revisited, the only honest version carries an effective
date per table, refuses to compute for a deed date it has no table for, and
labels every derived figure as an estimate — which is three features, not one,
and still wrong the first year nobody updates it.

**Rejected: a rate × base calculator** (user supplies rate and base, the server
multiplies). It embeds no statutory knowledge, so it is not dishonest — but it
creates two sources of truth for one amount and no rule for which wins when the
user edits the amount afterwards. The mockup's own bases ("valor fixo", "não
orçamentado") are not multiplications, so the structure would not even fit the
data it is modelled on. The suggestion-not-computation middle ground the
proposal floated is the frontend's to offer later as helper text, and it needs
no backend concept.

### 2. An acquisition cost is its own record type with its own store

A new model, a new repository behind the existing protocol pattern, a new
service, and a router under `/deals/{deal_id}/acquisition-costs`. On disk it is
`data/<env>/deals/<deal_id>/acquisition_costs.json` through the existing
`JsonStore`, which already takes `(data_dir, name)`
(`backend/app/src/repositories/json_store.py:10-40`) and needs no change.

**Rejected: a new `ExpenseCategory` value.** One line of code, and it poisons
every figure that already exists — `total_forecast`, `by_category`,
`remaining_budget`, `budget_used_percent` — with money that was never
renovation. `planned_budget` is the works budget; IMT inside it makes the
over-budget flag fire on a deal that is perfectly on budget.

**Rejected: a boolean on `Expense` marking a row as acquisition.** Same data in
one table with a flag every aggregate must remember to filter on. The flag would
be forgotten exactly once, in exactly one aggregate, and nothing would fail.

### 3. Two states, estimated and settled, and both count

An acquisition cost is `ESTIMATED` before the deed and `SETTLED` after. Both are
subtracted from profit.

**Rejected: reusing `ExpenseStatus`** (PLANNED / PENDING / PAID,
`backend/app/src/models/expense.py:37-46`). Its middle state — invoiced but
unpaid — has no counterpart at a deed, where the money moves on the day. Three
states where two exist means one is always empty and a reader must work out
which.

**Rejected: counting only settled costs.** It would make the total rise as the
deed approaches and the profit fall to match, which is the overstatement this
PART exists to remove, re-expressed as a moving target. An estimated IMT is
money that is going to be spent.

The split is reported rather than inferred, because "how much of this is still a
guess" is the question a reader asks of an estimate, and making them subtract
two figures to answer it is how they get it wrong.

### 4. The correction replaces the figure; it does not sit beside it

`projected_profit` keeps its name and its place and starts subtracting the
acquisition total.

**Rejected: a second field** (`projected_profit_after_acquisition` beside the
existing one). It leaves a wrong number in the API with a right one next to it
and lets every consumer — including a future panel and a future PART — pick
either. A figure that is wrong should stop being returned, not be joined.

The consequence is honest and must be said out loud in the PR: a user who has
been reading that number will see it fall, by exactly the acquisition total, on
the day this lands. The spec pins that it falls by exactly that and by nothing
else, and that a deal with no acquisition cost recorded sees no change at all.

### 5. Break-even and the ratios move with the cost base, in this change

`break_even_sale_price` becomes `purchase_price + acquisition_total +
total_forecast`; `margin_percent` and `return_on_cost_percent` are computed from
the corrected profit over the corrected cost base.

This is not optional scope. Break-even is defined as the sale price at which
profit is zero; leaving it on the old base would put two figures on one screen
that cannot both be true, and the one that looks more precise would be the wrong
one.

### 6. The arithmetic correction is specified in a `budget-summary` delta

The change declares three capabilities — `acquisition-costs`, `budget-summary`
and `frontend-expenses`. The profit correction is written as requirements of
`budget-summary`, because that is the capability that owns the figures being
corrected: PART 1 authors `break_even_sale_price`, `margin_percent` and
`return_on_cost_percent` there, and `projected_profit` is returned by the same
model (`backend/app/src/models/budget.py:59-62`).

**Rejected: writing the correction inside `acquisition-costs`** — which an
earlier draft of this change did. It avoided declaring a capability and paid
for it twice. Two deltas would assert one contract, so a later reader could not
tell which was authoritative once they drifted; and PART 1's
`break_even_sale_price` parenthetical — `purchase_price + total_forecast` —
would survive the archive intact, to be amended by hand afterwards or left to
contradict the profit figure printed above it. A MODIFIED block amends that
sentence *as part of* archiving, which is the mechanism for changing a
requirement another change wrote.

The price is an archive INFO from `openspec validate --strict` until PART 1
archives, because the target spec does not exist yet. That is the expected
state for a delta written against an unarchived author; it is recorded under
Risks rather than designed around.

### 7. The totals ride on the deal's existing summary

The acquisition totals — combined, settled, estimated, and the per-kind
breakdown — are added to the summary response the profit and budget views
already fetch, rather than exposed as a second aggregate endpoint.

The screens that need them are the screens that already fetch the summary, on
the same render; a separate call would double the request count to place two
numbers next to each other, and would make it possible for a client to hold a
profit figure and an acquisition total fetched at different moments.

The per-cost list stays its own endpoint, because the card needs rows the
summary has no business carrying.

**Rejected: computing the card's rows from the cost list in the client.** The
client may not sum money (`openspec/specs/frontend-expenses/spec.md` — "Money
never becomes a JavaScript number"), and the mockup's own
`acqCostsTotal = stampBuy + imt + notary` (`Flip Desk.dc.html:490`) is exactly
the shortcut the rule exists to forbid.

### 8. Where each transaction cost lives, decided once

| Cost | Capability | Why |
|---|---|---|
| IMT, Imposto do Selo on the purchase | this PART | closes with the deed |
| Notary, deed, land registry | this PART | closes with the deed |
| Legal fees (advogado / solicitador) | this PART | closes with the deed |
| Buyer-side agency commission | this PART | paid to acquire |
| Mortgage registration, dossier, valuation, stamp on drawdown, interest | PART 7 | exists only because there is a loan |
| Seller-side agency commission, capital gains | PART 8 | paid to exit |
| IMI, condomínio, insurance, utilities | none yet | recurring, closes with nothing |

Agency commission is the one that can be double-counted, because both ends of
the deal have one and they are different money. Buyer-side here, seller-side in
PART 8, stated in both directions so the second PART to land does not add a
line the first already has.

**Rejected: one `transaction-costs` capability covering acquisition, financing
and exit.** It reads tidier and it would have to be built all at once, while
each of the three has a different lifecycle — a deed cost settles once, a
finance cost accrues monthly, an exit cost is a forecast until completion.

## Risks / Trade-offs

- **A user's profit figure drops the day this lands, with no action on their
  part.** → The PR body says so in plain words, the spec pins the drop to
  exactly the acquisition total, and a deal with nothing recorded is provably
  unchanged. This is a correction being made visible, not a regression.
- **PART 1's `budget-summary` spec defines `break_even_sale_price` as
  `purchase_price + total_forecast`, which this change falsifies.** → The
  `budget-summary` delta MODIFIES that requirement, so archiving this change
  rewrites the sentence rather than leaving it for a follow-up. The residual
  risk is ordering: the MODIFIED block needs PART 1 archived first, which both
  the proposal and the delta's blockquote state.
- **Every requirement modified by this change — two in the `frontend-expenses`
  delta, one in `budget-summary` — is copied from PART 1's delta, which has not
  archived.** → If PART 1's text changes before it lands, these copies must be
  re-synced; each blockquote names its source so the divergence is findable
  rather than silent.
- **Nothing prevents the same cost being entered twice — once as an acquisition
  cost, once as an expense.** → The separation is structural (different store,
  different endpoint, no acquisition kind among the expense categories), but a
  user determined to type IMT into the ledger can. Detecting that would mean
  guessing at intent from a description string; the specs make the boundary
  explicit instead.
- **`basis` is free text and therefore untranslated.** → Correct and
  deliberate: it is user content, and the i18n rule covers app chrome, not what
  the user typed. The spec says so, so a later reviewer does not file it as a
  missing catalogue entry.
- **The card is one more panel on an already dense screen**, in a language that
  runs 20–30% longer than English (PART 1's Risks). → Check both locales at
  1280px before calling the frontend half done, as PART 1's tasks already
  require for its own surface.
- **`openspec validate --strict` reports two archive INFOs**, and both are
  expected. The change is valid and the command exits 0:

  ```
  ℹ [INFO] budget-summary/spec.md: Archive would refuse this delta:
    budget-summary: target spec does not exist; only ADDED requirements are
    allowed for new specs. MODIFIED and RENAMED operations require an existing
    spec.
  ℹ [INFO] frontend-expenses/spec.md: Archive would refuse this delta:
    frontend-expenses MODIFIED failed for header
    "### Requirement: The profit view states the deal's arithmetic" - not found
  ```

  The first says `budget-summary` has no main spec at all — PART 1 authors the
  capability and has not archived, so there is nothing yet for a MODIFIED to
  target. The second says the capability's main spec exists but that one
  requirement is not in it yet, for the same reason: PART 1 adds it. The other
  requirement modified here, "Money never becomes a JavaScript number", is
  already in the main spec and raises nothing — which is what confirms both
  INFOs are about PART 1's sequencing and not about these deltas' shape.

  → Both resolve themselves when PART 1 archives ahead of this change, as the
  blockquotes require. They are **not** a reason to restructure a delta, to
  downgrade a MODIFIED to an ADDED, or to move the correction back inside
  `acquisition-costs` — any of those silently drops PART 1's requirement text
  at archive and leaves the pre-correction break-even formula standing.

## Migration Plan

1. No stored data changes. Acquisition costs are a new collection; its absence
   for an existing deal is an empty list, and no existing file is read or
   rewritten. There is nothing to roll back on disk.
2. Backend lands first and is green on its own: model, repository, service,
   routes, then the summary and profit correction as the last backend step so
   the corrected figure is never returned before the costs that justify it can
   be recorded.
3. Frontend follows: API client, the acquisition card, the waterfall line.
4. Rollback is removing the subtraction from the profit computation; the stored
   costs remain valid and simply stop being subtracted.
