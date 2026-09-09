import { Button } from '../../components/Button'
import type { Expense } from '../../types'
import { ExpenseRow } from './ExpenseRow'

export interface ExpenseTableProps {
  /** All fetched expenses, unfiltered — `null` while the initial load is in flight. */
  allExpenses: Expense[] | null
  /** `allExpenses` after filters and sorting — what actually renders. */
  visible: Expense[]
  currency: string
  error: string | null
  onEdit: (expense: Expense) => void
  onDelete: (expense: Expense) => void
  onAddFirst: () => void
  onRetry: () => void
}

const HEADERS = ['Description', 'Category', 'Payee', 'Incurred on', 'Status', 'Amount', '']

/** The expense list: loading, empty, error and populated states. */
export function ExpenseTable({
  allExpenses,
  visible,
  currency,
  error,
  onEdit,
  onDelete,
  onAddFirst,
  onRetry,
}: ExpenseTableProps) {
  if (error) {
    return (
      <div className="rounded-card border border-border bg-surface p-6">
        <p className="text-body text-danger">{error}</p>
        <Button variant="secondary" onClick={onRetry} className="mt-4">
          Try again
        </Button>
      </div>
    )
  }

  if (allExpenses === null) {
    return <p className="text-body text-muted">Loading expenses…</p>
  }

  if (allExpenses.length === 0) {
    return (
      <div className="rounded-card border border-border bg-surface p-6">
        <p className="text-body text-text">
          No expenses recorded yet. Add the first one to start tracking spend.
        </p>
        <Button variant="secondary" onClick={onAddFirst} className="mt-4">
          Add expense
        </Button>
      </div>
    )
  }

  if (visible.length === 0) {
    return (
      <p className="text-body text-muted">
        No expenses match the current filters. Try widening the status or category filter.
      </p>
    )
  }

  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="border-b border-border">
          {HEADERS.map((header, index) => (
            <th
              key={header || index}
              className={`pb-2 text-table-head text-muted ${index === 5 ? 'text-right' : 'text-left'}`}
            >
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {visible.map((expense) => (
          <ExpenseRow
            key={expense.id}
            expense={expense}
            currency={currency}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </tbody>
    </table>
  )
}
