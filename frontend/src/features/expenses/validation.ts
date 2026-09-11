import { describe } from '../../i18n'
import type { Budget, BudgetUpdate, Expense, ExpenseCreate, ExpenseUpdate } from '../../types'
import {
  BUDGET_FIELD_KEYS,
  type BudgetFormErrors,
  type BudgetFormValues,
  type ExpenseFormErrors,
  type ExpenseFormValues,
} from './formTypes'

/** Matches backend `PositiveMoney`: a positive decimal with up to 2 places. */
const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/

/**
 * Mirrors backend/app/src/models/expense.py exactly, so the user sees an inline
 * message instead of a 422 round trip.
 *
 * Returns a descriptor per invalid field, not a translated string — see the
 * rule "never store a translated string in state" (design.md, decision 4 and
 * the frontend-i18n spec). The component translates at render.
 */
export function validateExpenseForm(values: ExpenseFormValues): ExpenseFormErrors {
  const errors: ExpenseFormErrors = {}

  const description = values.description.trim()
  if (description.length < 1 || description.length > 200) {
    errors.description = describe('expense.error.descriptionLength')
  }

  const payee = values.payee.trim()
  if (payee.length < 1 || payee.length > 120) {
    errors.payee = describe('expense.error.payeeLength')
  }

  // Positivity is checked on the string, not via Number(): the pattern already
  // rules out a sign and >2 decimals, so the only non-positive values it can
  // match are the zero forms ("0", "0.0", "0.00"). Keeping this off the float
  // path means no amount is ever converted to a number outside formatMoney.
  const amount = values.amount.trim()
  const isZero = /^0+(\.0{1,2})?$/.test(amount)
  if (!AMOUNT_PATTERN.test(amount) || isZero) {
    errors.amount = describe('expense.error.amountInvalid')
  }

  if (!values.incurred_on) {
    errors.incurred_on = describe('expense.error.dateRequired')
  }

  if (values.room.trim().length > 80) {
    errors.room = describe('expense.error.roomLength')
  }

  if (values.invoice_reference.trim().length > 80) {
    errors.invoice_reference = describe('expense.error.invoiceReferenceLength')
  }

  if (values.notes.trim().length > 1000) {
    errors.notes = describe('expense.error.notesLength')
  }

  return errors
}

export function hasErrors(errors: ExpenseFormErrors): boolean {
  return Object.keys(errors).length > 0
}

/** Empty string means "not set" for nullable fields; the backend expects `null`. */
function nullableString(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function toCreatePayload(values: ExpenseFormValues): ExpenseCreate {
  return {
    description: values.description.trim(),
    amount: values.amount.trim(),
    category: values.category,
    payment_method: values.payment_method,
    payee: values.payee.trim(),
    incurred_on: values.incurred_on,
    status: values.status,
    room: nullableString(values.room),
    invoice_reference: nullableString(values.invoice_reference),
    notes: nullableString(values.notes),
  }
}

/** Only the fields that actually changed — PATCH rejects a wholly empty body. */
export function toUpdatePayload(values: ExpenseFormValues, original: Expense): ExpenseUpdate {
  const next = toCreatePayload(values)
  const update: ExpenseUpdate = {}

  if (next.description !== original.description) update.description = next.description
  if (next.amount !== original.amount) update.amount = next.amount
  if (next.category !== original.category) update.category = next.category
  if (next.payment_method !== original.payment_method) update.payment_method = next.payment_method
  if (next.payee !== original.payee) update.payee = next.payee
  if (next.incurred_on !== original.incurred_on) update.incurred_on = next.incurred_on
  if (next.status !== original.status) update.status = next.status
  if (next.room !== original.room) update.room = next.room
  if (next.invoice_reference !== original.invoice_reference)
    update.invoice_reference = next.invoice_reference
  if (next.notes !== original.notes) update.notes = next.notes

  return update
}

export function formValuesFromExpense(expense: Expense): ExpenseFormValues {
  return {
    description: expense.description,
    amount: expense.amount,
    category: expense.category,
    payment_method: expense.payment_method,
    payee: expense.payee,
    incurred_on: expense.incurred_on,
    status: expense.status,
    room: expense.room ?? '',
    invoice_reference: expense.invoice_reference ?? '',
    notes: expense.notes ?? '',
  }
}

// --- Budget form -----------------------------------------------------------

/**
 * Matches backend `Money` (`ge=0`): a non-negative decimal with up to 2 places.
 * Unlike an expense amount, which is `PositiveMoney`, zero is a legitimate
 * budget target — "I plan to spend nothing on this" is a real answer.
 */
const MONEY_PATTERN = /^\d+(\.\d{1,2})?$/

/**
 * Backend `Money` caps the Decimal at `max_digits=12`. After quantising to two
 * places that leaves ten digits before the point, so 9_999_999_999.99 is the
 * largest amount the API will accept.
 */
const MAX_INTEGER_DIGITS = 10

const BUDGET_FIELDS: (keyof BudgetFormValues)[] = [
  'planned_budget',
  'purchase_price',
  'target_sale_price',
]

/**
 * Mirrors backend/app/src/models/budget.py, so the user sees an inline message
 * instead of a 422 round trip.
 *
 * An empty field is valid: it clears the target. Validation works on the string
 * throughout — no amount is parsed into a number here (see types/money.ts).
 *
 * The field name is interpolated by *key*, not by translated text —
 * `describe('budget.error.notANumber', { field: { key: BUDGET_FIELD_KEYS[field] } })`
 * — so the whole sentence (subject and all) comes from one catalogue message
 * per language rather than being built by prefixing a translated label
 * (design.md, decision 4). `BUDGET_FIELD_KEYS` is shared with the settings
 * modal, which uses the same keys as its `TextField` labels.
 */
export function validateBudgetForm(values: BudgetFormValues): BudgetFormErrors {
  const errors: BudgetFormErrors = {}

  for (const field of BUDGET_FIELDS) {
    const raw = values[field].trim()
    if (raw.length === 0) continue

    const fieldParam = { field: { key: BUDGET_FIELD_KEYS[field] } }
    if (!MONEY_PATTERN.test(raw)) {
      errors[field] = describe('budget.error.notANumber', fieldParam)
      continue
    }

    const [whole] = raw.split('.')
    if (whole.replace(/^0+(?=\d)/, '').length > MAX_INTEGER_DIGITS) {
      errors[field] = describe('budget.error.tooLarge', fieldParam)
    }
  }

  return errors
}

export function hasBudgetErrors(errors: BudgetFormErrors): boolean {
  return Object.keys(errors).length > 0
}

/**
 * Every field is sent on every save, including the cleared ones: `PUT /budget`
 * replaces the targets, so omitting a field the user just emptied would leave
 * the old value in place.
 */
export function toBudgetPayload(values: BudgetFormValues): BudgetUpdate {
  return {
    planned_budget: nullableString(values.planned_budget),
    purchase_price: nullableString(values.purchase_price),
    target_sale_price: nullableString(values.target_sale_price),
  }
}

export function budgetFormValuesFromBudget(budget: Budget | null): BudgetFormValues {
  return {
    planned_budget: budget?.planned_budget ?? '',
    purchase_price: budget?.purchase_price ?? '',
    target_sale_price: budget?.target_sale_price ?? '',
  }
}
