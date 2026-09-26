import { Button } from '../../components/Button'
import { useFormat, useTranslation } from '../../i18n'
import type { BudgetSummary } from '../../types'

export interface SidebarFooterProps {
  summary: BudgetSummary | null
  summaryLoading: boolean
  onSetBudget: () => void
}

type Tone = 'success' | 'warning' | 'danger'

const toneClass: Record<Tone, string> = {
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
}

/**
 * Thresholds from docs/design-system-guide.md: under 80% success, 80–90%
 * warning, 90%+ or the API's `over_budget` flag danger.
 */
function toneFor(summary: BudgetSummary): Tone {
  const percent = summary.budget_used_percent
  if (summary.over_budget || (percent !== null && percent >= 90)) return 'danger'
  if (percent !== null && percent >= 80) return 'warning'
  return 'success'
}

/**
 * The sidebar's closing figure: what is left of the budget, and how much of
 * it is used. Both come straight off `GET /budget/summary` — no arithmetic on
 * a `Money` value happens here.
 */
export function SidebarFooter({ summary, summaryLoading, onSetBudget }: SidebarFooterProps) {
  const { t } = useTranslation()
  const { formatMoney, formatPercent } = useFormat()

  if (summaryLoading && !summary) {
    return (
      <div className="border-t border-border pt-4">
        <p className="text-body text-muted">{t('budget.summary.loadingSummary')}</p>
      </div>
    )
  }

  if (!summary || summary.planned_budget === null || summary.remaining_budget === null) {
    return (
      <div className="border-t border-border pt-4">
        <p className="text-body text-muted">{t('shell.sidebar.footer.noBudget')}</p>
        <Button variant="secondary" onClick={onSetBudget} className="mt-2 w-full">
          {t('budget.summary.edit')}
        </Button>
      </div>
    )
  }

  const tone = toneFor(summary)
  const label = summary.over_budget ? t('budget.summary.overBudget') : t('budget.summary.remaining')

  return (
    <div className="border-t border-border pt-4">
      <p className="text-label text-muted">{label}</p>
      <p className={`mt-1 text-numeric font-mono tabular ${toneClass[tone]}`}>
        {formatMoney(summary.remaining_budget, summary.currency)}
      </p>
      {summary.budget_used_percent !== null && (
        <p className="mt-1 text-label text-muted">
          {t('budget.remaining.percentUsed', { percent: formatPercent(summary.budget_used_percent) })}
        </p>
      )}
    </div>
  )
}
