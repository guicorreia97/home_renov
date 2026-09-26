import type { FailureKind } from '../../lib/apiFailure'
import type { BudgetSummary, ExpenseCategory } from '../../types'
import { CategoryRail } from './CategoryRail'
import { SidebarFooter } from './SidebarFooter'

export interface SidebarProps {
  summary: BudgetSummary | null
  summaryLoading: boolean
  summaryError: FailureKind | null
  selectedCategory: ExpenseCategory | 'all'
  onSelectCategory: (category: ExpenseCategory) => void
  onClearCategory: () => void
  onSetBudget: () => void
}

/**
 * The persistent 258px rail: the category filter above, the budget position
 * below. Fixed width and its own scroll region, so it never moves as the
 * active view scrolls (frontend-shell spec, "The app renders inside a
 * full-height shell").
 */
export function Sidebar({
  summary,
  summaryLoading,
  summaryError,
  selectedCategory,
  onSelectCategory,
  onClearCategory,
  onSetBudget,
}: SidebarProps) {
  return (
    <aside className="flex h-full w-sidebar shrink-0 flex-col justify-between overflow-y-auto border-r border-border bg-surface px-4 py-6">
      <CategoryRail
        summary={summary}
        summaryLoading={summaryLoading}
        summaryError={summaryError}
        selectedCategory={selectedCategory}
        onSelectCategory={onSelectCategory}
        onClearCategory={onClearCategory}
      />
      <SidebarFooter summary={summary} summaryLoading={summaryLoading} onSetBudget={onSetBudget} />
    </aside>
  )
}
