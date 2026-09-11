# Design system — home_renov

**Normative.** Every component uses these tokens. Do not invent colors, spacing
values, or radii. If something here is missing for a real screen, add it to this
file first, then use it.

## Direction

Dark, warm, calm. This is a tool someone opens while standing in a half-finished
room — it should feel like a workshop at night, not a dashboard. Deep neutral
grounds with a warm cast (never blue-grey), one terracotta accent doing all the
work, generous whitespace, and restraint with color: color means *status*, not
decoration.

## Color tokens

Dark is the only theme in v1. Define these as CSS custom properties on `:root`.

| Token | Value | Use |
|---|---|---|
| `--bg` | `#14110F` | Page ground. Warm near-black. |
| `--surface` | `#1E1A17` | Cards, panels, modals. |
| `--surface-raised` | `#292320` | Hover, nested surfaces, inputs. |
| `--border` | `#3A322E` | Hairlines, dividers, input borders. |
| `--text` | `#F2EDE8` | Primary text. Warm off-white, never pure `#FFF`. |
| `--text-muted` | `#A79B92` | Secondary text, labels, timestamps. |
| `--text-faint` | `#6E635C` | Placeholders, disabled. |
| `--accent` | `#D97843` | Terracotta. Primary buttons, active nav, focus. |
| `--accent-hover` | `#E68A55` | Accent hover state. |
| `--accent-soft` | `#3A241A` | Accent-tinted fills, selected rows. |
| `--success` | `#6BA368` | Done, complete, under budget. |
| `--warning` | `#D9A441` | At risk, approaching budget. |
| `--danger` | `#C25B4E` | Blocked, over budget, destructive. |
| `--overlay` | `rgba(20, 17, 15, 0.8)` | Backdrop behind a modal, dimming the screen beneath it. |
| `--success-soft` | `#2A2F23` | Success badge fill — `--success` blended ~15% over `--surface`. |
| `--warning-soft` | `#3A2F1D` | Warning badge fill — `--warning` blended ~15% over `--surface`. |
| `--danger-soft` | `#37241F` | Danger badge fill — `--danger` blended ~15% over `--surface`. |

The soft tokens exist because Tailwind's `/opacity` modifier needs a color defined
in an alpha-capable format; ours are plain hex custom properties, so a genuine
15%-opacity fill is precomputed as its own solid token instead — same pattern as
`--accent-soft`.

Rules: the accent appears **once per view** as the primary action — a screen with
three terracotta buttons has no primary action. Status colors are reserved for
status; never use `--success` merely because a thing is positive.

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

## Typography

**Inter** (`Inter`, `system-ui`, `sans-serif`). Numbers in tables and budget
figures use `font-variant-numeric: tabular-nums`.

| Role | Size / weight / tracking |
|---|---|
| Page title | 28px / 600 / `-0.02em` |
| Section heading | 20px / 600 / `-0.01em` |
| Card title | 16px / 600 |
| Body | 15px / 400 / `1.6` line-height |
| Label, meta | 13px / 500 / `--text-muted` |
| Numeric display (budget) | 24px / 600 / tabular |

Never go below 13px. Body text is never `--text-faint`.

## Spacing & shape

- **8pt grid.** Allowed values: 4, 8, 12, 16, 24, 32, 48, 64. Nothing else.
- Card padding 24px; card gap 16px; section gap 32px.
- Radii: 8px inputs and buttons, 12px cards, 999px pills and badges.
- Max content width 1200px, centered.

## Layout tokens

Structural sizing constants that are not spacing (margin/padding/gap) but still
need a named value instead of an arbitrary one-off in a component. Defined
under `theme.extend` in `tailwind.config.js`, alongside the 1200px content
width above.

| Token | Value | Use |
|---|---|---|
| `max-w-modal` | 480px | Modal panel width. |
| `max-h-modal` | 85vh | Modal panel max height before its body scrolls. |
| `min-w-field` | 160px | Minimum width for an inline filter/select so it doesn't collapse below a usable size. |

## Text expansion

The UI ships in English and European Portuguese (`pt-PT`), and Portuguese runs
**20–30% longer** than English for the same message. Two limits above do not
move to make room: the modal is fixed at **480px** (`max-w-modal`) and type
never goes **below 13px**. A longer string is absorbed by layout, never by
shrinking:

- Labels, helper text and messages wrap onto another line. They are not
  truncated, ellipsised, or set in a smaller one-off size.
- Fields placed side by side in a modal must fit the longest label in either
  language, or stack.
- A label that would crowd a figure moves onto its own line above it; figures
  stay tabular and aligned.
- No new token is added to make a string fit.

Check a screen in `pt-PT` before calling it done — English is the short case.

## Elevation & motion

Dark UIs separate layers with **surface lightness, not shadow**. Use `--surface`
→ `--surface-raised` to raise something; keep shadows to a single soft
`0 1px 2px rgba(0,0,0,.4)` on floating elements (dropdowns, modals) only.

Transitions: 150ms `ease-out` on color and background. No transforms on hover,
no entrance animations. Respect `prefers-reduced-motion`.

## Components

- **Button** — Primary: `--accent` fill, `--bg` text, 8px radius, 10/16 padding.
  Secondary: transparent with `--border`, `--text` label. Ghost: text only,
  `--text-muted`. Destructive: `--danger`. Every button has a visible
  `:focus-visible` ring in `--accent`, 2px, 2px offset.
- **Card** — `--surface`, 1px `--border`, 12px radius, 24px padding.
- **Input** — `--surface-raised` fill, 1px `--border`, 8px radius; border becomes
  `--accent` on focus. Label above, 13px `--text-muted`. Errors: `--danger`
  border with the message below in 13px, never a bare red glow.
- **Badge** — pill, status color at 15% opacity as fill, full-strength text.
- **Table** — no vertical rules; 1px `--border` between rows; header 13px
  `--text-muted` uppercase with `0.04em` tracking; numeric columns right-aligned
  and tabular.
- **Empty state** — a real sentence saying what to do next plus the primary
  action. Never just "No data".

## Accessibility

Body text on `--bg` and `--surface` must clear **4.5:1**; the token pairs above
do. Interactive targets are at least 40px tall. Focus is always visible — never
`outline: none` without a replacement ring.

## Stack

Tailwind CSS, with these tokens mapped in `tailwind.config` under
`theme.extend.colors` so classes read `bg-surface`, `text-muted`, `bg-accent`.
Do not use Tailwind's stock palette (`bg-gray-800`, `text-blue-500`) — it is
cool-toned and will fight this system.
