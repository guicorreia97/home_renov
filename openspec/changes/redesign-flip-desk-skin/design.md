# Design: The Flip Desk skin

## Context

See `proposal.md` — Why. The constraints that shape the approach:

- **The token layer is total.** No component or feature file contains a raw hex
  or an arbitrary Tailwind value, and no test asserts a class name
  (`toHaveClass` count: 0). Spacing already sits on the 8pt scale
  (`frontend/tailwind.config.js:53-64`). A palette swap is therefore a
  values-only edit — this is the fact the whole change is built on.
- **Fonts already load from Google Fonts** (`frontend/index.html:9-13`), so new
  families are one line and add no dependency. Rule 9's
  human-review-before-a-dependency does not trigger.
- **`docs/design-system-guide.md` is normative**, and two of its rules conflict
  with the mockup. That is a decision to take deliberately, not a detail.
- **Money is a string and the client never does arithmetic on it.**
  `frontend/src/types/money.ts` types `Money` as `string` precisely so
  `total + expense.amount` is a type error, and
  `openspec/specs/frontend-expenses/spec.md:55-58` makes it normative. This is
  the constraint that shapes the change most — see Decision 6.
- **`scripts/harness-check.sh` does not compare design tokens to the guide.**
  Retokenising cannot break the gate — and the gate cannot catch guide/CSS
  drift either. See Risks.

## Goals / Non-Goals

**Goals:**
- The app reads as the mockup does — density, hierarchy, mono figures, a desk
  rather than a document.
- Every figure on screen is real, and every total is computed server-side in
  `Decimal`.
- The retokenise is provable in isolation: existing tests pass unchanged.
- Deviations from the design guide are written down in the guide, with reasons.

**Non-Goals:**
- Mock or placeholder data of any kind (see Decision 4).
- Any new entity, route or storage-format change. 1b extends an existing
  response model and nothing else.
- The panels belonging to PARTs 2–8, even where they'd be easy to stub.
- A light theme. Dark remains the only theme.

## Decisions

### 1. Adopt the mockup's palette wholesale, but derive the text alphas from the contrast rule

The mockup's muted text steps are `rgba(232,234,231,.5)`, `.45` and `.4` over
`#0c0d0c`. Computed against the guide's **4.5:1 body-text requirement**
(`docs/design-system-guide.md:123-127`), the lower two fail:

| Alpha over `#0c0d0c` | Contrast | Verdict |
|---|---|---|
| `.40` | ~3.5:1 | fails |
| `.45` | ~3.9:1 | fails |
| `.52` | ~4.9:1 | passes, but sits too close to `.55` to read as a step |
| **`.55`** | **~5.3:1** | **`--text-faint`** |
| **`.72`** | **~8.4:1** | **`--text-muted`** |

So the palette below keeps three genuine steps of hierarchy where all three
clear 4.5:1. `.72` is not invented — it is the alpha the mockup itself uses for
sidebar nav text.

| Token | Value | Contrast on `--bg` |
|---|---|---|
| `--bg` | `#0c0d0c` | — |
| `--surface` | `#131513` | — |
| `--surface-raised` | `#1a1c1a` | — |
| `--border` | `rgba(255,255,255,.07)` | — |
| `--text` | `#e8eae7` | ~16.1:1 |
| `--text-muted` | `rgba(232,234,231,.72)` | ~8.4:1 |
| `--text-faint` | `rgba(232,234,231,.55)` | ~5.3:1 |
| `--accent` | `#4fd39a` | ~10.3:1 |
| `--accent-hover` | `#6ee0af` | — |
| `--accent-soft` | `rgba(79,211,154,.11)` | — |
| `--warning` | `#e0a34a` | ~8.9:1 |
| `--warning-soft` | `rgba(224,163,74,.07)` | — |
| `--success`, `--danger` | retuned to sit on `#0c0d0c` | must clear 4.5:1 |

These ratios are computed, not measured. **Verify them with a contrast checker
during 1a** and adjust the alpha rather than the rule if any falls short.

Two knock-on effects. `--border` becomes `rgba(...)`, so anything compositing
against it needs a look. And the `-soft` tokens exist as precomputed blends
only because the palette was opaque hex (`frontend/src/index.css:41-44`) — with
alpha available they become real translucency, and that comment stops being
true and must be rewritten.

### 2. The 13px floor moves to 11px, for one narrow case only

**The guide says "Never go below 13px"** (`docs/design-system-guide.md:74`).
The mockup runs 10–12.5px throughout, and its density is not decorative — a
six-column financial table at 13px either wraps or scrolls, and both destroy
the column-scanning the table exists for.

**Chosen:** the floor moves to **11px, permitted only for uppercase,
letterspaced, mono micro-labels** — column headers and KPI captions. Prose,
labels and any sentence-cased text keep a **12.5px** floor. The mockup's 10px
is not adopted.

This is a real relaxation of an accessibility rule and is recorded as such in
the guide. The mitigations: uppercase mono at `0.08em` tracking has a larger
effective x-height than 11px Inter; these strings are single words, never prose;
and the 4.5:1 contrast rule and the 40px target rule are **not** relaxed.

