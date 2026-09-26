import { useFormat, useTranslation } from '../../i18n'
import type { FailureKind } from '../../lib/apiFailure'
import type { BudgetSummary, ExpenseCategory } from '../../types'

export interface CategoryRailProps {
  summary: BudgetSummary | null
  summaryLoading: boolean
  summaryError: FailureKind | null
  selectedCategory: ExpenseCategory | 'all'
  onSelectCategory: (category: ExpenseCategory) => void
  onClearCategory: () => void
}

/** Sensible default before the summary has loaded and we still know nothing about currency. */
const FALLBACK_CURRENCY = 'USD'

/**
 * Swatches are `--accent` at stepped opacity, ordered by share of spend, never
 * a distinct hue per category — the ramp documented under "Category swatches
 * are a monochrome ramp" in docs/design-system-guide.md. Keep these numbers
 * in sync with that table; `opacity` is a plain numeric CSS property applied
 * to the single `bg-accent` token, not a new color.
 */
const SWATCH_OPACITY_STEPS = [1, 0.8, 0.62, 0.46, 0.32, 0.2]

function swatchOpacity(rank: number): number {
  return SWATCH_OPACITY_STEPS[Math.min(rank, SWATCH_OPACITY_STEPS.length - 1)]
}

function errorMessageKey(kind: FailureKind): 'budget.error.network' | 'budget.error.server' {
  return kind === 'network' ? 'budget.error.network' : 'budget.error.server'
}

/**
 * The sidebar's category filter rail. Every figure — the committed total, the
 * share — comes straight from `GET /budget/summary`'s `by_category`; nothing
 * here sums or compares a `Money` value. Selecting a row sets the screen's
 * existing category filter (owned by `AppShell`) rather than a second
 * filtering mechanism of its own.
 */
export function CategoryRail({
  summary,
  summaryLoading,
  summaryError,
  selectedCategory,
  onSelectCategory,
  onClearCategory,
}: CategoryRailProps) {
  const { t } = useTranslation()
  const { formatMoney, formatPercent } = useFormat()
  const currency = summary?.currency ?? FALLBACK_CURRENCY

  // "With committed spend" — `share` is already a number computed
  // server-side from committed spend, so filtering on it never sums or
  // compares a Money string.
  const categories = summary
    ? [...summary.by_category].filter((c) => c.share > 0).sort((a, b) => b.share - a.share)
    : []

  return (
    <nav aria-label={t('shell.sidebar.categoriesHeading')} className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-section text-text">{t('shell.sidebar.categoriesHeading')}</h2>
        <button
          type="button"
          onClick={onClearCategory}
          disabled={selectedCategory === 'all'}
          className="min-h-control text-label text-muted hover:text-text disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t('shell.sidebar.clearFilter')}
        </button>
      </div>

      {summaryLoading && !summary && <p className="text-body text-muted">{t('shell.sidebar.loading')}</p>}
      {summaryError && <p className="text-body text-danger">{t(errorMessageKey(summaryError))}</p>}
      {summary && categories.length === 0 && (
        <p className="text-body text-muted">{t('shell.sidebar.empty')}</p>
      )}

      {categories.length > 0 && (
        <ul className="flex flex-col gap-1">
          {categories.map((category, index) => {
            const selected = selectedCategory === category.category
            const label = t(`expense.category.${category.category}`)
            return (
              <li key={category.category}>
                <button
                  type="button"
                  aria-label={label}
                  aria-pressed={selected}
                  onClick={() => onSelectCategory(category.category)}
                  className={`flex min-h-control w-full items-center justify-between gap-3 rounded-input px-3 py-2 text-left transition-colors duration-150 ease-out ${
                    selected ? 'bg-accent-soft' : 'hover:bg-surface-raised'
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full bg-accent"
                      style={{ opacity: swatchOpacity(index) }}
                      aria-hidden="true"
                    />
                    <span className="truncate text-body text-text">{label}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end">
                    <span className="text-figure font-mono tabular text-text">
                      {formatMoney(category.amount, currency)}
                    </span>
                    <span className="text-micro font-mono text-muted uppercase">
                      {formatPercent(category.share)}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </nav>
  )
}
