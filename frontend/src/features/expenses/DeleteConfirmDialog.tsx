import { useState } from 'react'
import { Modal } from '../../components/Modal'
import { Button } from '../../components/Button'
import { ApiError, deleteExpense } from '../../api'
import type { Expense } from '../../types'

export interface DeleteConfirmDialogProps {
  expense: Expense
  onClose: () => void
  onDeleted: (id: string) => void
}

/** Deletion is irreversible and there is no undo — this is the one confirmation step. */
export function DeleteConfirmDialog({ expense, onClose, onDeleted }: DeleteConfirmDialogProps) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm(): Promise<void> {
    setDeleting(true)
    setError(null)
    try {
      await deleteExpense(expense.id)
      onDeleted(expense.id)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete the expense.')
      setDeleting(false)
    }
  }

  return (
    <Modal title="Delete expense" onClose={onClose}>
      <p className="text-body text-text">
        Delete “{expense.description}” for {expense.payee}? This cannot be undone.
      </p>
      {error && <p className="mt-4 text-body text-danger">{error}</p>}
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose} disabled={deleting}>
          Cancel
        </Button>
        <Button variant="destructive" onClick={() => void handleConfirm()} disabled={deleting}>
          {deleting ? 'Deleting…' : 'Delete expense'}
        </Button>
      </div>
    </Modal>
  )
}
