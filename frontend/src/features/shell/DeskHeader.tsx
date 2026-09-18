import { Badge, type BadgeTone } from '../../components/Badge'
import { Button } from '../../components/Button'
import { useFormat, useTranslation } from '../../i18n'
import type { FailureKind } from '../../lib/apiFailure'
import type { BudgetSummary, Money } from '../../types'

export interface DeskHeaderProps {
  summary: BudgetSummary | null
  summaryLoading: boolean
  summaryError: FailureKind | null
  budgetLoading: boolean
  budgetError: FailureKind | null
  onRecordExpense: () => void
  onEditTargets: () => void
}

/** Sensible default before the summary has loaded and we still know nothing about currency. */
const FALLBACK_CURRENCY = 'USD'

interface Assumption {
  key: string
  label: string
  value: Money | null
}

function errorMessageKey(kind: FailureKind): 'budget.error.network' | 'budget.error.server' {
  return kind === 'network' ? 'budget.error.network' : 'budget.error.server'
}

/**
 * The three figures every other figure on the desk is derived from, plus a
 * status pill and the two actions that open the existing modals. An unset
 * assumption reads as unset, never as zero (frontend-shell spec, "The header
 * carries the renovation's assumptions").
 *
 * Its "record an expense" action is the accent/primary button: `ExpensesScreen`,
 * mounted under the ledger tab, is passed this header's shared server state
 * (`AppShell.tsx`) and, in that controlled mode, renders no add-expense button
 * of its own — so this is the page's one primary action, per the design guide's
 * "exactly one accent action per view".
 */
export function DeskHeader({
  summary,
  summaryLoading,
  summaryError,
  budgetLoading,
  budgetError,
  onRecordExpense,
  onEditTargets,
}: DeskHeaderProps) {
  const { t } = useTranslation()
  const { formatMoney } = useFormat()
  const currency = summary?.currency ?? FALLBACK_CURRENCY
  const editDisabled = budgetLoading || !!budgetError

  const assumptions: Assumption[] = [
    { key: 'purchase', label: t('budget.field.purchasePrice'), value: summary?.purchase_price ?? null },
    { key: 'planned', label: t('budget.field.plannedBudget'), value: summary?.planned_budget ?? null },
    { key: 'sale', label: t('budget.field.targetSalePrice'), value: summary?.target_sale_price ?? null },
  ]

  const showPill = summary !== null && summary.planned_budget !== null
  const pillTone: BadgeTone = summary?.over_budget ? 'danger' : 'success'
  const pillLabel = summary?.over_budget
    ? t('shell.header.overBudgetPill')
    : t('shell.header.withinBudgetPill')

  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-border bg-surface px-6 py-4">
      <div className="flex flex-wrap items-center gap-6">
        {summaryLoading && !summary && (
          <p className="text-body text-muted">{t('budget.summary.loadingSummary')}</p>
        )}
        {summaryError && <p className="text-body text-danger">{t(errorMessageKey(summaryError))}</p>}
        {summary && (
          <dl className="flex flex-wrap items-baseline gap-6">
            {assumptions.map((assumption) => (
              <div key={assumption.key}>
                <dt className="text-micro font-mono text-muted uppercase">{assumption.label}</dt>
                <dd
                  className={`mt-1 text-figure font-mono tabular ${
                    assumption.value === null ? 'text-faint' : 'text-text'
                  }`}
                >
                  {assumption.value === null
                    ? t('shell.header.assumptionUnset')
                    : formatMoney(assumption.value, currency)}
                </dd>
              </div>
            ))}
          </dl>
        )}
        {showPill && <Badge tone={pillTone}>{pillLabel}</Badge>}
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <Button variant="ghost" onClick={onEditTargets} disabled={editDisabled}>
          {t('shell.header.editTargets')}
        </Button>
        <Button variant="primary" onClick={onRecordExpense}>
          {t('expenses.add')}
        </Button>
      </div>
    </div>
  )
}
