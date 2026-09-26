import type { MessageKey } from '../../i18n'
import type { BudgetSummary, ExpenseCategory, ExpenseStatus, Money } from '../../types'

/** A closing total and the label that says what it counts. */
export interface LedgerTotal {
  amount: Money
  label: MessageKey
}

const STATUS_LABEL: Record<ExpenseStatus, MessageKey> = {
  planned: 'budget.summary.totalPlanned',
  pending: 'budget.summary.totalPending',
  paid: 'budget.summary.totalPaid',
}

/**
 * The ledger's closing total for the current filters — a lookup into
 * `GET /budget/summary`'s already-computed fields, never a sum of whichever
 * rows the filters currently leave visible.
 *
 * With no status filter it is committed spend (`total_committed`, or the
 * category's `amount`). With a status filter it is that status's own figure,
 * labelled to match, so the total never claims to count rows that are hidden
 * or omit rows that are shown. The one combination the summary has no field
 * for — every category, pending only — returns `null` rather than deriving it
 * as committed minus paid.
 *
 * This function only ever indexes into `summary`; it never adds, subtracts or
 * otherwise touches a `Money` value (frontend-expenses spec, "Money never
 * becomes a JavaScript number" — "A subtotal is never summed in the browser").
 */
export function ledgerTotal(
  summary: BudgetSummary | null,
  category: ExpenseCategory | 'all',
  status: ExpenseStatus | 'all',
): LedgerTotal | null {
  if (!summary) return null

  if (category === 'all') {
    if (status === 'all') return { amount: summary.total_committed, label: 'budget.summary.totalCommitted' }
    if (status === 'paid') return { amount: summary.total_paid, label: STATUS_LABEL.paid }
    if (status === 'planned') return { amount: summary.total_planned, label: STATUS_LABEL.planned }
    return null
  }

  const row = summary.by_category.find((candidate) => candidate.category === category)
  if (!row) return null
  if (status === 'all') return { amount: row.amount, label: 'budget.summary.totalCommitted' }
  return { amount: row[status], label: STATUS_LABEL[status] }
}
