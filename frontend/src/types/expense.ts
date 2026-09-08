import type { IsoDate, IsoDateTime, Money } from './money'

/**
 * Mirrors backend/app/src/models/expense.py. These unions are the exact
 * StrEnum members the API accepts — a typo becomes a compile error rather than
 * a 422 discovered in the browser.
 */

export const EXPENSE_CATEGORIES = [
  'materials',
  'labour',
  'appliances',
  'furniture_and_fixtures',
  'tools_and_equipment',
  'permits_and_fees',
  'design_and_professional',
  'transport_and_delivery',
  'waste_disposal',
  'utilities',
  'other',
] as const
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]

export const PAYMENT_METHODS = [
  'cash',
  'bank_transfer',
  'debit_card',
  'credit_card',
  'direct_debit',
  'financing',
  'other',
] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

/**
 * Where the expense sits in the cash-flow cycle. `planned` is an estimate,
 * `pending` is owed but unpaid, `paid` has left the account. Committed spend is
 * pending + paid.
 */
export const EXPENSE_STATUSES = ['planned', 'pending', 'paid'] as const
export type ExpenseStatus = (typeof EXPENSE_STATUSES)[number]

/** A stored expense, as returned by the API. */
export interface Expense {
  id: string
  description: string
  amount: Money
  category: ExpenseCategory
  payment_method: PaymentMethod
  payee: string
  incurred_on: IsoDate
  status: ExpenseStatus
  room: string | null
  invoice_reference: string | null
  notes: string | null
  created_at: IsoDateTime
  updated_at: IsoDateTime
}

/**
 * Fields accepted when creating an expense. The backend sets `status` to `paid`
 * when it is omitted, so it is optional here too.
 */
export interface ExpenseCreate {
  description: string
  amount: Money
  category: ExpenseCategory
  payment_method: PaymentMethod
  payee: string
  incurred_on: IsoDate
  status?: ExpenseStatus
  room?: string | null
  invoice_reference?: string | null
  notes?: string | null
}

/**
 * Partial update. Every field is optional, but the backend rejects a wholly
 * empty body with 400 — see EmptyUpdateError.
 */
export type ExpenseUpdate = Partial<ExpenseCreate>