**Rejected:** keeping 13px everywhere and letting the tables scroll. It defeats
the point of the redesign. **Rejected:** the mockup's 10px — a floor should
move once, deliberately, not to whatever the reference happens to use.

### 3. Category swatches use a monochrome ramp, not seven hues

The guide's direction is explicit: **"color means *status*, not decoration"**
(`docs/design-system-guide.md:12-13`). The mockup's phase rail assigns a
distinct hue per phase, which is decoration — the colour carries no meaning
beyond identity.

**Chosen:** category swatches are `--accent` at stepped opacity, ordered by
share of spend. The rail keeps its visual rhythm and scannability; status
colours keep their monopoly on meaning; no new hue enters the palette (rule 7).

**Rejected:** seven decorative hues. It would make green mean "this category"
in the sidebar and "under budget" everywhere else, in the same viewport.

Revisit at PART 3: once phases are real and a user names and colours them, the
colour is identity the user assigns rather than decoration the app invents.

### 4. No mock data, anywhere

A panel the API cannot feed is **not built** in this change. It arrives with
the PART that fills it.

The alternative — building the full mockup against sample figures — was
considered and rejected. This is a tool for deciding whether a renovation is
losing money. A fabricated acquisition cost or loan-interest figure renders in
the same type, at the same weight, beside real ones from the API; a badge is a
weaker defence than simply not drawing it. It also creates a mock module that
every later PART has to remember to unpick.

The cost is honest and accepted: **the app will look sparser than the mockup
until PART 8.** Sparse and true beats complete and invented.

### 5. Four branches, sequenced

`feat/flip-desk-tokens` → `feat/summary-derived-totals` →
`feat/flip-desk-shell` → `feat/flip-desk-panels`.

The retokenise is the one change in this set whose correctness is provable by
the existing suite: it must pass **unchanged**. If a test breaks on 1a,
something is coupled to a token value that shouldn't be — that is a finding
worth surfacing, and it is invisible inside a diff that also moves every
component in the app. Bundling would forfeit the only free verification here.

The backend work is second rather than last so the panels are never written
against figures that don't exist yet, and it is separate rather than folded in
so a Python diff and a CSS diff are never reviewed as one thing.

### 6. The derived totals are computed server-side, not in the browser

This is the decision the change turned on. The panels need group subtotals,
category shares, margin, return on cost and a break-even price. Every one of
those is arithmetic over `Money`, and the client is forbidden from doing it —
`Money` is `string`, and the rule is normative
(`openspec/specs/frontend-expenses/spec.md:55-58`), for the reason
`frontend/src/types/money.ts` gives: an IEEE-754 double cannot hold a decimal
amount intact, and `0.1 + 0.2 === 0.30000000000000004` is not an acceptable
answer to what the tiles cost.

**Chosen:** `BudgetSummary` gains the figures, `budget_service.py` computes them
in `Decimal` under the existing quantisation (`app/src/models/money.py:9-20`),
and the client formats what it is given. This is what the money doc means when
it says "that is why `GET /budget/summary` exists".

**Rejected:** integer-cents arithmetic in the frontend. It would deliver the
same pixels with no backend work, and it would put a second, weaker
implementation of money arithmetic in the codebase — one that no pytest covers
and that the type system was deliberately arranged to prevent.

**Rejected:** dropping the panels to keep 1b out. Tab 1 without subtotals is a
flat table with headings, which is roughly what exists today.

A note for implementation: `by_category` currently **excludes PLANNED**
expenses (`backend/app/src/services/budget_service.py:97-108`) while
`total_forecast` includes them. Extending it with planned/pending/paid must not
silently change what the existing `amount` field means — a test should assert
group subtotals reconcile with the grand total **with a planned expense
present**, which is the case that catches this.

### 7. Snap the mockup's spacing back onto the 8pt grid

The mockup uses 9px row padding, 18px card padding and 26px gutters — on no
grid at all. The guide allows 4, 8, 12, 16, 24, 32, 48, 64 and **"Nothing
else"** (`docs/design-system-guide.md:79`).

**Chosen:** snap to 8 / 16 / 24. At these sizes the difference is a pixel or
two, invisible beside the changes that actually carry the redesign — type,
colour and density of information. Inventing three off-grid spacing tokens to
chase it would breach rule 7 for no perceptible gain.

## Risks

- **The guide rewrite is the real deliverable of 1a**, not the CSS. If the two
  drift, the CSS wins by accident and the guide silently lies — and
  `harness-check.sh` cannot see it. A token-parity check comparing the guide's
  table to `index.css` is the natural follow-up, in the spirit of `457ee04`;
  it is out of scope here and flagged for the user.
- **Portuguese runs 20–30% longer than English** and the shell adds a fixed
  258px sidebar, tightening the content column. `add-i18n-pt-en` already flags
  this for the 480px modal; the tab labels and KPI captions are new surface
  where it bites. Check both locales at 1280px before calling 1d done.
- **Density plus an 11px floor is where accessibility erodes quietly.** The
  40px interactive-target rule is not relaxed, and compact table rows are the
  obvious place it would be broken by accident.
- **Margin and return are ratios, not money.** They leave the API as numbers,
  not decimal strings, and `budget_used_percent` already sets that precedent
  (`float | None`). Keep the two shapes distinct so nothing formats a ratio as
  currency.
