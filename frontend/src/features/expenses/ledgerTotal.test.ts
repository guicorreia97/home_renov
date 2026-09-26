import { aSummary } from '../../test/fixtures'
import type { CategoryTotal } from '../../types'
import { ledgerTotal } from './ledgerTotal'

// Every figure below is distinct and none is the sum of any others, so a
// passing assertion proves which summary field was read — not that something
// happened to add up.
const labour: CategoryTotal = {
  category: 'labour',
  amount: '300.00',
  planned: '41.00',
  pending: '120.00',
  paid: '180.00',
  share: 25,
}
const materials: CategoryTotal = {
  category: 'materials',
  amount: '900.00',
  planned: '17.00',
  pending: '0.00',
  paid: '900.00',
  share: 75,
}
const summary = aSummary({
  total_committed: '4242.00',
  total_paid: '3131.00',
  total_planned: '2020.00',
  by_category: [materials, labour],
})

describe('ledgerTotal', () => {
  it('reads total_committed verbatim with no filter at all', () => {
    expect(ledgerTotal(summary, 'all', 'all')).toEqual({
      amount: '4242.00',
      label: 'budget.summary.totalCommitted',
    })
  })

  it('reads the store-wide paid and planned totals under a status filter, labelled to match', () => {
    expect(ledgerTotal(summary, 'all', 'paid')).toEqual({ amount: '3131.00', label: 'budget.summary.totalPaid' })
    expect(ledgerTotal(summary, 'all', 'planned')).toEqual({
      amount: '2020.00',
      label: 'budget.summary.totalPlanned',
    })
  })

  it('shows no total for every category filtered to pending — the summary has no such field', () => {
    expect(ledgerTotal(summary, 'all', 'pending')).toBeNull()
  })

  it('reads the selected category’s own committed amount, not a sum of the others', () => {
    expect(ledgerTotal(summary, 'labour', 'all')).toEqual({
      amount: '300.00',
      label: 'budget.summary.totalCommitted',
    })
  })

  it('reads the selected category’s figure for the selected status', () => {
    expect(ledgerTotal(summary, 'labour', 'planned')).toEqual({
      amount: '41.00',
      label: 'budget.summary.totalPlanned',
    })
    expect(ledgerTotal(summary, 'labour', 'pending')).toEqual({
      amount: '120.00',
      label: 'budget.summary.totalPending',
    })
    expect(ledgerTotal(summary, 'labour', 'paid')).toEqual({ amount: '180.00', label: 'budget.summary.totalPaid' })
  })

  it('is null for a category the summary has no row for, never a fabricated zero', () => {
    expect(ledgerTotal(aSummary({ by_category: [] }), 'materials', 'all')).toBeNull()
  })

  it('is null before the summary has loaded', () => {
    expect(ledgerTotal(null, 'all', 'all')).toBeNull()
  })
})
