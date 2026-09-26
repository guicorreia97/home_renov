import { useFormat, useTranslation, type TranslateFn } from '../../i18n'
import type { BudgetSummary, Money, SignedMoney } from '../../types'

export type RemainingConclusionTone = 'success' | 'warning' | 'danger'

export interface RemainingConclusion {
  label: string
  amount: string
  percent: number | null
  tone: RemainingConclusionTone
}

type FormatMoneyFn = (amount: Money | SignedMoney, currency: string) => string

/**
 * Builds the closing "remaining budget" figure, or `null` when there is no
 * budget to close against. Shared by `BudgetSummaryStrip` and `BudgetView` so
 * the thresholds — under 80% success, 80–90% warning, 90%+ or `over_budget`
 * danger (docs/design-system-guide.md) — live in exactly one place.
 */
export function buildRemainingConclusion(
  summary: BudgetSummary,
  formatMoney: FormatMoneyFn,
  t: TranslateFn,
): RemainingConclusion | null {
  if (summary.planned_budget === null || summary.remaining_budget === null) {
    return null
  }
  const percent = summary.budget_used_percent
  // Red before the money is gone, not after: at 90% the remaining budget is
  // small enough that the next expense is likely to break it, which is the
  // point at which the user needs to act.
  const tone: RemainingConclusionTone =
    summary.over_budget || (percent !== null && percent >= 90)
      ? 'danger'
      : percent !== null && percent >= 80
        ? 'warning'
        : 'success'
  return {
    label: t(summary.over_budget ? 'budget.summary.overBudget' : 'budget.summary.remaining'),
    amount: formatMoney(summary.remaining_budget, summary.currency),
    percent,
    tone,
  }
}

const toneTextClass: Record<RemainingConclusionTone, string> = {
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
}

const toneBarClass: Record<RemainingConclusionTone, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
}

function clampPercent(percent: number): number {
  return Math.min(100, Math.max(0, percent))
}

/** The strip's conclusion: remaining/over-budget figure plus a spend progress bar. */
export function RemainingConclusionBlock({ conclusion }: { conclusion: RemainingConclusion }) {
  const { t } = useTranslation()
  const { formatPercent } = useFormat()
  const barWidth = clampPercent(conclusion.percent ?? 0)
  return (
    <div className="border-t border-border pt-4">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-label text-muted">{conclusion.label}</p>
        {conclusion.percent !== null && (
          <p className="text-label text-muted">
            {t('budget.remaining.percentUsed', { percent: formatPercent(conclusion.percent) })}
          </p>
        )}
      </div>
      <p className={`mt-1 text-numeric font-mono tabular ${toneTextClass[conclusion.tone]}`}>
        {conclusion.amount}
      </p>
      <div
        className="mt-2 h-2 w-full overflow-hidden rounded-pill bg-surface-raised"
        aria-hidden="true"
      >
        <div
          className={`h-2 rounded-pill ${toneBarClass[conclusion.tone]}`}
          style={{ width: `${barWidth}%` }}
        />
      </div>
    </div>
  )
}
