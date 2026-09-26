import { Button } from '../../components/Button'
import { useFormat, useTranslation, type MessageKey } from '../../i18n'
import type { FailureKind } from '../../lib/apiFailure'
import type { BudgetSummary } from '../../types'

export interface ProfitViewProps {
  summary: BudgetSummary | null
  summaryLoading: boolean
  summaryError: FailureKind | null
  onEditTargets: () => void
}

/** Sensible default before the summary has loaded and we still know nothing about currency. */
const FALLBACK_CURRENCY = 'USD'

function errorMessageKey(kind: FailureKind): MessageKey {
  return kind === 'network' ? 'budget.error.network' : 'budget.error.server'
}

/**
 * A string check, never a numeric one: `projected_profit` is a `SignedMoney`
 * string and this reads its leading `-` to pick a colour, exactly the way
 * `formatMoney` itself will render it — no `Number()`, no arithmetic (design.md
 * decision 6, frontend-expenses spec "Money never becomes a JavaScript number").
 */
function isNegative(amount: string): boolean {
  return amount.startsWith('-')
}

/**
 * The profit projection: headline figures, then the waterfall — target sale
 * price, less purchase price, less forecast works cost, giving the projected
 * profit — followed by margin, return on cost and the break-even price. Every
 * figure is read verbatim from `GET /budget/summary` (frontend-expenses spec,
 * "The profit view states the deal's arithmetic").
 */
export function ProfitView({ summary, summaryLoading, summaryError, onEditTargets }: ProfitViewProps) {
  const { t } = useTranslation()
  const { formatMoney, formatPercent } = useFormat()

  if (summaryLoading && !summary) {
    return <p className="p-6 text-body text-muted">{t('budget.summary.loadingSummary')}</p>
  }
  if (summaryError) {
    return <p className="p-6 text-body text-danger">{t(errorMessageKey(summaryError))}</p>
  }
  if (!summary) {
    return <p className="p-6 text-body text-muted">{t('budget.summary.loadingSummary')}</p>
  }

  const currency = summary.currency ?? FALLBACK_CURRENCY
  const hasTarget = summary.target_sale_price !== null
  const profitTone = summary.projected_profit !== null && isNegative(summary.projected_profit) ? 'text-danger' : 'text-text'

  return (
    <div className="mx-auto max-w-content px-6 py-12">
      <h1 className="text-page-title text-text">{t('shell.tab.profit')}</h1>

      {!hasTarget && (
        <div className="mt-6 rounded-card border border-border bg-surface p-6">
          <p className="text-body text-text">{t('budget.profit.noTarget')}</p>
          <Button variant="secondary" onClick={onEditTargets} className="mt-4">
            {t('shell.header.editTargets')}
          </Button>
          {summary.break_even_sale_price !== null && (
            <div className="mt-6 border-t border-border pt-4">
              <p className="text-label text-muted">{t('budget.profit.breakEven')}</p>
              <p className="mt-1 text-numeric font-mono tabular text-text">
                {formatMoney(summary.break_even_sale_price, currency)}
              </p>
            </div>
          )}
        </div>
      )}

      {hasTarget && (
        <>
          <dl className="mt-6 flex flex-wrap gap-8 rounded-card border border-border bg-surface p-6">
            <div>
              <dt className="text-label text-muted">{t('budget.summary.projectedProfit')}</dt>
              <dd className={`mt-1 text-numeric font-mono tabular ${profitTone}`}>
                {summary.projected_profit !== null ? formatMoney(summary.projected_profit, currency) : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-label text-muted">{t('budget.profit.margin')}</dt>
              <dd className="mt-1 text-numeric font-mono tabular text-text">
                {summary.margin_percent !== null ? formatPercent(summary.margin_percent) : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-label text-muted">{t('budget.profit.returnOnCost')}</dt>
              <dd className="mt-1 text-numeric font-mono tabular text-text">
                {summary.return_on_cost_percent !== null ? formatPercent(summary.return_on_cost_percent) : '—'}
              </dd>
            </div>
          </dl>

          <div className="mt-8 rounded-card border border-border bg-surface p-6">
            <dl className="flex flex-col gap-4">
              <div className="flex items-baseline justify-between">
                <dt className="text-body text-muted">{t('budget.field.targetSalePrice')}</dt>
                <dd className="text-figure font-mono tabular text-text">
                  {formatMoney(summary.target_sale_price!, currency)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between">
                <dt className="text-body text-muted">{t('budget.profit.less', { label: t('budget.field.purchasePrice') })}</dt>
                <dd className="text-figure font-mono tabular text-text">
                  {summary.purchase_price !== null ? formatMoney(summary.purchase_price, currency) : t('shell.header.assumptionUnset')}
                </dd>
              </div>
              <div className="flex items-baseline justify-between border-b border-border pb-4">
                <dt className="text-body text-muted">
                  {t('budget.profit.less', { label: t('budget.summary.totalForecast') })}
                </dt>
                <dd className="text-figure font-mono tabular text-text">{formatMoney(summary.total_forecast, currency)}</dd>
              </div>
              <div className="flex items-baseline justify-between">
                <dt className="text-body font-medium text-text">{t('budget.summary.projectedProfit')}</dt>
                <dd className={`text-numeric font-mono tabular ${profitTone}`}>
                  {summary.projected_profit !== null ? formatMoney(summary.projected_profit, currency) : '—'}
                </dd>
              </div>
            </dl>
          </div>

          {summary.break_even_sale_price !== null && (
            <div className="mt-6 flex items-center justify-between rounded-card border border-border bg-surface p-6">
              <span className="text-label text-muted">{t('budget.profit.breakEven')}</span>
              <span className="text-numeric font-mono tabular text-text">
                {formatMoney(summary.break_even_sale_price, currency)}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default ProfitView
