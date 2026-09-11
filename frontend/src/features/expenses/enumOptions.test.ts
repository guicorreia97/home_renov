import { translate } from '../../i18n/translate'
import type { TranslateFn } from '../../i18n'
import { EXPENSE_CATEGORIES, EXPENSE_STATUSES, PAYMENT_METHODS } from '../../types'
import { categoryOptions, paymentMethodOptions, statusOptions } from './enumOptions'

const tEn: TranslateFn = (key, params) => translate('en', key, params)
const tPt: TranslateFn = (key, params) => translate('pt-PT', key, params)

describe('enumOptions', () => {
  it('builds one option per backend enum member', () => {
    expect(categoryOptions(tEn)).toHaveLength(EXPENSE_CATEGORIES.length)
    expect(paymentMethodOptions(tEn)).toHaveLength(PAYMENT_METHODS.length)
    expect(statusOptions(tEn)).toHaveLength(EXPENSE_STATUSES.length)
  })

  it('keeps the machine value as `value`, in both languages', () => {
    for (const t of [tEn, tPt]) {
      expect(categoryOptions(t)).toContainEqual(
        expect.objectContaining({ value: 'furniture_and_fixtures' }),
      )
      expect(paymentMethodOptions(t)).toContainEqual(expect.objectContaining({ value: 'bank_transfer' }))
      expect(statusOptions(t)).toContainEqual(expect.objectContaining({ value: 'paid' }))
    }
  })

  it('looks up the label from the active catalogue, not from the value’s own spelling', () => {
    expect(categoryOptions(tEn)).toContainEqual({
      value: 'furniture_and_fixtures',
      label: tEn('expense.category.furniture_and_fixtures'),
    })
    expect(paymentMethodOptions(tEn)).toContainEqual({
      value: 'bank_transfer',
      label: tEn('expense.paymentMethod.bank_transfer'),
    })
    expect(statusOptions(tEn)).toContainEqual({ value: 'paid', label: tEn('expense.status.paid') })
  })

  it('translates every label to a different Portuguese string', () => {
    const englishLabels = new Set(categoryOptions(tEn).map((option) => option.label))
    const portugueseLabels = categoryOptions(tPt).map((option) => option.label)

    for (const label of portugueseLabels) {
      expect(englishLabels.has(label)).toBe(false)
    }
  })
})
