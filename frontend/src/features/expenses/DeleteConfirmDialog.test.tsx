import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { anExpense } from '../../test/fixtures'
import { renderWithLocale } from '../../test/renderWithLocale'
import { apiCalls, stubApi } from '../../test/setup'
import { DeleteConfirmDialog } from './DeleteConfirmDialog'

function renderDialog(expense = anExpense()) {
  const onClose = vi.fn()
  const onDeleted = vi.fn()
  const { t } = renderWithLocale(
    <DeleteConfirmDialog expense={expense} onClose={onClose} onDeleted={onDeleted} />,
  )
  return { onClose, onDeleted, expense, t }
}

describe('DeleteConfirmDialog', () => {
  it('names the expense being deleted and warns that it is final', () => {
    const { t } = renderDialog()

    expect(screen.getByRole('dialog')).toHaveAccessibleName(t('expense.delete.title'))
    expect(screen.getByText(/Kitchen worktop/)).toBeInTheDocument()
    expect(
      screen.getByText(t('expense.delete.confirm', { description: 'Kitchen worktop', payee: 'Stone & Co' })),
    ).toBeInTheDocument()
  })

  it('deletes nothing until the confirm button is pressed', () => {
    renderDialog()

    expect(apiCalls).toHaveLength(0)
  })

  it('sends the DELETE and reports the removed id on confirm', async () => {
    stubApi({ 'DELETE /expenses/exp-1': { status: 204 } })
    const { onDeleted, t } = renderDialog()

    await userEvent.click(screen.getByRole('button', { name: t('expense.delete.title') }))

    await waitFor(() => expect(onDeleted).toHaveBeenCalledWith('exp-1'))
    expect(apiCalls).toEqual([{ method: 'DELETE', path: '/expenses/exp-1', body: undefined }])
  })

  it('closes without deleting when cancelled', async () => {
    const { onClose, onDeleted, t } = renderDialog()

    await userEvent.click(screen.getByRole('button', { name: t('expense.action.cancel') }))

    expect(onClose).toHaveBeenCalledOnce()
    expect(onDeleted).not.toHaveBeenCalled()
    expect(apiCalls).toHaveLength(0)
  })

  it('keeps the dialog open and shows a server failure, never the raw backend detail', async () => {
    stubApi({ 'DELETE /expenses/exp-1': { status: 409, body: { detail: 'Expense is locked' } } })
    const { onDeleted, t } = renderDialog()

    await userEvent.click(screen.getByRole('button', { name: t('expense.delete.title') }))

    expect(await screen.findByText(t('expense.error.server'))).toBeInTheDocument()
    expect(screen.queryByText('Expense is locked')).not.toBeInTheDocument()
    expect(onDeleted).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('re-enables the confirm button after a failure so the user can retry', async () => {
    stubApi({ 'DELETE /expenses/exp-1': { status: 500, body: { detail: 'boom' } } })
    const { t } = renderDialog()

    await userEvent.click(screen.getByRole('button', { name: t('expense.delete.title') }))

    await waitFor(() =>
      expect(screen.getByRole('button', { name: t('expense.delete.title') })).toBeEnabled(),
    )
  })

  it('uses the destructive variant for the confirm, not the accent', () => {
    const { t } = renderDialog()

    const confirm = screen.getByRole('button', { name: t('expense.delete.title') })
    expect(confirm.className).toContain('bg-danger')
    expect(confirm.className).not.toContain('bg-accent')
  })

  it('renders the title and confirmation entirely in Portuguese', () => {
    const { t } = renderWithLocale(
      <DeleteConfirmDialog expense={anExpense()} onClose={vi.fn()} onDeleted={vi.fn()} />,
      'pt-PT',
    )

    expect(screen.getByRole('dialog')).toHaveAccessibleName(t('expense.delete.title'))
    expect(
      screen.getByText(t('expense.delete.confirm', { description: 'Kitchen worktop', payee: 'Stone & Co' })),
    ).toBeInTheDocument()
  })
})
