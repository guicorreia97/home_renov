import { useState } from 'react'
import { BudgetSettingsModal } from '../expenses/BudgetSettingsModal'
import type { ExpenseFilters as ExpenseFiltersValue } from '../expenses/formTypes'
import { ExpenseFormModal } from '../expenses/ExpenseFormModal'
import ExpensesScreen, { DEFAULT_FILTERS, EMPTY_FORM_VALUES } from '../expenses/ExpensesScreen'
import { useExpensesData } from '../expenses/useExpensesData'
import type { ExpenseCategory } from '../../types'
import { BudgetView } from './BudgetView'
import { DeskHeader } from './DeskHeader'
import { ProfitView } from './ProfitView'
import { Sidebar } from './Sidebar'
import { TabNav } from './TabNav'
import { DEFAULT_SHELL_TAB, panelElementId, tabElementId, type ShellTabId } from './tabs'

type ShellModal = { kind: 'closed' } | { kind: 'expense' } | { kind: 'budget' }

/**
 * The full-height app shell: a fixed 258px sidebar, a header carrying the
 * renovation's assumptions, a tab bar, and the active view. Only rendered
 * once `App.tsx`'s health check has already succeeded — see the
 * frontend-shell spec, "The app renders inside a full-height shell".
 *
 * Owns the one `useExpensesData()` call, the category filter and the two
 * shell-level modals, so the sidebar's rail, the header's actions and the
 * ledger tab's `ExpensesScreen` all read and mutate the same server state
 * rather than each keeping its own copy — `ExpensesScreen` receives that
 * state through its `data` prop instead of loading a second one.
 */
export function AppShell() {
  // The one live call: its result is threaded into `ExpensesScreen` as the
  // `data` prop below, so the sidebar totals, the header assumptions and the
  // ledger table all read the same three requests instead of each mounting
  // its own copy of this hook (frontend-shell spec, "single source of truth").
  const expensesData = useExpensesData()
  const {
    expenses,
    expensesError,
    summary,
    summaryLoading,
    summaryError,
    budget,
    budgetLoading,
    budgetError,
    budgetSaving,
    budgetSaveError,
    saveBudget,
    refresh,
  } = expensesData

  const [filters, setFilters] = useState<ExpenseFiltersValue>(DEFAULT_FILTERS)
  const [activeTab, setActiveTab] = useState<ShellTabId>(DEFAULT_SHELL_TAB)
  const [modal, setModal] = useState<ShellModal>({ kind: 'closed' })

  function selectCategory(category: ExpenseCategory | 'all'): void {
    setFilters((current) => ({ ...current, category }))
  }

  return (
    <div className="flex h-full overflow-hidden">
      <Sidebar
        summary={summary}
        summaryLoading={summaryLoading}
        summaryError={summaryError}
        selectedCategory={filters.category}
        onSelectCategory={selectCategory}
        onClearCategory={() => selectCategory('all')}
        onSetBudget={() => setModal({ kind: 'budget' })}
      />

      <div className="flex h-full flex-1 flex-col overflow-hidden">
        <DeskHeader
          summary={summary}
          summaryLoading={summaryLoading}
          summaryError={summaryError}
          budgetLoading={budgetLoading}
          budgetError={budgetError}
          onRecordExpense={() => setModal({ kind: 'expense' })}
          onEditTargets={() => setModal({ kind: 'budget' })}
        />
        <TabNav activeTab={activeTab} onSelectTab={setActiveTab} />

        <main className="flex-1 overflow-y-auto">
          <div
            role="tabpanel"
            id={panelElementId(activeTab)}
            aria-labelledby={tabElementId(activeTab)}
          >
            {activeTab === 'ledger' && (
              <ExpensesScreen data={expensesData} filters={filters} onFiltersChange={setFilters} />
            )}
            {activeTab === 'budget' && (
              <BudgetView
                summary={summary}
                summaryLoading={summaryLoading}
                summaryError={summaryError}
                expenses={expenses}
                expensesError={expensesError}
                selectedCategory={filters.category}
                onAddExpense={() => setModal({ kind: 'expense' })}
              />
            )}
            {activeTab === 'profit' && (
              <ProfitView
                summary={summary}
                summaryLoading={summaryLoading}
                summaryError={summaryError}
                onEditTargets={() => setModal({ kind: 'budget' })}
              />
            )}
          </div>
        </main>
      </div>

      {modal.kind === 'expense' && (
        <ExpenseFormModal
          editing={null}
          initialValues={EMPTY_FORM_VALUES}
          onClose={() => setModal({ kind: 'closed' })}
          onSaved={() => {
            setModal({ kind: 'closed' })
            refresh()
          }}
        />
      )}

      {modal.kind === 'budget' && (
        <BudgetSettingsModal
          budget={budget}
          saving={budgetSaving}
          saveError={budgetSaveError}
          onSave={saveBudget}
          onClose={() => setModal({ kind: 'closed' })}
        />
      )}
    </div>
  )
}

export default AppShell
