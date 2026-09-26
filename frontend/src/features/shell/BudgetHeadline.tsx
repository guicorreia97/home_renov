import { useFormat, useTranslation } from '../../i18n'
import type { BudgetSummary } from '../../types'
import { buildRemainingConclusion, RemainingConclusionBlock } from '../expenses/RemainingBudgetConclusion'

export interface BudgetHeadlineProps {
  summary: BudgetSummary
  currency: string
}

/**
 * The works budget's headline row — total paid, total planned, total
 * forecast, plus the remaining/over-budget conclusion — and, only when the
 * API's `over_budget` flag is set, the overrun callout worded from the
 * returned figures (frontend-expenses spec, "Within budget" / the overrun
 * scenario). Absent entirely when the flag is false.
 */
export function BudgetHeadline({ summary, currency }: BudgetHeadlineProps) {
  const { t } = useTranslation()
  const { formatMoney } = useFormat()
  const remaining = buildRemainingConclusion(summary, formatMoney, t)

  return (
    <>
      <dl className="mt-6 flex flex-wrap gap-8 rounded-card border border-border bg-surface p-6">
        {(
          [
            ['budget.summary.totalPaid', summary.total_paid],
            ['budget.summary.totalPlanned', summary.total_planned],
            ['budget.summary.totalForecast', summary.total_forecast],
          ] as const
        ).map(([key, amount]) => (
          <div key={key}>
            <dt className="text-label text-muted">{t(key)}</dt>
            <dd className="mt-1 text-numeric font-mono tabular text-text">{formatMoney(amount, currency)}</dd>
          </div>
        ))}
        {remaining && (
          <div className="min-w-field">
            <RemainingConclusionBlock conclusion={remaining} />
          </div>
        )}
      </dl>

      {summary.over_budget && summary.planned_budget !== null && (
        <div role="alert" className="mt-6 rounded-card border border-danger bg-danger-soft p-6">
          <p className="text-section text-danger">{t('shell.header.overBudgetPill')}</p>
          <p className="mt-1 text-body text-text">
            {t('budget.view.overrunMessage', {
              forecast: formatMoney(summary.total_forecast, currency),
              planned: formatMoney(summary.planned_budget, currency),
            })}
          </p>
        </div>
      )}
    </>
  )
}
