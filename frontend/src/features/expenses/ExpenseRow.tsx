import { Badge, type BadgeTone } from '../../components/Badge'
import { Button } from '../../components/Button'
import { useFormat, useTranslation } from '../../i18n'
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
  const { t } = useTranslation()
  const { formatDate, formatMoney } = useFormat()

  return (
    <tr className="border-b border-border">
      <td className="py-3 pr-4 text-body text-text">
        {expense.description}
        {expense.room && <span className="ml-2 text-label text-muted">{expense.room}</span>}
      </td>
      <td className="py-3 pr-4 text-body text-muted">{t(`expense.category.${expense.category}`)}</td>
      <td className="py-3 pr-4 text-body text-muted">{expense.payee}</td>
      <td className="py-3 pr-4 text-body text-muted">{formatDate(expense.incurred_on)}</td>
      <td className="py-3 pr-4">
        <Badge tone={statusTone[expense.status]}>{t(`expense.status.${expense.status}`)}</Badge>
      </td>
      <td className="py-3 pr-4 text-right text-body tabular text-text">
        {formatMoney(expense.amount, currency)}
      </td>
      <td className="py-3 text-right">
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            onClick={() => onEdit(expense)}
            aria-label={t('expense.action.editNamed', { description: expense.description })}
          >
            {t('expense.action.edit')}
          </Button>
          <Button
            variant="ghost"
            onClick={() => onDelete(expense)}
            aria-label={t('expense.action.deleteNamed', { description: expense.description })}
          >
            {t('expense.action.delete')}
          </Button>
        </div>
      </td>
    </tr>
  )
}
