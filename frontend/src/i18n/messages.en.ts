/**
 * The English message catalogue — the source of truth for every key.
 *
 * `en` is declared `as const` so `MessageKey` is the exact literal union of
 * every key here, not `string`. `messages.pt.ts` is typed against
 * `Record<MessageKey, string>`, which makes a key present in one catalogue and
 * missing from the other a compile error (see design.md, decision 2).
 *
 * Flat dotted keys, not nested objects — an orphaned key is one `grep` away.
 * See design.md, decision 3. Namespaces: `app.*` (the shell), `expenses.*`
 * (the screen, table, filters), `expense.*` (one expense: its form, its
 * enum labels, its delete dialog, its validation), `budget.*` (the summary
 * strip, the settings modal, its validation).
 */
export const en = {
  // --- app.* — the shell ----------------------------------------------------
  'app.name': 'home_renov',
  'app.language': 'Language',
  'app.language.en': 'English',
  'app.language.pt-PT': 'Português',
  'app.connection.checking': 'Checking…',
  'app.connection.title': 'Backend connection',
  'app.connection.failed.network': 'Could not reach the API. Is the backend running?',
  'app.connection.failed.server': 'The API returned an unexpected error.',
  // `{command}` is replaced with `make run`, rendered as <code> — see App.tsx.
  'app.connection.startHint': 'Start the API with {command} from the repo root, then reload.',

  // --- expenses.* — the screen, its table, its filters ----------------------
  'expenses.title': 'Expenses',
  'expenses.add': 'Add expense',
  'expenses.table.header.description': 'Description',
  'expenses.table.header.category': 'Category',
  'expenses.table.header.payee': 'Payee',
  'expenses.table.header.incurredOn': 'Incurred on',
  'expenses.table.header.status': 'Status',
  'expenses.table.header.amount': 'Amount',
  'expenses.table.loading': 'Loading expenses…',
  'expenses.table.retry': 'Try again',
  'expenses.table.empty': 'No expenses recorded yet. Add the first one to start tracking spend.',
  'expenses.table.emptyFiltered':
    'No expenses match the current filters. Try widening the status or category filter.',
  'expenses.filter.allStatuses': 'All statuses',
  'expenses.filter.allCategories': 'All categories',
  'expenses.error.network': 'Could not reach the API.',
  'expenses.error.server': 'The API returned an unexpected error.',

  // --- expense.* — one expense: form, delete dialog, validation -------------
  'expense.field.description': 'Description',
  'expense.field.amount': 'Amount',
  'expense.field.incurredOn': 'Incurred on',
  'expense.field.payee': 'Payee',
  'expense.field.category': 'Category',
  'expense.field.paymentMethod': 'Payment method',
  'expense.field.status': 'Status',
  'expense.field.room': 'Room (optional)',
  'expense.field.invoiceReference': 'Invoice reference (optional)',
  'expense.field.notes': 'Notes (optional)',
  'expense.action.cancel': 'Cancel',
  'expense.action.edit': 'Edit',
  'expense.action.delete': 'Delete',
  'expense.action.editNamed': 'Edit {description}',
  'expense.action.deleteNamed': 'Delete {description}',
  'expense.form.saving': 'Saving…',
  'expense.form.editTitle': 'Edit expense',
  'expense.form.saveChanges': 'Save changes',
  'expense.error.network': 'Could not reach the API.',
  'expense.error.server': 'The API returned an unexpected error.',
  'expense.error.descriptionLength': 'Description must be 1–200 characters.',
  'expense.error.payeeLength': 'Payee must be 1–120 characters.',
  'expense.error.amountInvalid': 'Amount must be a positive number, e.g. 250 or 250.50.',
  'expense.error.dateRequired': 'Enter the date the expense was incurred.',
  'expense.error.roomLength': 'Room must be 80 characters or fewer.',
  'expense.error.invoiceReferenceLength': 'Invoice reference must be 80 characters or fewer.',
  'expense.error.notesLength': 'Notes must be 1000 characters or fewer.',
  'expense.delete.title': 'Delete expense',
  'expense.delete.confirm': 'Delete “{description}” for {payee}? This cannot be undone.',
  'expense.delete.deleting': 'Deleting…',

  // Expense category labels — one per ExpenseCategory member
  // (frontend/src/types/expense.ts). Copy matches the pre-i18n English
  // rendering verbatim so the existing suite's assertions keep passing.
  'expense.category.materials': 'Materials',
  'expense.category.labour': 'Labour',
  'expense.category.appliances': 'Appliances',
  'expense.category.furniture_and_fixtures': 'Furniture and fixtures',
  'expense.category.tools_and_equipment': 'Tools and equipment',
  'expense.category.permits_and_fees': 'Permits and fees',
  'expense.category.design_and_professional': 'Design and professional',
  'expense.category.transport_and_delivery': 'Transport and delivery',
  'expense.category.waste_disposal': 'Waste disposal',
  'expense.category.utilities': 'Utilities',
  'expense.category.other': 'Other',

  // Payment method labels — one per PaymentMethod member.
  'expense.paymentMethod.cash': 'Cash',
  'expense.paymentMethod.bank_transfer': 'Bank transfer',
  'expense.paymentMethod.debit_card': 'Debit card',
  'expense.paymentMethod.credit_card': 'Credit card',
  'expense.paymentMethod.direct_debit': 'Direct debit',
  'expense.paymentMethod.financing': 'Financing',
  'expense.paymentMethod.other': 'Other',

  // Expense status labels — one per ExpenseStatus member.
  'expense.status.planned': 'Planned',
  'expense.status.pending': 'Pending',
  'expense.status.paid': 'Paid',

  // --- budget.* — the summary strip, the settings modal, validation ---------
  'budget.field.plannedBudget': 'Planned budget',
  'budget.field.purchasePrice': 'Purchase price',
  'budget.field.targetSalePrice': 'Target sale price',
  'budget.summary.label': 'Budget summary',
  'budget.summary.title': 'Budget',
  'budget.summary.edit': 'Edit budget',
  'budget.summary.loadingTargets': 'Loading budget…',
  'budget.summary.loadingSummary': 'Loading summary…',
  'budget.summary.targetsHeading': 'Targets',
  'budget.summary.spendHeading': 'Spend',
  // `{action}` is the `budget.summary.edit` caption, so the sentence cannot
  // drift from the button it names.
  'budget.summary.emptyState':
    'No budget is set yet. Use "{action}" above to set a planned budget and track spend against it.',
  'budget.summary.expensesRecorded': 'Expenses recorded',
  'budget.summary.totalPaid': 'Total paid',
  'budget.summary.totalCommitted': 'Total committed',
  'budget.summary.totalForecast': 'Total forecast',
  'budget.summary.projectedProfit': 'Projected profit',
  'budget.summary.remaining': 'Remaining budget',
  'budget.summary.overBudget': 'Over budget by',
  // `{percent}` arrives already formatted by `formatPercent` — the `%` sign
  // and its placement come from Intl, never from this string.
  'budget.remaining.percentUsed': '{percent} of budget used',
  'budget.settings.title': 'Budget settings',
  'budget.settings.clearHint': 'Leave blank to clear the target.',
  'budget.action.cancel': 'Cancel',
  'budget.action.save': 'Save budget',
  'budget.action.saving': 'Saving…',
  'budget.error.network': 'Could not reach the API.',
  'budget.error.server': 'The API returned an unexpected error.',
  'budget.error.notANumber': '{field} must be a non-negative number, e.g. 45000 or 45000.50.',
  'budget.error.tooLarge': '{field} is too large.',
} as const

export type MessageKey = keyof typeof en
