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

/**
 * Spend for one category, split by status.
 *
 * `amount` is committed spend — paid plus pending, excluding planned — and keeps
 * that meaning now the breakdown sits beside it. A category holding only planned
 * spend appears with `amount` of `"0.00"` rather than being left out, so these
 * rows reconcile with the grand totals above them.
 */
export interface CategoryTotal {
  category: ExpenseCategory
  /** Committed spend: paid plus pending, excluding planned. */
  amount: Money
  /** Estimates not yet committed. */
  planned: Money
  /** Invoiced but not yet paid. */
  pending: Money
  paid: Money
  /** Percentage of all committed spend — a number, not a Money string. */
  share: number
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
  /** projected_profit over target_sale_price. A ratio, so a number. */
  margin_percent: number | null
  /** projected_profit over purchase_price plus total_forecast. A ratio. */
  return_on_cost_percent: number | null
  /**
   * purchase_price plus total_forecast — the sale price at which profit is zero.
   * Reported even with no target sale price; null without a purchase price.
   */
  break_even_sale_price: Money | null

  expense_count: number
  by_category: CategoryTotal[]
}
