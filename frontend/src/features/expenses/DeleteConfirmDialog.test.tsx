import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { anExpense } from '../../test/fixtures'
import { apiCalls, stubApi } from '../../test/setup'
import { DeleteConfirmDialog } from './DeleteConfirmDialog'

function renderDialog(expense = anExpense()) {
  const onClose = vi.fn()
  const onDeleted = vi.fn()
  render(<DeleteConfirmDialog expense={expense} onClose={onClose} onDeleted={onDeleted} />)
  return { onClose, onDeleted, expense }
}

describe('DeleteConfirmDialog', () => {
  it('names the expense being deleted and warns that it is final', () => {
    renderDialog()

    expect(screen.getByRole('dialog')).toHaveAccessibleName('Delete expense')
    expect(screen.getByText(/Kitchen worktop/)).toBeInTheDocument()
    expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument()
  })

  it('deletes nothing until the confirm button is pressed', () => {
    renderDialog()

    expect(apiCalls).toHaveLength(0)
  })

  it('sends the DELETE and reports the removed id on confirm', async () => {
    stubApi({ 'DELETE /expenses/exp-1': { status: 204 } })
    const { onDeleted } = renderDialog()

    await userEvent.click(screen.getByRole('button', { name: 'Delete expense' }))

    await waitFor(() => expect(onDeleted).toHaveBeenCalledWith('exp-1'))
    expect(apiCalls).toEqual([{ method: 'DELETE', path: '/expenses/exp-1', body: undefined }])
  })

  it('closes without deleting when cancelled', async () => {
    const { onClose, onDeleted } = renderDialog()

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onClose).toHaveBeenCalledOnce()
    expect(onDeleted).not.toHaveBeenCalled()
    expect(apiCalls).toHaveLength(0)
  })

  it('keeps the dialog open and explains a failed delete', async () => {
    stubApi({ 'DELETE /expenses/exp-1': { status: 409, body: { detail: 'Expense is locked' } } })
    const { onDeleted } = renderDialog()

    await userEvent.click(screen.getByRole('button', { name: 'Delete expense' }))

    expect(await screen.findByText('Expense is locked')).toBeInTheDocument()
    expect(onDeleted).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('re-enables the confirm button after a failure so the user can retry', async () => {
    stubApi({ 'DELETE /expenses/exp-1': { status: 500, body: { detail: 'boom' } } })
    renderDialog()

    await userEvent.click(screen.getByRole('button', { name: 'Delete expense' }))

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Delete expense' })).toBeEnabled(),
    )
  })

  it('uses the destructive variant for the confirm, not the accent', () => {
    renderDialog()

    const confirm = screen.getByRole('button', { name: 'Delete expense' })
    expect(confirm.className).toContain('bg-danger')
    expect(confirm.className).not.toContain('bg-accent')
  })
})
