import { Badge, type BadgeTone } from '../../components/Badge'
import { Button } from '../../components/Button'
import { formatDate, formatEnumLabel, formatMoney } from '../../lib/format'
import type { Expense, ExpenseStatus } from '../../types'

export interface ExpenseRowProps {
  expense: Expense
  currency: string
  onEdit: (expense: Expense) => void
  onDelete: (expense: Expense) => void
}

const statusTone: Record<ExpenseStatus, BadgeTone> = {
  paid: 'success',
  pending: 'warning',
  planned: 'neutral',
}

/** One row of the expense table. */
export function ExpenseRow({ expense, currency, onEdit, onDelete }: ExpenseRowProps) {
  return (
    <tr className="border-b border-border">
      <td className="py-3 pr-4 text-body text-text">
        {expense.description}
        {expense.room && <span className="ml-2 text-label text-muted">{expense.room}</span>}
      </td>
      <td className="py-3 pr-4 text-body text-muted">{formatEnumLabel(expense.category)}</td>
      <td className="py-3 pr-4 text-body text-muted">{expense.payee}</td>
      <td className="py-3 pr-4 text-body text-muted">{formatDate(expense.incurred_on)}</td>
      <td className="py-3 pr-4">
        <Badge tone={statusTone[expense.status]}>{formatEnumLabel(expense.status)}</Badge>
      </td>
      <td className="py-3 pr-4 text-right text-body tabular text-text">
        {formatMoney(expense.amount, currency)}
      </td>
      <td className="py-3 text-right">
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onEdit(expense)} aria-label={`Edit ${expense.description}`}>
            Edit
          </Button>
          <Button
            variant="ghost"
            onClick={() => onDelete(expense)}
            aria-label={`Delete ${expense.description}`}
          >
            Delete
          </Button>
        </div>
      </td>
    </tr>
  )
}
