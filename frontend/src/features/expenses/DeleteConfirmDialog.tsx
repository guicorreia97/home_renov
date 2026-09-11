import { useState } from 'react'
import { Modal } from '../../components/Modal'
import { Button } from '../../components/Button'
import { deleteExpense } from '../../api'
import { useTranslation } from '../../i18n'
import { classifyFailure, type FailureKind } from '../../lib/apiFailure'
import type { Expense } from '../../types'

export interface DeleteConfirmDialogProps {
  expense: Expense
  onClose: () => void
  onDeleted: (id: string) => void
}

/** Deletion is irreversible and there is no undo — this is the one confirmation step. */
export function DeleteConfirmDialog({ expense, onClose, onDeleted }: DeleteConfirmDialogProps) {
  const { t } = useTranslation()
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<FailureKind | null>(null)

  async function handleConfirm(): Promise<void> {
    setDeleting(true)
    setError(null)
    try {
      await deleteExpense(expense.id)
      onDeleted(expense.id)
    } catch (err) {
      setError(classifyFailure(err))
      setDeleting(false)
    }
  }

  return (
    <Modal title={t('expense.delete.title')} onClose={onClose}>
      <p className="text-body text-text">
        {t('expense.delete.confirm', { description: expense.description, payee: expense.payee })}
      </p>
      {error && (
        <p className="mt-4 text-body text-danger">
          {t(error === 'network' ? 'expense.error.network' : 'expense.error.server')}
        </p>
      )}
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose} disabled={deleting}>
          {t('expense.action.cancel')}
        </Button>
        <Button variant="destructive" onClick={() => void handleConfirm()} disabled={deleting}>
          {deleting ? t('expense.delete.deleting') : t('expense.delete.title')}
        </Button>
      </div>
    </Modal>
  )
}
