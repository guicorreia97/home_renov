# docs/

## Authority order

When two documents disagree, the higher one wins:

1. **Guides in this folder** (`*-guide.md`) — normative. Maintained, current,
   binding. `AGENTS.md` points here for a reason: read the guide, don't infer the
   convention from nearby code.
2. **`ARCHITECTURE-DECISIONS.md`** — records *why* a choice was made and when to
   revisit it. Explains the guides; does not override them.
3. **`openspec/changes/`** — non-normative. Proposals for work not yet shipped.
   A proposal describes something that may never happen. Never cite one as a
   rule. Once shipped it is archived and its requirements land in
   `openspec/specs/`.

## Maintenance

- A guide that no longer matches the code is a bug — fix the guide in the same
  commit as the change, or fix the code.
- Archive an OpenSpec change once it ships (`openspec-archive-change`). Any
  convention it established belongs in a guide or an ADR, not in the archive.
