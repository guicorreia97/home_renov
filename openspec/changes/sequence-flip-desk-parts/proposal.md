# Proposal: Sequencing the eight Flip Desk PARTs

> **The programme change.** It ships no behaviour and carries no delta specs
> (`skip_specs: true`). It exists to hold the one thing none of the eight can
> hold on its own: the order they land in, and what each must do on the way in
> so it does not silently undo the one before it.

## Why

The Flip Desk redesign is split across eight changes, each independently valid
and each planning-complete. Every one of them was written against a world where
the earlier PARTs have archived — and OpenSpec cannot enforce that. Three
specific mechanics make the order load-bearing rather than merely tidy:

1. **A MODIFIED delta replaces a requirement whole.** Three changes — PARTs 6, 7
   and 8 — each MODIFY `### Requirement: Profitability figures are derived from
   the targets`, and each copies PART 1's original block because
   `budget-summary` has no main spec yet. Whichever archives last silently
   discards the other two's edits unless it re-copies from the then-current text
   first. The same mechanic applies on `frontend-expenses`, where PARTs 3 and 4
   both rewrite the ledger requirement.
2. **Two capabilities do not exist yet.** PART 1 authors `frontend-shell` and
   `budget-summary`. Until it archives, every sibling MODIFY against them is
   refused at archive time — which is what the INFO lines in `openspec validate`
   are telling us, correctly, across seven changes.
3. **The `deal_id` spine is cheapest now and never again.** PART 2 rewrites five
   models, both repositories, eight of ten routes and the on-disk format. Every
   later PART hangs a `deal_id` off it. Landing any of them first turns PART 2
   from a feature into a migration of data that already exists.

None of that is visible from inside a single change. This one holds it.

## What Changes

**No product behaviour, no code, no specs.** This change contributes:

- **The canonical order** of the eight, with the dependency that fixes each
  position.
- **The archive-order rules** for the four requirements that more than one change
  modifies, including which change is obliged to re-copy before archiving.
- **The gates that are not OpenSpec's** — the two storage-format changes needing
  human review, the rule 8 edit that must be asked for, and the
  `docs/design-system-guide.md` amendment that pulls in a CODEOWNERS reviewer.
- **The cross-part corrections already applied**, recorded so they are not
  rediscovered: the profit figure's cost base, the declaration-based model for an
  absent loan, and the contractor-scoping exception.

## Capabilities

None. This change alters no system behaviour, so it declares no capability and
sets `skip_specs: true` — the marker `openspec validate` requires for a
deliberate zero-delta change. Inventing a requirement here to satisfy validation
would put a second, weaker statement of the eight PARTs' contracts into the specs
they already own.

## Impact

**Specs.** None directly. Governs the order in which the other eight write to
`openspec/specs/`.

**Code.** None.

**Process.** Three human-review gates and one rule 8 ask are named here rather
than left to be discovered at merge time.

## Deletes from the other PARTs

Nothing. Every cross-part correction this change records has already been applied
inside the change that owns it; this file is the index, not a second source.
