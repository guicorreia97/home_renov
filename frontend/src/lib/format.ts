import type { Locale } from '../i18n/locale'
import type { Money, SignedMoney } from '../types'

/**
 * Display helpers for values the API sends as strings.
 *
 * These format; they never calculate. Money arrives as an exact decimal string
 * and is only ever converted to a number at the very last step, for display —
 * so a rounding artefact cannot flow back into stored data or a later total.
 *
 * Every function here takes an explicit `locale` rather than letting `Intl`
 * follow the browser: once the user can choose a display language, "the
 * browser's locale" and "the chosen language" are two different things.
 * Components never call these directly — `useFormat()` binds the active
 * locale in, so no call site can pass the wrong one (or forget one). See
 * design.md, decision 6.
 */

/**
 * Render an amount for display: `"1250.5"` → `€1,250.50` (`en`) or
 * `1250,50 €` (`pt-PT`).
 *
 * `currency` comes from `BudgetSummary.currency` rather than being hardcoded —
 * choosing a display language never changes what the renovation is priced in.
 */
export function formatMoney(amount: Money | SignedMoney, currency: string, locale: Locale): string {
  const value = Number(amount)
  if (!Number.isFinite(value)) return String(amount)

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

/**
 * `"2026-09-01"` → a locale-appropriate short date.
 *
 * Parsed as UTC-noon so a timezone west of UTC cannot shift it to the day
 * before — true up to and including UTC-12, further west than any real
 * timezone goes.
 */
export function formatDate(isoDate: string, locale: Locale): string {
  const parsed = new Date(`${isoDate}T12:00:00Z`)
  if (Number.isNaN(parsed.getTime())) return isoDate

  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(parsed)
}

/**
 * A 0–100 ratio for display: `62.5` → `62.5%` (`en`) or `62,5%` (`pt-PT`).
 *
 * `value` is divided by 100 because `Intl`'s `percent` style expects a
 * fraction; the formatted string carries its own locale-correct `%` placement
 * and decimal separator, so the surrounding message never builds either by
 * hand (see `RemainingBudgetConclusion.tsx`).
 */
export function formatPercent(value: number, locale: Locale): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100)
}
