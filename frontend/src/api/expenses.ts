import type { Expense, ExpenseCreate, ExpenseUpdate } from '../types'
import { request } from './client'

export function listExpenses(signal?: AbortSignal): Promise<Expense[]> {
  return request<Expense[]>('/expenses', { signal })
}

export function getExpense(id: string, signal?: AbortSignal): Promise<Expense> {
  return request<Expense>(`/expenses/${encodeURIComponent(id)}`, { signal })
}

export function createExpense(payload: ExpenseCreate, signal?: AbortSignal): Promise<Expense> {
  return request<Expense>('/expenses', { method: 'POST', body: payload, signal })
}

/** Partial update. The backend rejects an empty payload with 400. */
export function updateExpense(
  id: string,
  payload: ExpenseUpdate,
  signal?: AbortSignal,
): Promise<Expense> {
  return request<Expense>(`/expenses/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: payload,
    signal,
  })
}

export function deleteExpense(id: string, signal?: AbortSignal): Promise<void> {
  return request<void>(`/expenses/${encodeURIComponent(id)}`, { method: 'DELETE', signal })
}
