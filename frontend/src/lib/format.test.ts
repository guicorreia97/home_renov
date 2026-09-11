import { formatDate, formatMoney, formatPercent } from './format'

describe('formatMoney', () => {
  it('renders a leading symbol and a point decimal separator under en', () => {
    expect(formatMoney('1250.5', 'EUR', 'en')).toBe('€1,250.50')
  })

  it('renders a comma decimal separator and a trailing symbol under pt-PT', () => {
    // Intl inserts a non-breaking space (U+00A0) before the trailing symbol.
    expect(formatMoney('1250.5', 'EUR', 'pt-PT')).toBe('1250,50 €')
  })

  it('falls back to the raw string for a non-numeric amount, in either locale', () => {
    expect(formatMoney('not-a-number', 'EUR', 'en')).toBe('not-a-number')
    expect(formatMoney('not-a-number', 'EUR', 'pt-PT')).toBe('not-a-number')
  })
})

describe('formatDate', () => {
  it('renders the day, month and year in each locale convention', () => {
    expect(formatDate('2026-09-01', 'en')).toBe('Sep 1, 2026')
    expect(formatDate('2026-09-01', 'pt-PT')).toBe('1/09/2026')
  })

  it('never shifts to the day before, even at the westernmost real timezone', () => {
    vi.stubEnv('TZ', 'Etc/GMT+12') // UTC-12 — as far west as any real timezone goes.

    try {
      expect(formatDate('2026-09-01', 'en')).toBe('Sep 1, 2026')
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('falls back to the raw string for an unparseable date', () => {
    expect(formatDate('not-a-date', 'en')).toBe('not-a-date')
  })
})

describe('formatPercent', () => {
  it('renders a point decimal separator under en', () => {
    expect(formatPercent(62.5, 'en')).toBe('62.5%')
  })

  it('renders a comma decimal separator under pt-PT', () => {
    expect(formatPercent(62.5, 'pt-PT')).toBe('62,5%')
  })

  it('always shows exactly one decimal place', () => {
    expect(formatPercent(4, 'en')).toBe('4.0%')
    expect(formatPercent(4.22, 'en')).toBe('4.2%')
  })
})
