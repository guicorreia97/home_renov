/**
 * Design tokens — the single Tailwind-side source of truth.
 *
 * Every value here comes from docs/design-system-guide.md. That document is
 * normative: if a screen needs something this file does not have, add it to the
 * guide first, then mirror it here. Never hardcode a hex or an off-scale spacing
 * value in a component.
 *
 * Colors resolve through CSS custom properties defined in src/index.css so the
 * tokens stay inspectable in devtools and usable from raw CSS, while Tailwind
 * classes (bg-surface, text-muted, bg-accent) remain the normal way to reach them.
 *
 * `spacing` and `borderRadius` REPLACE Tailwind's defaults rather than extending
 * them. That is deliberate: the guide allows exactly 4/8/12/16/24/32/48/64, and
 * overriding makes p-5 or rounded-md a build-visible mistake instead of a silent
 * drift off the 8pt grid.
 */

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    // Stock Tailwind's palette is cool-toned and fights the warm dark ground,
    // so it is dropped entirely — these tokens are the whole palette.
    colors: {
      transparent: 'transparent',
      current: 'currentColor',

      bg: 'var(--bg)',
      surface: 'var(--surface)',
      'surface-raised': 'var(--surface-raised)',
      border: 'var(--border)',

      text: 'var(--text)',
      muted: 'var(--text-muted)',
      faint: 'var(--text-faint)',

      accent: 'var(--accent)',
      'accent-hover': 'var(--accent-hover)',
      'accent-soft': 'var(--accent-soft)',

      success: 'var(--success)',
      warning: 'var(--warning)',
      danger: 'var(--danger)',
      'success-soft': 'var(--success-soft)',
      'warning-soft': 'var(--warning-soft)',
      'danger-soft': 'var(--danger-soft)',

      overlay: 'var(--overlay)',
    },

    // The 8pt grid, verbatim. 0 and 1px are kept for hairlines and resets.
    spacing: {
      0: '0px',
      px: '1px',
      1: '4px',
      2: '8px',
      3: '12px',
      4: '16px',
      6: '24px',
      8: '32px',
      12: '48px',
      16: '64px',
    },

    borderRadius: {
      none: '0px',
      DEFAULT: '7px',
      input: '7px',
      button: '7px',
      card: '10px',
      pill: '999px',
      full: '999px',
    },

    fontFamily: {
      sans: ['Space Grotesk', 'system-ui', 'sans-serif'],
      // Every figure is mono so columns scan: amounts, percentages, table
      // dates, and the uppercase micro-labels above them.
      mono: ['IBM Plex Mono', 'ui-monospace', 'monospace'],
    },

    // Each role from the guide's type scale carries its own size, line-height,
    // weight and tracking, so `text-page-title` is the entire declaration and
    // there is no way to apply the size while forgetting the tracking.
    fontSize: {
      'page-title': ['22px', { lineHeight: '1.2', fontWeight: '600', letterSpacing: '-0.02em' }],
      section: ['16px', { lineHeight: '1.3', fontWeight: '600', letterSpacing: '-0.01em' }],
      'card-title': ['14px', { lineHeight: '1.4', fontWeight: '600' }],
      body: ['13px', { lineHeight: '1.5', fontWeight: '400' }],
      label: ['12.5px', { lineHeight: '1.4', fontWeight: '500' }],
      numeric: ['22px', { lineHeight: '1.2', fontWeight: '600' }],
      // A figure in a table cell or a KPI value. Mono, tabular, 13px.
      figure: ['13px', { lineHeight: '1.4', fontWeight: '500' }],
      // The one place type goes below 12.5px, and only here: uppercase,
      // letterspaced mono micro-labels — column heads and KPI captions, never
      // prose. See "The 11px floor" in docs/design-system-guide.md.
      micro: ['11px', { lineHeight: '1.3', fontWeight: '500', letterSpacing: '0.08em' }],
      // Sentence-cased table headers, and therefore held to the 12.5px prose
      // floor — NOT the 11px micro-label relaxation, which is only for
      // uppercase letterspaced mono. The ledger's headers adopt `micro` when
      // feat/flip-desk-panels restyles them into uppercase mono column heads.
      'table-head': ['12.5px', { lineHeight: '1.4', fontWeight: '500', letterSpacing: '0.04em' }],
    },

    extend: {
      maxWidth: {
        content: '1200px',
        modal: '480px',
      },
      maxHeight: {
        modal: '85vh',
      },
      minWidth: {
        field: '160px',
      },
      // Fixed app-shell sidebar width — not a min/max, an exact structural
      // constant, so it lives under `width` rather than `minWidth`.
      width: {
        sidebar: '258px',
      },
      // Dark UIs separate layers with surface lightness, not shadow. The single
      // allowed shadow is reserved for genuinely floating elements.
      boxShadow: {
        floating: '0 1px 2px rgba(0, 0, 0, .4)',
      },
      transitionDuration: {
        DEFAULT: '150ms',
      },
      transitionTimingFunction: {
        DEFAULT: 'ease-out',
      },
      // Minimum interactive target height (accessibility section of the guide).
      minHeight: {
        control: '40px',
      },
    },
  },
  plugins: [],
}
