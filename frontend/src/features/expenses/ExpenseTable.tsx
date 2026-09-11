import { Button } from '../../components/Button'
import { useTranslation } from '../../i18n'
import type { FailureKind } from '../../lib/apiFailure'
import type { Expense } from '../../types'
import { ExpenseRow } from './ExpenseRow'

export interface ExpenseTableProps {
  /** All fetched expenses, unfiltered — `null` while the initial load is in flight. */
  allExpenses: Expense[] | null
  /** `allExpenses` after filters and sorting — what actually renders. */
  visible: Expense[]
  currency: string
  error: FailureKind | null
  onEdit: (expense: Expense) => void
  onDelete: (expense: Expense) => void
  onAddFirst: () => void
  onRetry: () => void
}

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
  const { t } = useTranslation()

  const headers: [string, string][] = [
    ['description', t('expenses.table.header.description')],
    ['category', t('expenses.table.header.category')],
    ['payee', t('expenses.table.header.payee')],
    ['incurredOn', t('expenses.table.header.incurredOn')],
    ['status', t('expenses.table.header.status')],
    ['amount', t('expenses.table.header.amount')],
    ['actions', ''],
  ]

  if (error) {
    return (
      <div className="rounded-card border border-border bg-surface p-6">
        <p className="text-body text-danger">
          {t(error === 'network' ? 'expenses.error.network' : 'expenses.error.server')}
        </p>
        <Button variant="secondary" onClick={onRetry} className="mt-4">
          {t('expenses.table.retry')}
        </Button>
      </div>
    )
  }

  if (allExpenses === null) {
    return <p className="text-body text-muted">{t('expenses.table.loading')}</p>
  }

  if (allExpenses.length === 0) {
    return (
      <div className="rounded-card border border-border bg-surface p-6">
        <p className="text-body text-text">{t('expenses.table.empty')}</p>
        <Button variant="secondary" onClick={onAddFirst} className="mt-4">
          {t('expenses.add')}
        </Button>
      </div>
    )
  }

  if (visible.length === 0) {
    return <p className="text-body text-muted">{t('expenses.table.emptyFiltered')}</p>
  }

  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="border-b border-border">
          {headers.map(([key, header], index) => (
            <th
              key={key}
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
