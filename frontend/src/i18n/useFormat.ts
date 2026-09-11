import { formatDate, formatMoney, formatPercent } from '../lib/format'
import type { Money, SignedMoney } from '../types'
import { useTranslation } from './useTranslation'

export interface UseFormatResult {
  formatMoney: (amount: Money | SignedMoney, currency: string) => string
  formatDate: (isoDate: string) => string
  formatPercent: (value: number) => string
}

/**
 * Binds the active locale into `lib/format.ts`'s pure formatters, so no call
 * site passes a locale by hand and none can forget one — see design.md,
 * decision 6.
 */
export function useFormat(): UseFormatResult {
  const { locale } = useTranslation()

  return {
    formatMoney: (amount, currency) => formatMoney(amount, currency, locale),
    formatDate: (isoDate) => formatDate(isoDate, locale),
    formatPercent: (value) => formatPercent(value, locale),
  }
}
