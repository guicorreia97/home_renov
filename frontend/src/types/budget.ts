import type { ExpenseCategory } from './expense'
import type { IsoDateTime, Money, SignedMoney } from './money'

/** Mirrors backend/app/src/models/budget.py. */

/**
 * The renovation's financial targets. Single-user, single-property: exactly one
 * budget exists, and the backend creates it empty on first read — there is no
 * POST and no "budget not found" case to handle.
 */
export interface Budget {
  target_sale_price: Money | null
  purchase_price: Money | null
  planned_budget: Money | null
  updated_at: IsoDateTime
}

/** Partial update of the targets. */
export interface BudgetUpdate {
  target_sale_price?: Money | null
  purchase_price?: Money | null
  planned_budget?: Money | null
}

/** Committed spend for one category. */
export interface CategoryTotal {
  category: ExpenseCategory
  amount: Money
}

/**
 * Targets and actuals side by side — the answer to "where do we stand?".
 *
 * Every total here is computed server-side against exact decimals. Prefer this
 * over deriving the same numbers in the client: doing so would mean float maths
 * on money, and the two answers would drift apart.
 */
export interface BudgetSummary {
  currency: string

  target_sale_price: Money | null
  purchase_price: Money | null
  planned_budget: Money | null

  total_paid: Money
  /** Paid plus invoiced-but-unpaid. */
  total_committed: Money
  /** Estimates not yet committed. */
  total_planned: Money
  /** Committed plus planned. */
  total_forecast: Money

  /** planned_budget minus total_forecast; null when no budget is set. */
  remaining_budget: SignedMoney | null
  /** A genuine number, not a Money string — it is a ratio, not an amount. */
  budget_used_percent: number | null
  over_budget: boolean

  /** target_sale_price minus purchase_price minus total_forecast. */
  projected_profit: SignedMoney | null

  expense_count: number
  by_category: CategoryTotal[]
}
