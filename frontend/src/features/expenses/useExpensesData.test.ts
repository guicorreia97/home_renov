import { act, renderHook, waitFor } from '@testing-library/react'
import { aBudget, aSummary, anExpense } from '../../test/fixtures'
import { apiCalls, stubApi, stubNetworkFailure } from '../../test/setup'
import { useExpensesData } from './useExpensesData'

function stubHappyPath(): void {
  stubApi({
    'GET /expenses': { body: [anExpense()] },
    'GET /budget': { body: aBudget() },
    'GET /budget/summary': { body: aSummary() },
  })
}

describe('useExpensesData on mount', () => {
  it('loads expenses, budget and summary together', async () => {
    stubHappyPath()

    const { result } = renderHook(() => useExpensesData())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.expenses).toHaveLength(1)
    expect(result.current.budget?.planned_budget).toBe('50000.00')
    expect(result.current.summary?.remaining_budget).toBe('48765.50')
    expect(result.current.expensesError).toBeNull()
  })

  it('sorts expenses newest first', async () => {
    stubApi({
      'GET /expenses': {
        body: [
          anExpense({ id: 'old', incurred_on: '2026-01-01' }),
          anExpense({ id: 'new', incurred_on: '2026-09-01' }),
        ],
      },
      'GET /budget': { body: aBudget() },
      'GET /budget/summary': { body: aSummary() },
    })

    const { result } = renderHook(() => useExpensesData())

    await waitFor(() => expect(result.current.expenses).toHaveLength(2))
    expect(result.current.expenses?.map((expense) => expense.id)).toEqual(['new', 'old'])
  })

  it('keeps the table usable when only the summary fails', async () => {
    stubApi({
      'GET /expenses': { body: [anExpense()] },
      'GET /budget': { body: aBudget() },
      'GET /budget/summary': { status: 500, body: { detail: 'Summary exploded' } },
    })

    const { result } = renderHook(() => useExpensesData())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.summaryError).toBe('server')
    expect(result.current.expenses).toHaveLength(1)
    expect(result.current.expensesError).toBeNull()
  })

  it('reports an unreachable backend as a readable message', async () => {
    stubApi({
      'GET /expenses': { status: 503, body: { detail: 'Service unavailable' } },
      'GET /budget': { body: aBudget() },
      'GET /budget/summary': { body: aSummary() },
    })

    const { result } = renderHook(() => useExpensesData())

    await waitFor(() => expect(result.current.expensesError).toBe('server'))
    expect(result.current.expenses).toBeNull()
  })

  it('reports a request that never reached the API as a network failure, distinct from a server one', async () => {
    stubApi({
      'GET /expenses': { body: [] },
      'GET /budget': { body: aBudget() },
      'GET /budget/summary': { body: aSummary() },
    })
    stubNetworkFailure()

    const { result } = renderHook(() => useExpensesData())

    await waitFor(() => expect(result.current.expensesError).toBe('network'))
  })
})

describe('useExpensesData refresh', () => {
  it('re-reads the list so a new expense appears', async () => {
    stubApi({
      'GET /expenses': [{ body: [] }, { body: [anExpense()] }],
      'GET /budget': { body: aBudget() },
      'GET /budget/summary': { body: aSummary() },
    })

    const { result } = renderHook(() => useExpensesData())
    await waitFor(() => expect(result.current.expenses).toEqual([]))

    act(() => result.current.refresh())

    await waitFor(() => expect(result.current.expenses).toHaveLength(1))
  })
})

describe('useExpensesData saveBudget', () => {
  it('saves the targets and re-reads the summary, so no stale percentage shows', async () => {
    stubApi({
      'GET /expenses': { body: [anExpense()] },
      'GET /budget': { body: aBudget({ planned_budget: '50000.00' }) },
      'GET /budget/summary': [
        { body: aSummary({ planned_budget: '50000.00', remaining_budget: '48765.50' }) },
        { body: aSummary({ planned_budget: '10000.00', remaining_budget: '8765.50' }) },
      ],
      'PUT /budget': { body: aBudget({ planned_budget: '10000.00' }) },
    })

    const { result } = renderHook(() => useExpensesData())
    await waitFor(() => expect(result.current.loading).toBe(false))

    let saved: boolean | undefined
    await act(async () => {
      saved = await result.current.saveBudget({ planned_budget: '10000.00' })
    })

    expect(saved).toBe(true)
    expect(result.current.budget?.planned_budget).toBe('10000.00')
    expect(result.current.summary?.remaining_budget).toBe('8765.50')
    expect(result.current.budgetSaveError).toBeNull()
    expect(result.current.budgetSaving).toBe(false)
  })

  it('re-reads the summary after the PUT, never before', async () => {
    stubApi({
      'GET /expenses': { body: [anExpense()] },
      'GET /budget': { body: aBudget() },
      'GET /budget/summary': { body: aSummary() },
      'PUT /budget': { body: aBudget() },
    })

    const { result } = renderHook(() => useExpensesData())
    await waitFor(() => expect(result.current.loading).toBe(false))
    apiCalls.length = 0

    await act(async () => {
      await result.current.saveBudget({ planned_budget: '10000.00' })
    })

    expect(apiCalls.map((call) => `${call.method} ${call.path}`)).toEqual([
      'PUT /budget',
      'GET /budget/summary',
    ])
  })

  it('sends the amount as a string, exactly as typed', async () => {
    stubApi({
      'GET /expenses': { body: [anExpense()] },
      'GET /budget': { body: aBudget() },
      'GET /budget/summary': { body: aSummary() },
      'PUT /budget': { body: aBudget() },
    })

    const { result } = renderHook(() => useExpensesData())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.saveBudget({ planned_budget: '1234.50', purchase_price: null })
    })

    const put = apiCalls.find((call) => call.method === 'PUT')
    expect(put?.body).toEqual({ planned_budget: '1234.50', purchase_price: null })
  })

  it('reports a rejected save and leaves the old budget in place', async () => {
    stubApi({
      'GET /expenses': { body: [anExpense()] },
      'GET /budget': { body: aBudget({ planned_budget: '50000.00' }) },
      'GET /budget/summary': { body: aSummary() },
      'PUT /budget': {
        status: 422,
        body: { detail: [{ loc: ['body', 'planned_budget'], msg: 'must be non-negative' }] },
      },
    })

    const { result } = renderHook(() => useExpensesData())
    await waitFor(() => expect(result.current.loading).toBe(false))

    let saved: boolean | undefined
    await act(async () => {
      saved = await result.current.saveBudget({ planned_budget: '-1' })
    })

    expect(saved).toBe(false)
    expect(result.current.budgetSaveError).toBe('server')
    expect(result.current.budget?.planned_budget).toBe('50000.00')
    expect(result.current.budgetSaving).toBe(false)
  })

  it('does not re-read the summary when the save failed', async () => {
    stubApi({
      'GET /expenses': { body: [anExpense()] },
      'GET /budget': { body: aBudget() },
      'GET /budget/summary': { body: aSummary() },
      'PUT /budget': { status: 500, body: { detail: 'nope' } },
    })

    const { result } = renderHook(() => useExpensesData())
    await waitFor(() => expect(result.current.loading).toBe(false))
    apiCalls.length = 0

    await act(async () => {
      await result.current.saveBudget({ planned_budget: '1' })
    })

    expect(apiCalls.map((call) => call.method)).toEqual(['PUT'])
  })
})
