import { anExpense, aBudget } from '../../test/fixtures'
import type { BudgetFormValues, ExpenseFormValues } from './formTypes'
import {
  budgetFormValuesFromBudget,
  formValuesFromExpense,
  hasBudgetErrors,
  hasErrors,
  toBudgetPayload,
  toCreatePayload,
  toUpdatePayload,
  validateBudgetForm,
  validateExpenseForm,
} from './validation'

function expenseValues(overrides: Partial<ExpenseFormValues> = {}): ExpenseFormValues {
  return {
    description: 'Kitchen worktop',
    amount: '1234.50',
    category: 'materials',
    payment_method: 'bank_transfer',
    payee: 'Stone & Co',
    incurred_on: '2026-09-01',
    status: 'paid',
    room: '',
    invoice_reference: '',
    notes: '',
    ...overrides,
  }
}

function budgetValues(overrides: Partial<BudgetFormValues> = {}): BudgetFormValues {
  return { planned_budget: '', purchase_price: '', target_sale_price: '', ...overrides }
}

describe('validateExpenseForm', () => {
  it('accepts a well-formed expense', () => {
    expect(hasErrors(validateExpenseForm(expenseValues()))).toBe(false)
  })

  it('rejects an empty description', () => {
    expect(validateExpenseForm(expenseValues({ description: '  ' })).description).toBeDefined()
  })

  it('rejects a zero amount, because an expense must be positive', () => {
    for (const amount of ['0', '0.0', '0.00']) {
      expect(validateExpenseForm(expenseValues({ amount })).amount).toBeDefined()
    }
  })

  it('rejects a negative amount, a third decimal, and non-numeric text', () => {
    for (const amount of ['-5', '12.345', 'ten', '1,50', '']) {
      expect(validateExpenseForm(expenseValues({ amount })).amount).toBeDefined()
    }
  })

  it('accepts an amount with no decimals and one with exactly two', () => {
    expect(validateExpenseForm(expenseValues({ amount: '250' })).amount).toBeUndefined()
    expect(validateExpenseForm(expenseValues({ amount: '250.5' })).amount).toBeUndefined()
    expect(validateExpenseForm(expenseValues({ amount: '250.50' })).amount).toBeUndefined()
  })

  it('requires a date', () => {
    expect(validateExpenseForm(expenseValues({ incurred_on: '' })).incurred_on).toBeDefined()
  })
})

describe('toCreatePayload', () => {
  it('keeps the amount a string, digit for digit', () => {
    const payload = toCreatePayload(expenseValues({ amount: '1234.50' }))

    expect(payload.amount).toBe('1234.50')
    expect(typeof payload.amount).toBe('string')
  })

  it('turns empty optional fields into null, not empty strings', () => {
    const payload = toCreatePayload(expenseValues({ room: '  ', notes: '' }))

    expect(payload.room).toBeNull()
    expect(payload.notes).toBeNull()
  })
})

describe('toUpdatePayload', () => {
  it('sends only the fields that changed', () => {
    const original = anExpense()

    const update = toUpdatePayload(formValuesFromExpense(original), original)

    expect(update).toEqual({})
  })

  it('sends the changed field as a string', () => {
    const original = anExpense({ amount: '1234.50' })
    const values = formValuesFromExpense(original)

    const update = toUpdatePayload({ ...values, amount: '99.99' }, original)

    expect(update).toEqual({ amount: '99.99' })
  })
})

describe('money round trip', () => {
  it('preserves 1234.50 through the form and back without touching a float', () => {
    const original = anExpense({ amount: '1234.50' })

    const values = formValuesFromExpense(original)
    const payload = toCreatePayload(values)

    expect(values.amount).toBe('1234.50')
    expect(payload.amount).toBe('1234.50')
    // The trailing zero is the point: Number('1234.50') would render as 1234.5,
    // and "€1,234.5" is not a price anyone has ever written down.
    expect(payload.amount).not.toBe('1234.5')
    expect(JSON.parse(JSON.stringify(payload)).amount).toBe('1234.50')
  })
})

describe('validateBudgetForm', () => {
  it('accepts an entirely empty form — every target is optional', () => {
    expect(hasBudgetErrors(validateBudgetForm(budgetValues()))).toBe(false)
  })

  it('accepts zero, which is a real budget target unlike a zero expense', () => {
    expect(validateBudgetForm(budgetValues({ planned_budget: '0' })).planned_budget).toBeUndefined()
  })

  it('rejects a negative amount', () => {
    expect(validateBudgetForm(budgetValues({ planned_budget: '-1' })).planned_budget).toBeDefined()
  })

  it('rejects more than two decimals', () => {
    expect(
      validateBudgetForm(budgetValues({ purchase_price: '1000.123' })).purchase_price,
    ).toBeDefined()
  })

  it('rejects an amount beyond the backend max_digits cap', () => {
    expect(
      validateBudgetForm(budgetValues({ target_sale_price: '99999999999.99' })).target_sale_price,
    ).toBeDefined()
    expect(
      validateBudgetForm(budgetValues({ target_sale_price: '9999999999.99' })).target_sale_price,
    ).toBeUndefined()
  })

  it('reports each bad field separately, naming it', () => {
    const errors = validateBudgetForm(
      budgetValues({ planned_budget: 'lots', purchase_price: '180000' }),
    )

    expect(errors.planned_budget).toContain('Planned budget')
    expect(errors.purchase_price).toBeUndefined()
  })
})

describe('toBudgetPayload', () => {
  it('sends an emptied field as null so the target is cleared, never as 0', () => {
    const payload = toBudgetPayload(budgetValues({ planned_budget: '  ' }))

    expect(payload.planned_budget).toBeNull()
    expect(payload.planned_budget).not.toBe('0')
  })

  it('sends every field, so clearing one actually clears it server-side', () => {
    const payload = toBudgetPayload(budgetValues({ planned_budget: '50000' }))

    expect(payload).toEqual({
      planned_budget: '50000',
      purchase_price: null,
      target_sale_price: null,
    })
  })

  it('keeps amounts as strings', () => {
    const payload = toBudgetPayload(budgetValues({ planned_budget: '50000.00' }))

    expect(payload.planned_budget).toBe('50000.00')
  })
})

describe('budgetFormValuesFromBudget', () => {
  it('renders an unset budget as empty fields, not "null"', () => {
    expect(budgetFormValuesFromBudget(null)).toEqual({
      planned_budget: '',
      purchase_price: '',
      target_sale_price: '',
    })
  })

  it('round-trips a saved budget back into the form unchanged', () => {
    const budget = aBudget({ planned_budget: '50000.00' })

    expect(budgetFormValuesFromBudget(budget).planned_budget).toBe('50000.00')
    expect(toBudgetPayload(budgetFormValuesFromBudget(budget)).planned_budget).toBe('50000.00')
  })
})
