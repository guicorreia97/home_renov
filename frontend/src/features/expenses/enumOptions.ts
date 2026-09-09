import { EXPENSE_CATEGORIES, EXPENSE_STATUSES, PAYMENT_METHODS } from '../../types'
import { formatEnumLabel } from '../../lib/format'
import type { SelectOption } from '../../components/SelectField'

/**
 * Select options built from the exact union members the backend accepts —
 * never retyped as string literals, so a new enum member shows up here for
 * free instead of silently being unselectable.
 */
export const categoryOptions: SelectOption[] = EXPENSE_CATEGORIES.map((value) => ({
  value,
  label: formatEnumLabel(value),
}))

export const paymentMethodOptions: SelectOption[] = PAYMENT_METHODS.map((value) => ({
  value,
  label: formatEnumLabel(value),
}))

export const statusOptions: SelectOption[] = EXPENSE_STATUSES.map((value) => ({
  value,
  label: formatEnumLabel(value),
}))
