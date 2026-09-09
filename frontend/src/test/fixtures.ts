/** Shared test data. Amounts are strings here for the same reason they are in
 * production code — see src/types/money.ts. */
import type { Budget, BudgetSummary, Expense } from '../types'

export function anExpense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: 'exp-1',
    description: 'Kitchen worktop',
    amount: '1234.50',
    category: 'materials',
    payment_method: 'bank_transfer',
    payee: 'Stone & Co',
    incurred_on: '2026-09-01',
    status: 'paid',
    room: 'Kitchen',
    invoice_reference: 'INV-42',
    notes: null,
    created_at: '2026-09-01T10:00:00Z',
    updated_at: '2026-09-01T10:00:00Z',
    ...overrides,
  }
}

export function aBudget(overrides: Partial<Budget> = {}): Budget {
  return {
    planned_budget: '50000.00',
    purchase_price: '180000.00',
    target_sale_price: '260000.00',
    updated_at: '2026-09-01T10:00:00Z',
    ...overrides,
  }
}

export function aSummary(overrides: Partial<BudgetSummary> = {}): BudgetSummary {
  return {
    currency: 'EUR',
    target_sale_price: '260000.00',
    purchase_price: '180000.00',
    planned_budget: '50000.00',
    total_paid: '1234.50',
    total_committed: '1234.50',
    total_planned: '0.00',
    total_forecast: '1234.50',
    remaining_budget: '48765.50',
    budget_used_percent: 2.47,
    over_budget: false,
    projected_profit: '78765.50',
    expense_count: 1,
    by_category: [{ category: 'materials', amount: '1234.50' }],
    ...overrides,
  }
}
