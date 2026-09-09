import type { Money, SignedMoney } from '../types'

/**
 * Display helpers for values the API sends as strings.
 *
 * These format; they never calculate. Money arrives as an exact decimal string
 * and is only ever converted to a number at the very last step, for display —
 * so a rounding artefact cannot flow back into stored data or a later total.
 */

/**
 * Render an amount for display: `"1250.5"` → `€1,250.50`.
 *
 * `currency` comes from `BudgetSummary.currency` rather than being hardcoded.
 */
export function formatMoney(amount: Money | SignedMoney, currency: string): string {
  const value = Number(amount)
  if (!Number.isFinite(value)) return String(amount)

  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

/** `"2026-09-01"` → a locale-appropriate short date. */
export function formatDate(isoDate: string): string {
  // Parsed as UTC-noon so a timezone west of UTC cannot shift it to the day before.
  const parsed = new Date(`${isoDate}T12:00:00Z`)
  if (Number.isNaN(parsed.getTime())) return isoDate

  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(parsed)
}

/** `materials` → `Materials`; `furniture_and_fixtures` → `Furniture and fixtures`. */
export function formatEnumLabel(value: string): string {
  const spaced = value.replace(/_/g, ' ')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}
