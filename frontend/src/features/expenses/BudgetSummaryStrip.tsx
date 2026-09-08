import { Button } from '../../components/Button'
import { formatMoney } from '../../lib/format'
import type { BudgetSummary, Money, SignedMoney } from '../../types'

export interface BudgetSummaryStripProps {
  summary: BudgetSummary | null
  summaryLoading: boolean
  summaryError: string | null
  /** True while the budget targets themselves are still loading. */
  budgetLoading: boolean
  budgetError: string | null
  onEditBudget: () => void
}

interface Figure {
  label: string
  value: string
  tone?: 'success' | 'warning' | 'danger'
}

const toneClass: Record<NonNullable<Figure['tone']>, string> = {
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
}

/** Renders a Money/SignedMoney amount, or an em dash in --text-faint when unset. */
function amountOrDash(value: Money | SignedMoney | null, currency: string): string {
  return value === null ? '—' : formatMoney(value, currency)
}

function FigureRow({ figures }: { figures: Figure[] }) {
  return (
    <dl className="flex flex-wrap gap-8">
      {figures.map((figure) => (
        <div key={figure.label}>
          <dt className="text-label text-muted">{figure.label}</dt>
          <dd
            className={`mt-1 text-numeric tabular ${
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

function buildTargetFigures(summary: BudgetSummary): Figure[] {
  return [
    { label: 'Planned budget', value: amountOrDash(summary.planned_budget, summary.currency) },
    { label: 'Purchase price', value: amountOrDash(summary.purchase_price, summary.currency) },
    {
      label: 'Target sale price',
      value: amountOrDash(summary.target_sale_price, summary.currency),
    },
    { label: 'Projected profit', value: amountOrDash(summary.projected_profit, summary.currency) },
  ]
}

function buildSpendFigures(summary: BudgetSummary): Figure[] {
  return [
    { label: 'Expenses recorded', value: String(summary.expense_count) },
    { label: 'Total paid', value: formatMoney(summary.total_paid, summary.currency) },
    { label: 'Total committed', value: formatMoney(summary.total_committed, summary.currency) },
    { label: 'Total forecast', value: formatMoney(summary.total_forecast, summary.currency) },
  ]
}

function buildRemainingFigure(summary: BudgetSummary): Figure | null {
  if (summary.planned_budget === null || summary.remaining_budget === null) {
    return null
  }
  return {
    label: summary.over_budget ? 'Over budget by' : 'Remaining budget',
    value: formatMoney(summary.remaining_budget, summary.currency),
    tone: summary.over_budget ? 'danger' : 'success',
  }
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
  const editDisabled = budgetLoading || !!budgetError
  const remaining = summary ? buildRemainingFigure(summary) : null

  return (
    <section className="rounded-card border border-border bg-surface p-6" aria-label="Budget summary">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-section text-text">Budget</h2>
        <div className="text-right">
          <Button variant="ghost" onClick={onEditBudget} disabled={editDisabled}>
            Edit budget
          </Button>
          {budgetLoading && <p className="mt-1 text-label text-muted">Loading budget…</p>}
          {budgetError && <p className="mt-1 text-label text-danger">{budgetError}</p>}
        </div>
      </div>

      <div className="mt-4">
        {summaryLoading && !summary && <p className="text-body text-muted">Loading summary…</p>}
        {summaryError && <p className="text-body text-danger">{summaryError}</p>}
        {summary && (
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-table-head text-muted uppercase">Targets</p>
              <div className="mt-2">
                <FigureRow figures={buildTargetFigures(summary)} />
              </div>
              {summary.planned_budget === null && (
                <p className="mt-4 text-body text-muted">
                  No budget is set yet. Use "Edit budget" above to set a planned budget and track
                  spend against it.
                </p>
              )}
            </div>

            <div className="border-t border-border pt-4">
              <p className="text-table-head text-muted uppercase">Spend</p>
              <div className="mt-2">
                <FigureRow figures={buildSpendFigures(summary)} />
              </div>
            </div>

            {remaining && (
              <div className="border-t border-border pt-4">
                <FigureRow figures={[remaining]} />
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
