# Design system — home_renov

**Normative.** Every component uses these tokens. Do not invent colors, spacing
values, or radii. If something here is missing for a real screen, add it to this
file first, then use it.

## Direction

Dark, dense, instrumental. This is a desk for deciding whether a renovation is
losing money — it should read like a trading terminal at night, not a document.
A near-black neutral ground, one mint accent doing all the work, figures set in
mono so columns scan, and restraint with color: color means *status* or *action*,
never decoration.

## Color tokens

Dark is the only theme in v1. Define these as CSS custom properties on `:root`.

| Token | Value | Use |
|---|---|---|
| `--bg` | `#0c0d0c` | Page ground. Near-black neutral. |
| `--surface` | `#131513` | Cards, panels, modals. |
| `--surface-raised` | `#1a1c1a` | Hover, nested surfaces, inputs. |
| `--border` | `rgba(255,255,255,.07)` | Hairlines, dividers, input borders. |
| `--text` | `#e8eae7` | Primary text. Off-white, never pure `#FFF`. |
| `--text-muted` | `rgba(232,234,231,.72)` | Secondary text, labels, timestamps. |
| `--text-faint` | `rgba(232,234,231,.55)` | Placeholders, disabled. |
| `--accent` | `#4fd39a` | Mint. Primary buttons, active nav, focus. |
| `--accent-hover` | `#6ee0af` | Accent hover state. |
| `--accent-soft` | `rgba(79,211,154,.11)` | Accent-tinted fills, selected rows. |
| `--success` | `#4fd39a` | Done, complete, under budget. |
| `--warning` | `#e0a34a` | At risk, approaching budget. |
| `--danger` | `#e06a5a` | Blocked, over budget, destructive. |
| `--success-soft` | `rgba(79,211,154,.11)` | Success badge fill. |
| `--warning-soft` | `rgba(224,163,74,.07)` | Warning badge fill. |
| `--danger-soft` | `rgba(224,106,90,.11)` | Danger badge fill. |
| `--overlay` | `rgba(12,13,12,.8)` | Backdrop behind a modal. |

The `-soft` tokens are real translucency. They were once precomputed solid
blends because the palette was opaque hex and Tailwind's `/opacity` modifier
needs an alpha-capable format; the palette now carries alpha, so they are
genuine `rgba()` fills and composite correctly over any surface beneath them.

### The accent is also the success colour

`--accent` and `--success` are the same mint. This is deliberate and it is the
one place the palette asks for care:

- The accent marks the **primary action** — one per view. A screen with three
  mint buttons has no primary action.
- The same mint used on a **figure** is reporting status, not offering an
  action. "Under budget" in mint is a fact; a mint button is a verb.

Never use `--success` merely because a value is positive. Status colors are
reserved for status.

**Budget thresholds.** "Approaching" and "over" are specific numbers, so that
two screens showing the same spend never disagree about its colour:

| Share of the planned budget forecast | Token |
|---|---|
| under 80% | `--success` |
| 80% to under 90% | `--warning` |
| 90% and over, or the API's `over_budget` flag | `--danger` |

Red starts at 90% rather than at 100% deliberately: once the remaining budget is
that small the next expense is likely to break it, and a warning that only
arrives after the money is gone is too late to act on.

### Category swatches are a monochrome ramp

Categories are identified by `--accent` at stepped opacity, ordered by share of
spend — **not** by a distinct hue each. Colour carries meaning in this system,
and a hue per category is decoration: it would make mint mean "this category" in
the sidebar and "under budget" everywhere else, in the same viewport.

This is a deliberate departure from the source mockup, which assigns seven hues.
Revisit only when a user names and colours something themselves — at that point
the colour is identity a person assigned, not decoration the app invented.

## Typography

**Space Grotesk** (`'Space Grotesk'`, `system-ui`, `sans-serif`) for prose and
labels. **IBM Plex Mono** (`'IBM Plex Mono'`, `ui-monospace`, `monospace`) for
every figure — amounts, percentages, dates in tables, and micro-labels. Numbers
use `font-variant-numeric: tabular-nums` so columns align.

| Role | Size / weight / tracking | Family |
|---|---|---|
| Page title | 22px / 600 / `-0.02em` | sans |
| Section heading | 16px / 600 / `-0.01em` | sans |
| Card title | 14px / 600 | sans |
| Body | 13px / 400 / `1.5` line-height | sans |
| Label, meta | 12.5px / 500 / `--text-muted` | sans |
| Table header (sentence-cased) | 12.5px / 500 / `0.04em` | sans |
| Numeric display | 22px / 600 / tabular | mono |
| Figure (table cell, KPI value) | 13px / 500 / tabular | mono |
| Micro-label (column head, KPI caption) | 11px / 500 / `0.08em`, uppercase | mono |

### The 11px floor is a deliberate, bounded relaxation

This guide previously said **never go below 13px**. That floor now sits at:

- **12.5px** for prose, labels, and any sentence-cased text. This is a hard
  floor — nothing readable as a sentence goes below it.
- **11px** for **uppercase, letterspaced, mono micro-labels only** — column
  headers and KPI captions, never prose.

