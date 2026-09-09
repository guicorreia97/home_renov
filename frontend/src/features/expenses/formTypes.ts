import type { ExpenseCategory, ExpenseStatus, PaymentMethod } from '../../types'

/** All form fields as strings — the natural shape of controlled inputs. */
export interface ExpenseFormValues {
  description: string
  amount: string
  category: ExpenseCategory
  payment_method: PaymentMethod
  payee: string
  incurred_on: string
  status: ExpenseStatus
  room: string
  invoice_reference: string
  notes: string
}

export type ExpenseFormErrors = Partial<Record<keyof ExpenseFormValues, string>>

/** `Filters.status`/`Filters.category` of `'all'` means "no filter applied". */
export interface ExpenseFilters {
  status: ExpenseStatus | 'all'
  category: ExpenseCategory | 'all'
}

/**
 * The budget form. All three targets are optional — an empty field means "not
 * set" (`null` on the wire), which is not the same as zero.
 */
export interface BudgetFormValues {
  planned_budget: string
  purchase_price: string
  target_sale_price: string
}

export type BudgetFormErrors = Partial<Record<keyof BudgetFormValues, string>>
