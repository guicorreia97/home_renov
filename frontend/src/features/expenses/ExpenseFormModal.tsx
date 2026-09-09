import { useState } from 'react'
import { Modal } from '../../components/Modal'
import { ApiError, createExpense, updateExpense } from '../../api'
import type { Expense } from '../../types'
import { ExpenseForm } from './ExpenseForm'
import type { ExpenseFormValues } from './formTypes'
import { toCreatePayload, toUpdatePayload } from './validation'

export interface ExpenseFormModalProps {
  /** `null` starts a new expense; an `Expense` edits it in place. */
  editing: Expense | null
  initialValues: ExpenseFormValues
  onClose: () => void
  onSaved: (expense: Expense) => void
}

/** Owns the create/edit request lifecycle around the shared form fields. */
export function ExpenseFormModal({
  editing,
  initialValues,
  onClose,
  onSaved,
}: ExpenseFormModalProps) {
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  async function handleSubmit(values: ExpenseFormValues): Promise<void> {
    if (editing) {
      const patch = toUpdatePayload(values, editing)
      if (Object.keys(patch).length === 0) {
        // Nothing changed — the backend would 400 on an empty PATCH body.
        onSaved(editing)
        return
      }
    }

    setSubmitting(true)
    setSubmitError(null)
    try {
      const saved = editing
        ? await updateExpense(editing.id, toUpdatePayload(values, editing))
        : await createExpense(toCreatePayload(values))
      onSaved(saved)
    } catch (error) {
      setSubmitError(error instanceof ApiError ? error.message : 'Could not save the expense.')
      setSubmitting(false)
    }
  }

  return (
    <Modal title={editing ? 'Edit expense' : 'Add expense'} onClose={onClose}>
      <ExpenseForm
        initialValues={initialValues}
        submitLabel={editing ? 'Save changes' : 'Add expense'}
        submitting={submitting}
        submitError={submitError}
        onSubmit={(values) => void handleSubmit(values)}
        onCancel={onClose}
      />
    </Modal>
  )
}