Why it moved: a six-column financial table at 13px either wraps or scrolls, and
both destroy the column-scanning the table exists for. The mitigations are that
uppercase mono at `0.08em` tracking has a larger effective x-height than 11px
sans, and that these strings are single words, never sentences.

**What did not move:** the 4.5:1 contrast requirement and the 40px interactive
target are **unchanged** and are not relaxed for dense surfaces. The source
mockup's 10px is **not** adopted — a floor moves once, deliberately, not to
whatever a reference happens to use.

Body text is never `--text-faint`.

## Spacing & shape

- **8pt grid.** Allowed values: 4, 8, 12, 16, 24, 32, 48, 64. Nothing else.
- Card padding 16px; card gap 16px; section gap 24px.
- Radii: **7px** inputs and buttons, **10px** cards, 999px pills and badges.

The source mockup uses 9px row padding, 18px card padding and 26px gutters — on
no grid at all. Those snap to 8 / 16 / 24. At these sizes the difference is a
pixel or two, invisible beside the type, colour and density that actually carry
the redesign, and inventing three off-grid tokens to chase it would breach the
no-new-tokens rule for no perceptible gain.

## Layout tokens

Structural sizing constants that are not spacing (margin/padding/gap) but still
need a named value instead of an arbitrary one-off in a component. Defined
under `theme.extend` in `tailwind.config.js`.

| Token | Value | Use |
|---|---|---|
| `max-w-modal` | 480px | Modal panel width. |
| `max-h-modal` | 85vh | Modal panel max height before its body scrolls. |
| `min-w-field` | 160px | Minimum width for an inline filter/select. |

## Text expansion

The UI ships in English and European Portuguese (`pt-PT`), and Portuguese runs
**20–30% longer** than English for the same message. Two limits do not move to
make room: the modal is fixed at **480px** (`max-w-modal`) and type never goes
below its floor (12.5px prose, 11px mono micro-labels). A longer string is
absorbed by layout, never by shrinking:

- Labels, helper text and messages wrap onto another line. They are not
  truncated, ellipsised, or set in a smaller one-off size.
- Fields placed side by side in a modal must fit the longest label in either
  language, or stack.
- A label that would crowd a figure moves onto its own line above it; figures
  stay tabular and aligned.
- No new token is added to make a string fit.

The sidebar takes a fixed 258px, so the content column is tighter than it was.
Check a screen in `pt-PT` at 1280px before calling it done — English is the
short case.

## Elevation & motion

Dark UIs separate layers with **surface lightness, not shadow**. Use `--surface`
→ `--surface-raised` to raise something; keep shadows to a single soft
`0 1px 2px rgba(0,0,0,.4)` on floating elements (dropdowns, modals) only.

Transitions: 150ms `ease-out` on color and background. No transforms on hover,
no entrance animations. Respect `prefers-reduced-motion`.

## Components

- **Button** — Primary: `--accent` fill, `--bg` text, 7px radius, 10/16 padding.
  Secondary: transparent with `--border`, `--text` label. Ghost: text only,
  `--text-muted`. Destructive: `--danger`. Every button has a visible
  `:focus-visible` ring in `--accent`, 2px, 2px offset.
- **Card** — `--surface`, 1px `--border`, 10px radius, 16px padding.
- **Input** — `--surface-raised` fill, 1px `--border`, 7px radius; border becomes
  `--accent` on focus. Label above, 12.5px `--text-muted`. Errors: `--danger`
  border with the message below in 12.5px, never a bare red glow.
- **Badge** — pill, the status `-soft` token as fill, full-strength text.
- **Table** — no vertical rules; 1px `--border` between rows; header is an
  11px uppercase mono micro-label in `--text-muted` with `0.08em` tracking;
  numeric columns right-aligned, mono and tabular.
- **Empty state** — a real sentence saying what to do next plus the primary
  action. Never just "No data".

## Accessibility

Body text on `--bg` and `--surface` must clear **4.5:1**; every token pair above
does, verified by computation rather than by eye:

| Pair | On `--bg` | On `--surface` |
|---|---|---|
| `--text` | 16.1:1 | 15.2:1 |
| `--text-muted` | 8.5:1 | 8.2:1 |
| `--text-faint` | 5.4:1 | 5.3:1 |
| `--accent` / `--success` | 10.3:1 | 9.7:1 |
| `--warning` | 8.8:1 | 8.3:1 |
| `--danger` | 5.9:1 | 5.6:1 |

The alphas below `.55` that the source mockup uses for muted text — `.5`, `.45`
and `.4` — compute to 4.6:1, 3.9:1 and 3.3:1 on `--bg`. The lower two fail
outright, and `.5` clears the bar by only 0.1, too thin a margin for the text
step used most often. `--text-faint` sits at `.55` for that reason.

Interactive targets are at least 40px tall — unchanged by the 11px micro-label
floor. Focus is always visible — never `outline: none` without a replacement
ring.

## Stack

Tailwind CSS, with these tokens mapped in `tailwind.config` under
`theme.extend.colors` so classes read `bg-surface`, `text-muted`, `bg-accent`.
Do not use Tailwind's stock palette (`bg-gray-800`, `text-blue-500`) — it is
cool-toned and will fight this system.
