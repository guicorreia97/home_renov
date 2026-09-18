import { useMemo, useState } from 'react'
import { Button } from '../../components/Button'
import { useTranslation } from '../../i18n'
import type { Expense } from '../../types'
import { BudgetSettingsModal } from './BudgetSettingsModal'
import { BudgetSummaryStrip } from './BudgetSummaryStrip'
import { DeleteConfirmDialog } from './DeleteConfirmDialog'
import { ExpenseFilters } from './ExpenseFilters'
import { ExpenseFormModal } from './ExpenseFormModal'
import { ExpenseTable } from './ExpenseTable'
import type { ExpenseFilters as ExpenseFiltersValue, ExpenseFormValues } from './formTypes'
import { useExpensesData, type ExpensesData } from './useExpensesData'
import { formValuesFromExpense } from './validation'

type ModalState =
  | { kind: 'closed' }
  | { kind: 'form'; editing: Expense | null }
  | { kind: 'delete'; expense: Expense }
  | { kind: 'budget' }

export interface ExpensesScreenProps {
  /**
   * Controlled category/status filters. Omit to let the screen own its own
   * state — the shape every existing caller and test relies on. The app
   * shell passes both so the sidebar's category rail and this screen share
   * the *same* filter state rather than each keeping a copy (see
   * `AppShell.tsx` and the frontend-shell spec, "The sidebar rail filters by
   * category").
   */
  filters?: ExpenseFiltersValue
  onFiltersChange?: (filters: ExpenseFiltersValue) => void
  /**
   * The expenses/budget/summary state, already loaded by a caller. Omit to
   * let the screen load its own copy via `useExpensesData()` — the shape
   * every existing caller and test relies on. The app shell passes this so
   * it, the sidebar totals and the header assumptions read one shared
   * fetch instead of each mounting its own `useExpensesData()` (see
   * `AppShell.tsx`); two independent copies mean `GET /expenses` fires
   * twice per mount and a mutation made through one copy never shows up in
   * the other's already-rendered table.
   *
   * When present, the screen also stops rendering its own "add expense"
   * button: the caller that lifted this data owns that action instead
   * (`DeskHeader`'s record-expense button), so the view keeps exactly one
   * accent action (docs/design-system-guide.md).
   */
  data?: ExpensesData
}

export const EMPTY_FORM_VALUES: ExpenseFormValues = {
  description: '',
  amount: '',
  category: 'materials',
  payment_method: 'bank_transfer',
  payee: '',
  incurred_on: new Date().toISOString().slice(0, 10),
  status: 'paid',
  room: '',
  invoice_reference: '',
  notes: '',
}

export const DEFAULT_FILTERS: ExpenseFiltersValue = { status: 'all', category: 'all' }
/** Sensible default before the summary has loaded and we still know nothing about currency. */
const FALLBACK_CURRENCY = 'USD'

export default function ExpensesScreen({
  filters: controlledFilters,
  onFiltersChange,
  data,
}: ExpensesScreenProps = {}) {
  if (data) {
    return (
      <ExpensesScreenView
        data={data}
        filters={controlledFilters ?? DEFAULT_FILTERS}
        onFiltersChange={onFiltersChange ?? (() => {})}
        showAddButton={false}
      />
    )
  }
  return <UncontrolledExpensesScreen filters={controlledFilters} onFiltersChange={onFiltersChange} />
}

interface UncontrolledExpensesScreenProps {
  filters?: ExpenseFiltersValue
  onFiltersChange?: (filters: ExpenseFiltersValue) => void
}

/**
 * The path every caller takes that has not lifted `useExpensesData()` itself:
 * loads its own copy. Kept as its own component — rather than an `if` inside
 * `ExpensesScreen` guarding the hook call — because a hook can never be called
 * conditionally; this way the call is unconditional *within* whichever of the
 * two components actually renders.
 */
function UncontrolledExpensesScreen({ filters: controlledFilters, onFiltersChange }: UncontrolledExpensesScreenProps) {
  const data = useExpensesData()
  const [internalFilters, setInternalFilters] = useState<ExpenseFiltersValue>(DEFAULT_FILTERS)
  const filters = controlledFilters ?? internalFilters
  const setFilters = onFiltersChange ?? setInternalFilters

  return <ExpensesScreenView data={data} filters={filters} onFiltersChange={setFilters} showAddButton />
}

interface ExpensesScreenViewProps {
  data: ExpensesData
  filters: ExpenseFiltersValue
  onFiltersChange: (filters: ExpenseFiltersValue) => void
  /** False when a caller's own header already carries the page's one accent action. */
  showAddButton: boolean
}

/** The actual markup: loading, empty and error states, the table, the filters and the three modals. */
function ExpensesScreenView({ data, filters, onFiltersChange, showAddButton }: ExpensesScreenViewProps) {
  const { t } = useTranslation()
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
  } = data
  const [modal, setModal] = useState<ModalState>({ kind: 'closed' })

  function closeAndRefresh(): void {
    setModal({ kind: 'closed' })
    refresh()
  }

  const visible = useMemo(() => {
    if (!expenses) return []
    return expenses.filter(
      (expense) =>
        (filters.status === 'all' || expense.status === filters.status) &&
        (filters.category === 'all' || expense.category === filters.category),
    )
  }, [expenses, filters])

  const currency = summary?.currency ?? FALLBACK_CURRENCY

  return (
    <div className="mx-auto max-w-content px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-page-title text-text">{t('expenses.title')}</h1>
        {showAddButton && (
          <Button variant="primary" onClick={() => setModal({ kind: 'form', editing: null })}>
            {t('expenses.add')}
          </Button>
        )}
      </div>

      <div className="mt-6">
        <BudgetSummaryStrip
          summary={summary}
          summaryLoading={summaryLoading}
          summaryError={summaryError}
          budgetLoading={budgetLoading}
          budgetError={budgetError}
          onEditBudget={() => setModal({ kind: 'budget' })}
        />
      </div>

      <div className="mt-8">
        <ExpenseFilters filters={filters} onChange={onFiltersChange} />
      </div>

      <div className="mt-4">
        <ExpenseTable
          allExpenses={expenses}
          visible={visible}
          currency={currency}
          error={expensesError}
          onEdit={(expense) => setModal({ kind: 'form', editing: expense })}
          onDelete={(expense) => setModal({ kind: 'delete', expense })}
          onAddFirst={() => setModal({ kind: 'form', editing: null })}
          onRetry={refresh}
        />
      </div>

      {modal.kind === 'form' && (
        <ExpenseFormModal
          editing={modal.editing}
          initialValues={modal.editing ? formValuesFromExpense(modal.editing) : EMPTY_FORM_VALUES}
          onClose={() => setModal({ kind: 'closed' })}
          onSaved={closeAndRefresh}
        />
      )}

      {modal.kind === 'delete' && (
        <DeleteConfirmDialog
          expense={modal.expense}
          onClose={() => setModal({ kind: 'closed' })}
          onDeleted={closeAndRefresh}
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
