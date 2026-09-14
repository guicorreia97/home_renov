# Design: Sequencing the eight Flip Desk PARTs

## Context

See `proposal.md` — Why. The facts this design is built on, all verified against
the working tree rather than assumed:

- **Eight changes, 9,916 lines, all planning-complete.** Every one returns
  `exit=0` from `openspec validate --strict` with zero errors and zero warnings.
- **Twenty INFO lines across the eight**, every one of the form *"Archive would
  refuse this delta"*. They are not defects. They are the tool correctly
  reporting that a MODIFY targets a capability, or a requirement, that only
  exists inside an earlier unarchived change.
- **Four requirements are modified by more than one change** (the collision
  matrix in Decision 3).
- **PART 1 is already merged to `main`.** The other seven are not.

## Goals / Non-Goals

**Goals:**
- Make the order explicit and give each position a reason, so it survives someone
  picking up PART 6 on a Monday.
- Name every place where landing order changes the result, and say who must do
  what about it.
- Carry the non-OpenSpec gates — human review, rule 8, CODEOWNERS — where they
  will be read before the work starts rather than at merge.

**Non-Goals:**
- Any delta spec. This change declares no capability, deliberately.
- Re-deciding anything already settled inside a PART. Where a decision is
  recorded here it is a pointer, never a second statement of it.
- A schedule. This fixes order and obligations, not dates.

## Decisions

### 1. This is a change, not a `ROADMAP.md`

It is tracked by `openspec list`, it validates, and it archives with the work it
describes. A markdown file beside the changes would drift the first time a PART
moved, and nothing would catch it — the same argument the harness already makes
for `harness-check.sh`.

**Rejected:** a plain roadmap doc. Untracked by the tooling, and invisible to
anyone who starts from `openspec list`.

### 2. `skip_specs: true`, so it can never collide

The eight own every requirement in play. If this change carried deltas, it would
be a ninth writer on capabilities that already have three, and archiving it would
apply the same edits twice. `skip_specs` is the marker `openspec validate`
requires for a deliberate zero-delta change, and this is exactly the case it
exists for: the behaviour does not change, so no spec changes.

### 3. The order, and what fixes each position

| # | Change | Fixed by |
|---|---|---|
| 1 | `redesign-flip-desk-skin` | Authors `frontend-shell` and `budget-summary`; seven siblings MODIFY them. Already on `main`. |
| 2 | `add-deal-and-property` | The `deal_id` spine. Cheapest now; a migration later. |
| 3 | `add-works-phases` | A phase belongs to a deal. Blocks PART 5. |
| 4 | `add-contractors` | Needs PART 2. Independent of 3 and 5, but collides with 3 on the ledger requirement. |
| 5 | `add-line-item-budgeting` | Rubricas live inside phases, so it needs PART 3. |
| 6 | `add-acquisition-costs` | Needs PART 2 only. First of the three profit-base changes. |
| 7 | `add-financing-and-equity` | Needs PART 2. **Not** independent of 6 — its equity counts PART 6's costs. |
| 8 | `add-deal-maths` | Needs 6 and 7. A sensitivity grid over an incomplete cost base is confidently wrong. |

### 4. The re-copy rule for shared requirements

A MODIFIED block replaces its requirement whole. Where more than one change
modifies the same requirement, **every change after the first must re-copy the
requirement from the then-current main spec before archiving** — not from PART
1's delta, which is where they all originally copied from.

| Requirement | Capability | Modified by | Obliged to re-copy |
|---|---|---|---|
| Profitability figures are derived from the targets | `budget-summary` | PARTs 6, 7, 8 | 7 and 8 |
| The ledger shows how each expense was settled and evidenced | `frontend-expenses` | PARTs 3, 4 | whichever lands second |
| The works budget view groups expenses by category | `frontend-expenses` | PARTs 3, 5 | 5 (it pins PART 3's header byte-identical on purpose) |
| The profit view states the deal's arithmetic | `frontend-expenses` | PARTs 6, 7, 8 | 7 and 8 |

PART 8 already carries this obligation as a task. The others are added here.

**Rejected:** having each change copy from PART 1's delta and reconciling by hand
at the end. That is how two of the three profit terms would go missing without
any tool noticing — a MODIFIED block that drops an earlier edit still validates.

### 5. Where a figure is computed is settled; where it is *carried* is per-change

Every derived figure is computed server-side in `Decimal` and consumed as
returned — PART 1's Decision 6, and normative in three capabilities. PART 5
sharpened the wording usefully: the guarantee is about **where a figure is
computed**, not which response carries it. That is what lets PART 3 put per-phase
figures on the summary while PART 5 puts per-line figures on the line-item
endpoints, without either weakening the rule.

### 6. Corrections already applied, recorded so they are not relitigated

- **The profit cost base.** `projected_profit` was `sale − purchase − forecast`,
  which ignored acquisition and finance costs entirely. PART 6 adds acquisition,
  PART 7 adds exactly one finance term, PART 8 adds exit costs. `break_even_sale_price`
  and both ratios move with it every time, because a break-even price that
  disagrees with the profit above it is worse than either being wrong alone.
- **An absent loan record means unknown, not zero.** PARTs 7 and 8 contradicted
  each other; resolved in PART 8's favour. A finance cost of `0.00` is reported
  only for a deal the user has **declared** unfinanced. Absence leaves the figure
  absent and the cost base incomplete, because an all-cash deal and a deal whose
  loan has not been entered are indistinguishable in storage.
- **Contractors are application-scoped.** The one repository whose methods take
  no `deal_id` — a deliberate exception to PART 2's rule, because per-deal
  scoping recreates the duplication PART 4 exists to end.
  `docs/persistence-guide.md:19` already prescribed it.

## Risks / Trade-offs

- **The profit figure visibly drops three times** — PARTs 6, 7 and 8 each lower
  it. Three consecutive releases where the headline number falls, with nothing
  saying why, reads as a regression. → Each PR body names it.
- **Two changes alter the on-disk format** (PARTs 2 and 3) and one rewrites
  records in place (PART 4). PART 2 moves files, so rollback is a move back;
  PARTs 3 and 4 need a pre-upgrade copy of each deal's `expenses.json`, and PART
  3's `extra="forbid"` (`backend/app/src/models/expense.py:52`) means a stored
  `phase_id` fails validation on an older build. → Human review before each,
  per the agent loop.
- **PART 2 falsifies the product line in `AGENTS.md`/`CLAUDE.md`.**
  Single-property dies; single-user and local-first survive. → Rule 8: asked for,
  never assumed, and its own commit.
- **PART 3 needs `docs/design-system-guide.md` amended** — "colour means status"
  becomes "status **or** identity" so phases can carry user-assigned colours from
  a palette that excludes every status hue. → CODEOWNERS pulls in a human
  reviewer automatically.
- **The twenty INFOs will not clear until PART 1 archives.** Anyone running
  `validate --strict` before then should expect them and not restructure a delta
  to silence one. → Stated here and in each affected change's Risks.

## Migration Plan

Not applicable — this change moves no data and ships no code. The migrations it
sequences belong to PARTs 2, 3 and 4 and are specified there.
