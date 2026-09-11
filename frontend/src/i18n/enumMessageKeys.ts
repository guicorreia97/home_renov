import type { ExpenseCategory, ExpenseStatus, PaymentMethod } from '../types'
import type { MessageKey } from './messages.en'

/**
 * Compile-time guarantee that every backend enum member has a catalogue key.
 *
 * `AssertKeysExist<T, U>` declares its first type parameter with an
 * `extends U` constraint, so instantiating it only type-checks when every
 * member of `T` is assignable to `U`. Adding a member to `ExpenseCategory`,
 * `PaymentMethod` or `ExpenseStatus` without adding the matching
 * `expense.category.<value>` / `expense.paymentMethod.<value>` /
 * `expense.status.<value>` key to `messages.en.ts` makes the corresponding
 * assertion below fail `npm run typecheck`, naming the missing literal in the
 * reported error — see design.md, decision 7.
 */
type AssertKeysExist<T extends U, U> = T

export type CategoryMessageKey = `expense.category.${ExpenseCategory}`
export type PaymentMethodMessageKey = `expense.paymentMethod.${PaymentMethod}`
export type StatusMessageKey = `expense.status.${ExpenseStatus}`

export type AssertCategoryKeysExist = AssertKeysExist<CategoryMessageKey, MessageKey>
export type AssertPaymentMethodKeysExist = AssertKeysExist<PaymentMethodMessageKey, MessageKey>
export type AssertStatusKeysExist = AssertKeysExist<StatusMessageKey, MessageKey>
