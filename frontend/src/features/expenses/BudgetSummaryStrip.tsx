import { Button } from '../../components/Button'
import { useFormat, useTranslation, type MessageKey, type TranslateFn } from '../../i18n'
import type { FailureKind } from '../../lib/apiFailure'
import type { BudgetSummary, Money, SignedMoney } from '../../types'
import { buildRemainingConclusion, RemainingConclusionBlock } from './RemainingBudgetConclusion'

export interface BudgetSummaryStripProps {
  summary: BudgetSummary | null
  summaryLoading: boolean
  summaryError: FailureKind | null
  /** True while the budget targets themselves are still loading. */
  budgetLoading: boolean
  budgetError: FailureKind | null
  onEditBudget: () => void
}

interface Figure {
  label: string
  value: string
  tone?: 'success' | 'warning' | 'danger'
}

type FormatMoneyFn = (amount: Money | SignedMoney, currency: string) => string

const toneClass: Record<NonNullable<Figure['tone']>, string> = {
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
}

function errorMessageKey(kind: FailureKind): MessageKey {
  return kind === 'network' ? 'budget.error.network' : 'budget.error.server'
}

/** Renders a Money/SignedMoney amount, or an em dash in --text-faint when unset. */
function amountOrDash(
  value: Money | SignedMoney | null,
  currency: string,
  formatMoney: FormatMoneyFn,
): string {
  return value === null ? '—' : formatMoney(value, currency)
}

function FigureRow({ figures }: { figures: Figure[] }) {
  return (
    <dl className="flex flex-wrap gap-8">
      {figures.map((figure) => (
        <div key={figure.label}>
          <dt className="text-label text-muted">{figure.label}</dt>
          <dd
            className={`mt-1 text-numeric font-mono tabular ${
              figure.value === '—'
                ? 'text-faint'
                : figure.tone
                  ? toneClass[figure.tone]
                  : 'text-text'
            }`}
          >
            {figure.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

function buildTargetFigures(summary: BudgetSummary, formatMoney: FormatMoneyFn, t: TranslateFn): Figure[] {
  return [
    {
      label: t('budget.field.plannedBudget'),
      value: amountOrDash(summary.planned_budget, summary.currency, formatMoney),
    },
    {
      label: t('budget.field.purchasePrice'),
      value: amountOrDash(summary.purchase_price, summary.currency, formatMoney),
    },
    {
      label: t('budget.field.targetSalePrice'),
      value: amountOrDash(summary.target_sale_price, summary.currency, formatMoney),
    },
    {
      label: t('budget.summary.projectedProfit'),
      value: amountOrDash(summary.projected_profit, summary.currency, formatMoney),
    },
  ]
}

function buildSpendFigures(summary: BudgetSummary, formatMoney: FormatMoneyFn, t: TranslateFn): Figure[] {
  return [
    { label: t('budget.summary.expensesRecorded'), value: String(summary.expense_count) },
    { label: t('budget.summary.totalPaid'), value: formatMoney(summary.total_paid, summary.currency) },
    {
      label: t('budget.summary.totalCommitted'),
      value: formatMoney(summary.total_committed, summary.currency),
    },
    {
      label: t('budget.summary.totalForecast'),
      value: formatMoney(summary.total_forecast, summary.currency),
    },
  ]
}

/** The top-of-screen totals, plus the entry point into the budget settings modal. */
export function BudgetSummaryStrip({
  summary,
  summaryLoading,
  summaryError,
  budgetLoading,
  budgetError,
  onEditBudget,
}: BudgetSummaryStripProps) {
  const { t } = useTranslation()
  const { formatMoney } = useFormat()
  const editDisabled = budgetLoading || !!budgetError
  const remaining = summary ? buildRemainingConclusion(summary, formatMoney, t) : null

  return (
    <section
      className="rounded-card border border-border bg-surface p-6"
      aria-label={t('budget.summary.label')}
    >
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-section text-text">{t('budget.summary.title')}</h2>
        <div className="text-right">
          <Button variant="ghost" onClick={onEditBudget} disabled={editDisabled}>
            {t('budget.summary.edit')}
          </Button>
          {budgetLoading && (
            <p className="mt-1 text-label text-muted">{t('budget.summary.loadingTargets')}</p>
          )}
          {budgetError && <p className="mt-1 text-label text-danger">{t(errorMessageKey(budgetError))}</p>}
        </div>
      </div>

      <div className="mt-4">
        {summaryLoading && !summary && (
          <p className="text-body text-muted">{t('budget.summary.loadingSummary')}</p>
        )}
        {summaryError && <p className="text-body text-danger">{t(errorMessageKey(summaryError))}</p>}
        {summary && (
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-micro font-mono text-muted uppercase">{t('budget.summary.targetsHeading')}</p>
              <div className="mt-2">
                <FigureRow figures={buildTargetFigures(summary, formatMoney, t)} />
              </div>
              {summary.planned_budget === null && (
                <p className="mt-4 text-body text-muted">
                  {t('budget.summary.emptyState', { action: t('budget.summary.edit') })}
                </p>
              )}
            </div>

            <div className="border-t border-border pt-4">
              <p className="text-micro font-mono text-muted uppercase">{t('budget.summary.spendHeading')}</p>
              <div className="mt-2">
                <FigureRow figures={buildSpendFigures(summary, formatMoney, t)} />
              </div>
            </div>

            {remaining && <RemainingConclusionBlock conclusion={remaining} />}
          </div>
        )}
      </div>
    </section>
  )
}
