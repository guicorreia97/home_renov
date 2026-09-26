import { useFormat, useTranslation } from '../../i18n'
import type { CategoryTotal, Expense, ExpenseStatus } from '../../types'

export interface BudgetCategoryGroupProps {
  group: CategoryTotal
  /** Every expense in this category, of any status — already filtered by the caller. */
  expenses: Expense[]
  currency: string
}

/** The three status columns, in table order, each backed by its own `CategoryTotal` field. */
const STATUS_COLUMNS: ExpenseStatus[] = ['planned', 'pending', 'paid']

/**
 * One category's header row — its three subtotals and its share, read
 * straight off `CategoryTotal`, no arithmetic — followed by one row per
 * expense in that category. Each expense's own `amount` (never recomputed)
 * lands in exactly one of the three status columns, matching its own
 * `status` (frontend-expenses spec, "The works budget view groups expenses
 * by category" — "An expense carries one amount and one status, so it
 * appears in exactly one of the three").
 */
export function BudgetCategoryGroup({ group, expenses, currency }: BudgetCategoryGroupProps) {
  const { t } = useTranslation()
  const { formatMoney, formatDate, formatPercent } = useFormat()

  const subtotals: Record<ExpenseStatus, string> = {
    planned: group.planned,
    pending: group.pending,
    paid: group.paid,
  }

  return (
    <>
      <tr className="border-b border-border bg-surface-raised">
        <th scope="row" colSpan={2} className="py-2 pr-4 text-left text-body font-semibold text-text">
          {t(`expense.category.${group.category}`)}
          <span className="ml-2 text-micro font-mono text-muted uppercase">{formatPercent(group.share)}</span>
        </th>
        {STATUS_COLUMNS.map((status) => (
          <td key={status} className="py-2 text-right text-figure font-mono tabular text-text">
            {formatMoney(subtotals[status], currency)}
          </td>
        ))}
      </tr>
      {expenses.map((expense) => (
        <tr key={expense.id} className="border-b border-border">
          <td className="py-2 pr-4 text-body text-text">{expense.description}</td>
          <td className="py-2 pr-4 text-figure font-mono text-muted">{formatDate(expense.incurred_on)}</td>
          {STATUS_COLUMNS.map((status) => (
            <td key={status} className="py-2 text-right text-figure font-mono tabular text-text">
              {expense.status === status ? (
                formatMoney(expense.amount, currency)
              ) : (
                <span className="text-faint">—</span>
              )}
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}
