import type { SelectOption } from '../../components/SelectField'
import type { TranslateFn } from '../../i18n'
import { EXPENSE_CATEGORIES, EXPENSE_STATUSES, PAYMENT_METHODS } from '../../types'

/**
 * Select options built from the exact union members the backend accepts, with
 * labels looked up in the active catalogue via `t` — never manufactured from
 * the value's own spelling, which was English-by-construction and has been
 * deleted. `value` stays the machine value; only `label` is localised — see
 * the frontend-i18n spec, "the wire value does not change".
 *
 * A backend enum member without a matching `expense.*.<value>` catalogue key
 * fails `npm run typecheck` — see `i18n/enumMessageKeys.ts`.
 */
export function categoryOptions(t: TranslateFn): SelectOption[] {
  return EXPENSE_CATEGORIES.map((value) => ({
    value,
    label: t(`expense.category.${value}`),
  }))
}

export function paymentMethodOptions(t: TranslateFn): SelectOption[] {
  return PAYMENT_METHODS.map((value) => ({
    value,
    label: t(`expense.paymentMethod.${value}`),
  }))
}

export function statusOptions(t: TranslateFn): SelectOption[] {
  return EXPENSE_STATUSES.map((value) => ({
    value,
    label: t(`expense.status.${value}`),
  }))
}
