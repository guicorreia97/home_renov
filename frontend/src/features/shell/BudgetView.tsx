import { Button } from '../../components/Button'
import { useFormat, useTranslation, type MessageKey } from '../../i18n'
import type { FailureKind } from '../../lib/apiFailure'
import type { BudgetSummary, CategoryTotal, Expense, ExpenseCategory } from '../../types'
import { BudgetCategoryGroup } from './BudgetCategoryGroup'
import { BudgetHeadline } from './BudgetHeadline'

export interface BudgetViewProps {
  summary: BudgetSummary | null
  summaryLoading: boolean
  summaryError: FailureKind | null
  expenses: Expense[] | null
  expensesError: FailureKind | null
  selectedCategory: ExpenseCategory | 'all'
  onAddExpense: () => void
}

/** Sensible default before the summary has loaded and we still know nothing about currency. */
const FALLBACK_CURRENCY = 'USD'

function errorMessageKey(kind: FailureKind): MessageKey {
  return kind === 'network' ? 'budget.error.network' : 'budget.error.server'
}

/**
 * The works budget: headline figures, then expenses grouped by category —
 * each group carrying its three subtotals and a share, and each expense's
 * own amount placed in the column matching its own status — and a grand
 * total. Every subtotal and the grand total come straight from
 * `GET /budget/summary`; only the amount inside a row is the expense's own
 * `amount` field, never recomputed — see the frontend-expenses spec, "The
 * works budget view groups expenses by category", and design.md decision 6
 * (no arithmetic on a `Money` value in the client).
 */
export function BudgetView({
  summary,
  summaryLoading,
  summaryError,
  expenses,
  expensesError,
  selectedCategory,
  onAddExpense,
}: BudgetViewProps) {
  const { t } = useTranslation()
  const { formatMoney } = useFormat()
  const currency = summary?.currency ?? FALLBACK_CURRENCY

  if (summaryLoading && !summary) {
    return <p className="p-6 text-body text-muted">{t('budget.summary.loadingSummary')}</p>
  }
  if (summaryError) {
    return <p className="p-6 text-body text-danger">{t(errorMessageKey(summaryError))}</p>
  }
  if (expensesError) {
    return <p className="p-6 text-body text-danger">{t(errorMessageKey(expensesError))}</p>
  }
  if (!summary || expenses === null) {
    return <p className="p-6 text-body text-muted">{t('budget.summary.loadingSummary')}</p>
  }

  const groups: CategoryTotal[] =
    selectedCategory === 'all'
      ? summary.by_category
      : summary.by_category.filter((group) => group.category === selectedCategory)

  return (
    <div className="mx-auto max-w-content px-6 py-12">
      <h1 className="text-page-title text-text">{t('shell.tab.budget')}</h1>

      <BudgetHeadline summary={summary} currency={currency} />

      <div className="mt-8">
        {groups.length === 0 ? (
          <div className="rounded-card border border-border bg-surface p-6">
            <p className="text-body text-text">
              {t(summary.by_category.length === 0 ? 'budget.view.empty' : 'budget.view.emptyFiltered')}
            </p>
            {summary.by_category.length === 0 && (
              <Button variant="secondary" onClick={onAddExpense} className="mt-4">
                {t('expenses.add')}
              </Button>
            )}
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="pb-2 text-left text-micro font-mono uppercase text-muted">
                  {t('expenses.table.header.description')}
                </th>
                <th className="pb-2 text-left text-micro font-mono uppercase text-muted">
                  {t('expenses.table.header.incurredOn')}
                </th>
                <th className="pb-2 text-right text-micro font-mono uppercase text-muted">{t('expense.status.planned')}</th>
                <th className="pb-2 text-right text-micro font-mono uppercase text-muted">{t('budget.view.columnCommitted')}</th>
                <th className="pb-2 text-right text-micro font-mono uppercase text-muted">{t('expense.status.paid')}</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <BudgetCategoryGroup
                  key={group.category}
                  group={group}
                  expenses={expenses.filter((expense) => expense.category === group.category)}
                  currency={currency}
                />
              ))}
            </tbody>
          </table>
        )}

        {groups.length > 0 && (
          // A single figure, not one per status column: `total_forecast` is
          // the sum across every status, so it does not belong under any one
          // of the three columns above without misreading as that column's
          // total (design.md decision 6 — this is `total_forecast` verbatim,
          // never a client-side sum of the rows above it).
          <div className="mt-4 flex items-center justify-between border-t-2 border-border pt-4">
            <span className="text-body font-medium text-text">{t('budget.summary.totalForecast')}</span>
            <span className="text-numeric font-mono tabular text-text">
              {formatMoney(summary.total_forecast, currency)}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export default BudgetView
