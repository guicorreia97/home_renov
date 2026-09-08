import { useMemo, useState } from 'react'
import { Button } from '../../components/Button'
import type { Expense } from '../../types'
import { BudgetSettingsModal } from './BudgetSettingsModal'
import { BudgetSummaryStrip } from './BudgetSummaryStrip'
import { DeleteConfirmDialog } from './DeleteConfirmDialog'
import { ExpenseFilters } from './ExpenseFilters'
import { ExpenseFormModal } from './ExpenseFormModal'
import { ExpenseTable } from './ExpenseTable'
import type { ExpenseFilters as ExpenseFiltersValue, ExpenseFormValues } from './formTypes'
import { useExpensesData } from './useExpensesData'
import { formValuesFromExpense } from './validation'

type ModalState =
  | { kind: 'closed' }
  | { kind: 'form'; editing: Expense | null }
  | { kind: 'delete'; expense: Expense }
  | { kind: 'budget' }

const EMPTY_FORM_VALUES: ExpenseFormValues = {
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

const DEFAULT_FILTERS: ExpenseFiltersValue = { status: 'all', category: 'all' }
/** Sensible default before the summary has loaded and we still know nothing about currency. */
const FALLBACK_CURRENCY = 'USD'

export default function ExpensesScreen() {
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
  } = useExpensesData()
  const [filters, setFilters] = useState<ExpenseFiltersValue>(DEFAULT_FILTERS)
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
        <h1 className="text-page-title text-text">Expenses</h1>
        <Button variant="primary" onClick={() => setModal({ kind: 'form', editing: null })}>
          Add expense
        </Button>
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
        <ExpenseFilters filters={filters} onChange={setFilters} />
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
