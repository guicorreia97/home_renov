# docs/

## Authority order

When two documents disagree, the higher one wins:

1. **Guides in this folder** (`*-guide.md`) — normative. Maintained, current,
   binding. `AGENTS.md` points here for a reason: read the guide, don't infer the
   convention from nearby code.
2. **`ARCHITECTURE-DECISIONS.md`** — records *why* a choice was made and when to
   revisit it. Explains the guides; does not override them.
3. **`plans/`** — non-normative. Dated proposals and drafts. A plan describes
   something that may never happen. Never cite a plan as a rule.

## Maintenance

- A guide that no longer matches the code is a bug — fix the guide in the same
  commit as the change, or fix the code.
- Delete a plan once it ships. Its outcome belongs in a guide or an ADR.
- Every file in `plans/` starts with a date and a one-line status.
