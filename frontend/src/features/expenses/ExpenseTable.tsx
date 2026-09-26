import { Button } from '../../components/Button'
import { useFormat, useTranslation } from '../../i18n'
import type { FailureKind } from '../../lib/apiFailure'
import type { Expense } from '../../types'
import { ExpenseRow } from './ExpenseRow'
import type { LedgerTotal } from './ledgerTotal'

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
  /**
   * The current filters' total and its label, read straight from
   * `GET /budget/summary` by the caller (`ledgerTotal`) — omit to render no
   * total line at all. Never derived here by summing `visible`: that would
   * silently disagree with the API the moment a filter hides a row (see
   * `ledgerTotal.ts` and the frontend-expenses spec, "A subtotal is never
   * summed in the browser").
   */
  total?: LedgerTotal | null
}

/** The column order the ledger requirement lists: date, description, how it
 * was paid, payee, document reference, category — status and the amount
 * (right-aligned, tabular) close the row, then the row actions. */
const HEADER_KEYS = [
  'expenses.table.header.incurredOn',
  'expenses.table.header.description',
  'expense.field.paymentMethod',
  'expenses.table.header.payee',
  'expenses.table.header.invoiceReference',
  'expenses.table.header.category',
  'expenses.table.header.status',
  'expenses.table.header.amount',
] as const

/** The ledger: loading, empty, error and populated states, closing with the filtered total. */
export function ExpenseTable({
  allExpenses,
  visible,
  currency,
  error,
  onEdit,
  onDelete,
  onAddFirst,
  onRetry,
  total,
}: ExpenseTableProps) {
  const { t } = useTranslation()
  const { formatMoney } = useFormat()

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

  const lastHeaderIndex = HEADER_KEYS.length - 1

  return (
    <>
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-border">
            {HEADER_KEYS.map((key, index) => (
              <th
                key={key}
                className={`pb-2 text-micro font-mono uppercase text-muted ${index === lastHeaderIndex ? 'text-right' : 'text-left'}`}
              >
                {t(key)}
              </th>
            ))}
            <th className="pb-2 text-micro font-mono uppercase text-muted" aria-hidden="true" />
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

      {total != null && (
        <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
          <span className="text-label text-muted">{t(total.label)}</span>
          <span className="text-numeric font-mono tabular text-text">{formatMoney(total.amount, currency)}</span>
        </div>
      )}
    </>
  )
}
