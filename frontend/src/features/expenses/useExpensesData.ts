import { useEffect, useRef, useState } from 'react'
import {
  ApiError,
  getBudget,
  getBudgetSummary,
  listExpenses,
  updateBudget,
} from '../../api'
import type { Budget, BudgetSummary, BudgetUpdate, Expense } from '../../types'

function sortNewestFirst(expenses: Expense[]): Expense[] {
  return [...expenses].sort((a, b) => b.incurred_on.localeCompare(a.incurred_on))
}

function messageFor(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Unexpected error contacting the API.'
}

export interface ExpensesData {
  expenses: Expense[] | null
  expensesLoading: boolean
  expensesError: string | null

  summary: BudgetSummary | null
  summaryLoading: boolean
  summaryError: string | null

  budget: Budget | null
  budgetLoading: boolean
  budgetError: string | null

  /** True while any of the three reads is in flight. */
  loading: boolean

  budgetSaving: boolean
  budgetSaveError: string | null

  /** Re-fetch all three — call after any successful expense mutation. */
  refresh: () => void
  /** Save the targets and re-read the summary. Resolves `true` on success. */
  saveBudget: (payload: BudgetUpdate) => Promise<boolean>
}

/**
 * Loads the expense list, the budget targets and the computed summary together,
 * and keeps them in sync so the table and the totals strip never disagree.
 *
 * The three reads are independent: each carries its own loading and error state,
 * so a failing summary leaves the table rendered rather than blanking the whole
 * screen. Every in-flight request is cancelled on unmount, or superseded by the
 * next `refresh()`.
 */
export function useExpensesData(): ExpensesData {
  const [expenses, setExpenses] = useState<Expense[] | null>(null)
  const [expensesLoading, setExpensesLoading] = useState(true)
  const [expensesError, setExpensesError] = useState<string | null>(null)

  const [summary, setSummary] = useState<BudgetSummary | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [summaryError, setSummaryError] = useState<string | null>(null)

  const [budget, setBudget] = useState<Budget | null>(null)
  const [budgetLoading, setBudgetLoading] = useState(true)
  const [budgetError, setBudgetError] = useState<string | null>(null)

  const [budgetSaving, setBudgetSaving] = useState(false)
  const [budgetSaveError, setBudgetSaveError] = useState<string | null>(null)

  const loadRef = useRef<AbortController | null>(null)
  const saveRef = useRef<AbortController | null>(null)

  async function loadExpenses(signal: AbortSignal): Promise<void> {
    setExpensesLoading(true)
    try {
      const list = await listExpenses(signal)
      if (signal.aborted) return
      setExpenses(sortNewestFirst(list))
      setExpensesError(null)
    } catch (error) {
      if (signal.aborted) return
      setExpensesError(messageFor(error))
    } finally {
      if (!signal.aborted) setExpensesLoading(false)
    }
  }

  async function loadSummary(signal: AbortSignal): Promise<void> {
    setSummaryLoading(true)
    try {
      const next = await getBudgetSummary(signal)
      if (signal.aborted) return
      setSummary(next)
      setSummaryError(null)
    } catch (error) {
      if (signal.aborted) return
      setSummaryError(messageFor(error))
    } finally {
      if (!signal.aborted) setSummaryLoading(false)
    }
  }

  async function loadBudget(signal: AbortSignal): Promise<void> {
    setBudgetLoading(true)
    try {
      const next = await getBudget(signal)
      if (signal.aborted) return
      setBudget(next)
      setBudgetError(null)
    } catch (error) {
      if (signal.aborted) return
      setBudgetError(messageFor(error))
    } finally {
      if (!signal.aborted) setBudgetLoading(false)
    }
  }

  function refresh(): void {
    loadRef.current?.abort()
    const controller = new AbortController()
    loadRef.current = controller
    void Promise.all([
      loadExpenses(controller.signal),
      loadSummary(controller.signal),
      loadBudget(controller.signal),
    ])
  }

  async function saveBudget(payload: BudgetUpdate): Promise<boolean> {
    saveRef.current?.abort()
    const controller = new AbortController()
    saveRef.current = controller
    const { signal } = controller

    setBudgetSaving(true)
    setBudgetSaveError(null)
    try {
      const saved = await updateBudget(payload, signal)
      if (signal.aborted) return false
      setBudget(saved)
      setBudgetError(null)

      // Every figure the strip derives from the budget — the remainder, the
      // percentage, the over-budget flag — is computed server-side, so the
      // saved targets alone are not enough to update it. Re-read the summary
      // before reporting success, or the strip shows the old percentage
      // against the new budget.
      await loadSummary(signal)
      return true
    } catch (error) {
      if (signal.aborted) return false
      setBudgetSaveError(messageFor(error))
      return false
    } finally {
      if (!signal.aborted) setBudgetSaving(false)
    }
  }

  useEffect(() => {
    refresh()
    return () => {
      loadRef.current?.abort()
      saveRef.current?.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    expenses,
    expensesLoading,
    expensesError,
    summary,
    summaryLoading,
    summaryError,
    budget,
    budgetLoading,
    budgetError,
    loading: expensesLoading || summaryLoading || budgetLoading,
    budgetSaving,
    budgetSaveError,
    refresh,
    saveBudget,
  }
}
