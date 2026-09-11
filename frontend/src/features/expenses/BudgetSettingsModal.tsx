import { useState, type FormEvent } from 'react'
import { Button } from '../../components/Button'
import { Modal } from '../../components/Modal'
import { TextField } from '../../components/TextField'
import { translateDescriptor, useTranslation } from '../../i18n'
import type { FailureKind } from '../../lib/apiFailure'
import type { Budget, BudgetUpdate } from '../../types'
import { BUDGET_FIELD_KEYS, type BudgetFormValues } from './formTypes'
import {
  budgetFormValuesFromBudget,
  hasBudgetErrors,
  toBudgetPayload,
  validateBudgetForm,
} from './validation'

export interface BudgetSettingsModalProps {
  /** Seeds the form. `null` while the budget hasn't loaded yet — fields start empty. */
  budget: Budget | null
  saving: boolean
  saveError: FailureKind | null
  onSave: (payload: BudgetUpdate) => Promise<boolean>
  onClose: () => void
}

/**
 * Edits the three budget targets. An empty field means "not set" and is sent
 * as `null` — never coerced to zero. Closes only once the save actually
 * succeeds; a failed save stays open with the inline error from the API.
 */
export function BudgetSettingsModal({
  budget,
  saving,
  saveError,
  onSave,
  onClose,
}: BudgetSettingsModalProps) {
  const { t } = useTranslation()
  const [values, setValues] = useState<BudgetFormValues>(() => budgetFormValuesFromBudget(budget))
  const [errors, setErrors] = useState(() => validateBudgetForm(values))
  const [touched, setTouched] = useState(false)

  function set<K extends keyof BudgetFormValues>(key: K, value: BudgetFormValues[K]): void {
    setValues((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    setTouched(true)
    const nextErrors = validateBudgetForm(values)
    setErrors(nextErrors)
    if (hasBudgetErrors(nextErrors)) return

    const saved = await onSave(toBudgetPayload(values))
    if (saved) onClose()
  }

  const shown = touched ? errors : {}

  return (
    <Modal title={t('budget.settings.title')} onClose={onClose}>
      <form onSubmit={(e) => void handleSubmit(e)} noValidate>
        <div className="grid gap-4">
          <TextField
            label={t(BUDGET_FIELD_KEYS.planned_budget)}
            inputMode="decimal"
            value={values.planned_budget}
            onChange={(e) => set('planned_budget', e.target.value)}
            error={shown.planned_budget ? translateDescriptor(t, shown.planned_budget) : undefined}
            hint={t('budget.settings.clearHint')}
          />
          <TextField
            label={t(BUDGET_FIELD_KEYS.purchase_price)}
            inputMode="decimal"
            value={values.purchase_price}
            onChange={(e) => set('purchase_price', e.target.value)}
            error={shown.purchase_price ? translateDescriptor(t, shown.purchase_price) : undefined}
            hint={t('budget.settings.clearHint')}
          />
          <TextField
            label={t(BUDGET_FIELD_KEYS.target_sale_price)}
            inputMode="decimal"
            value={values.target_sale_price}
            onChange={(e) => set('target_sale_price', e.target.value)}
            error={shown.target_sale_price ? translateDescriptor(t, shown.target_sale_price) : undefined}
            hint={t('budget.settings.clearHint')}
          />
        </div>

        {saveError && (
          <p className="mt-4 text-body text-danger">
            {t(saveError === 'network' ? 'budget.error.network' : 'budget.error.server')}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            {t('budget.action.cancel')}
          </Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? t('budget.action.saving') : t('budget.action.save')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
