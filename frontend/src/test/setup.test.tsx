/**
 * Smoke test for the test infrastructure itself. If this file fails, nothing
 * else in the suite can be trusted.
 */
import { render, screen } from '@testing-library/react'
import { ApiError, listExpenses } from '../api'
import { apiCalls, stubApi, stubNetworkFailure } from './setup'

describe('test infrastructure', () => {
  it('renders React into the DOM and applies jest-dom matchers', () => {
    render(<p>workshop at night</p>)

    expect(screen.getByText('workshop at night')).toBeInTheDocument()
  })

  it('provides HTMLDialogElement.showModal, which jsdom does not', () => {
    const dialog = document.createElement('dialog')
    document.body.append(dialog)

    dialog.showModal()

    expect(dialog.open).toBe(true)
    dialog.close()
    expect(dialog.open).toBe(false)
  })

  it('serves stubbed responses to the real API client', async () => {
    stubApi({ 'GET /expenses': { body: [] } })

    await expect(listExpenses()).resolves.toEqual([])
    expect(apiCalls).toEqual([{ method: 'GET', path: '/expenses', body: undefined }])
  })

  it('turns an unreachable backend into an ApiError, not a raw TypeError', async () => {
    stubApi({ 'GET /expenses': { body: [] } })
    stubNetworkFailure()

    const error = await listExpenses().catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).isNetworkError).toBe(true)
  })

  it('walks a queued stub so a refetch sees fresh data', async () => {
    stubApi({ 'GET /expenses': [{ body: [] }, { body: [{ id: 'e1' }] }] })

    await expect(listExpenses()).resolves.toEqual([])
    await expect(listExpenses()).resolves.toEqual([{ id: 'e1' }])
  })
})
