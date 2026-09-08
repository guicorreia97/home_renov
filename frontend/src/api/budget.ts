import type { Budget, BudgetSummary, BudgetUpdate } from '../types'
import { request } from './client'

/** The single budget. Created empty by the backend on first read. */
export function getBudget(signal?: AbortSignal): Promise<Budget> {
  return request<Budget>('/budget', { signal })
}

/** Partial update of the financial targets. */
export function updateBudget(payload: BudgetUpdate, signal?: AbortSignal): Promise<Budget> {
  return request<Budget>('/budget', { method: 'PUT', body: payload, signal })
}

/**
 * Targets and actuals in one call. Always prefer this to computing totals from
 * the expense list — the server does the arithmetic on exact decimals.
 */
export function getBudgetSummary(signal?: AbortSignal): Promise<BudgetSummary> {
  return request<BudgetSummary>('/budget/summary', { signal })
}
