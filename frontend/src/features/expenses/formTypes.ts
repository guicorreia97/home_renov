import type { MessageDescriptor, MessageKey } from '../../i18n'
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

/**
 * A descriptor per invalid field, not a string — see the rule "never store a
 * translated string in state": a language switch mid-edit must re-render an
 * existing error in the new language, which only works if the error is still
 * a `{ key, params? }` at that point, translated at render.
 */
export type ExpenseFormErrors = Partial<Record<keyof ExpenseFormValues, MessageDescriptor>>

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

export type BudgetFormErrors = Partial<Record<keyof BudgetFormValues, MessageDescriptor>>

/**
 * The `budget.field.*` catalogue key for each target — shared by the settings
 * modal (as its `TextField` label) and by `validateBudgetForm` (as the
 * `{field}` interpolated into `budget.error.notANumber`/`budget.error.tooLarge`),
 * so the two can never say something different about the same field.
 */
export const BUDGET_FIELD_KEYS: Record<keyof BudgetFormValues, MessageKey> = {
  planned_budget: 'budget.field.plannedBudget',
  purchase_price: 'budget.field.purchasePrice',
  target_sale_price: 'budget.field.targetSalePrice',
}
