import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect } from 'react'
import { en, pt, translate, useTranslation } from '../../i18n'
import type { Locale, MessageKey, TranslateFn } from '../../i18n'
import { formatDate, formatMoney, formatPercent } from '../../lib/format'
import { aBudget, aSummary, anExpense } from '../../test/fixtures'
import { folded, renderWithLocale } from '../../test/renderWithLocale'
import { apiCalls, stubApi } from '../../test/setup'
import ExpensesScreen from './ExpensesScreen'

const WORKTOP = anExpense({ id: 'exp-1', description: 'Kitchen worktop', amount: '1234.50' })

async function screenReady(t: TranslateFn): Promise<void> {
  await waitFor(() => expect(screen.queryByText(t('expenses.table.loading'))).not.toBeInTheDocument())
}

/**
 * A real user cannot operate the header's language switcher while a modal is
 * open — `Modal` uses `showModal()`, which makes everything behind it inert
 * in a real browser (happy-dom does not enforce that). This drives the same
 * switch the header would, through the provider directly, instead of relying
 * on a click a user could never make.
 */
function LocaleCapture({ onReady }: { onReady: (setLocale: (locale: Locale) => void) => void }) {
  const { setLocale } = useTranslation()
  useEffect(() => {
    onReady(setLocale)
  }, [onReady, setLocale])
  return null
}

describe.each(['en', 'pt-PT'] as const)('ExpensesScreen formatting (%s)', (locale) => {
  it('formats money, dates, the budget percentage and enum labels for the active language', async () => {
    const summary = aSummary({ budget_used_percent: 62.5 })
    stubApi({
      'GET /expenses': { body: [WORKTOP] },
      'GET /budget': { body: aBudget() },
      'GET /budget/summary': { body: summary },
    })

    const { t } = renderWithLocale(<ExpensesScreen />, locale)
    await screenReady(t)

    const row = (await screen.findByText(WORKTOP.description)).closest('tr')!
    expect(within(row).getByText(folded(formatMoney(WORKTOP.amount, summary.currency, locale)))).toBeInTheDocument()
    expect(within(row).getByText(folded(formatDate(WORKTOP.incurred_on, locale)))).toBeInTheDocument()
    expect(within(row).getByText(t(`expense.category.${WORKTOP.category}`))).toBeInTheDocument()
    expect(within(row).getByText(t(`expense.status.${WORKTOP.status}`))).toBeInTheDocument()
    expect(
      screen.getByText(folded(t('budget.remaining.percentUsed', { percent: formatPercent(62.5, locale) }))),
    ).toBeInTheDocument()
  })
})

describe('ExpensesScreen', () => {
  it('walks create → filter → edit → delete with the summary updating at each step', async () => {
    const user = userEvent.setup()
    stubApi({
      // One entry per actual refresh: mount, then after each mutation.
      // Filtering is client-side and re-reads nothing.
      'GET /expenses': [
        { body: [] },
        { body: [WORKTOP] },
        { body: [{ ...WORKTOP, amount: '999.00' }] },
        { body: [] },
      ],
      'GET /budget': { body: aBudget() },
      'GET /budget/summary': [
        { body: aSummary({ expense_count: 0, total_paid: '0.00' }) },
        { body: aSummary({ expense_count: 1, total_paid: '1234.50' }) },
        { body: aSummary({ expense_count: 1, total_paid: '999.00' }) },
        { body: aSummary({ expense_count: 0, total_paid: '0.00' }) },
      ],
      'POST /expenses': { body: WORKTOP },
      'PATCH /expenses/exp-1': { body: { ...WORKTOP, amount: '999.00' } },
      'DELETE /expenses/exp-1': { status: 204 },
    })

    const { t } = renderWithLocale(<ExpensesScreen />)
    await screenReady(t)

    // Empty to begin with.
    expect(screen.getByText(t('expenses.table.empty'))).toBeInTheDocument()

    // --- Create -------------------------------------------------------------
    // Two buttons carry this name in the empty state — the header action and
    // the empty-state CTA. The header one is the page's single accent.
    const [headerAdd] = screen.getAllByRole('button', { name: t('expenses.add') })
    await user.click(headerAdd)
    const createDialog = screen.getByRole('dialog')
    expect(createDialog).toHaveAccessibleName(t('expenses.add'))

    await user.type(within(createDialog).getByLabelText(t('expense.field.description')), 'Kitchen worktop')
    await user.type(within(createDialog).getByLabelText(t('expense.field.amount')), '1234.50')
    await user.type(within(createDialog).getByLabelText(t('expense.field.payee')), 'Stone & Co')
    await user.click(within(createDialog).getByRole('button', { name: t('expenses.add') }))

    expect(await screen.findByText('Kitchen worktop')).toBeInTheDocument()
    const posted = apiCalls.find((call) => call.method === 'POST')
    expect(posted?.body).toMatchObject({ amount: '1234.50', description: 'Kitchen worktop' })

    // --- Filter -------------------------------------------------------------
    await user.click(screen.getByRole('button', { name: t('expenses.add') }))
    await user.click(screen.getByRole('button', { name: t('expense.action.cancel') }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    await user.selectOptions(screen.getByLabelText(t('expense.field.status')), 'planned')

    await waitFor(() => expect(screen.queryByText('Kitchen worktop')).not.toBeInTheDocument())
    expect(screen.getByText(t('expenses.table.emptyFiltered'))).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText(t('expense.field.status')), 'all')
    expect(await screen.findByText('Kitchen worktop')).toBeInTheDocument()

    // --- Edit ---------------------------------------------------------------
    await user.click(
      screen.getByRole('button', {
        name: t('expense.action.editNamed', { description: 'Kitchen worktop' }),
      }),
    )
    const editDialog = screen.getByRole('dialog')
    expect(editDialog).toHaveAccessibleName(t('expense.form.editTitle'))

    const amount = within(editDialog).getByLabelText(t('expense.field.amount'))
    await user.clear(amount)
    await user.type(amount, '999.00')
    await user.click(within(editDialog).getByRole('button', { name: t('expense.form.saveChanges') }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    const patched = apiCalls.find((call) => call.method === 'PATCH')
    expect(patched?.body).toEqual({ amount: '999.00' })

    // --- Delete -------------------------------------------------------------
    await user.click(
      screen.getByRole('button', {
        name: t('expense.action.deleteNamed', { description: 'Kitchen worktop' }),
      }),
    )
    await user.click(screen.getByRole('button', { name: t('expense.delete.title') }))

    await waitFor(() => expect(screen.queryByText('Kitchen worktop')).not.toBeInTheDocument())
    expect(screen.getByText(t('expenses.table.empty'))).toBeInTheDocument()
    expect(apiCalls.some((call) => call.method === 'DELETE' && call.path === '/expenses/exp-1')).toBe(
      true,
    )
  })

  it('sets a budget from the strip and shows the new remainder without a reload', async () => {
    const user = userEvent.setup()
    stubApi({
      'GET /expenses': { body: [WORKTOP] },
      'GET /budget': { body: aBudget({ planned_budget: null }) },
      'GET /budget/summary': [
        { body: aSummary({ planned_budget: null, remaining_budget: null }) },
        { body: aSummary({ planned_budget: '50000.00', remaining_budget: '48765.50' }) },
      ],
      'PUT /budget': { body: aBudget({ planned_budget: '50000.00' }) },
    })

    const { t } = renderWithLocale(<ExpensesScreen />)
    await screenReady(t)
    const emptyState = t('budget.summary.emptyState', { action: t('budget.summary.edit') })
    expect(await screen.findByText(emptyState)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: t('budget.summary.edit') }))
    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText(t('budget.field.plannedBudget')), '50000.00')
    await user.click(within(dialog).getByRole('button', { name: t('budget.action.save') }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await screen.findByText(t('budget.summary.remaining'))).toBeInTheDocument()
    expect(screen.queryByText(emptyState)).not.toBeInTheDocument()

    const put = apiCalls.find((call) => call.method === 'PUT')
    expect(put?.body).toMatchObject({ planned_budget: '50000.00' })
  })

  it('shows exactly one accent button, even with nothing recorded', async () => {
    stubApi({
      'GET /expenses': { body: [] },
      'GET /budget': { body: aBudget() },
      'GET /budget/summary': { body: aSummary({ expense_count: 0 }) },
    })

    const { t } = renderWithLocale(<ExpensesScreen />)
    await screenReady(t)

    const accents = screen
      .getAllByRole('button')
      .filter((button) => button.className.includes('bg-accent'))

    expect(accents).toHaveLength(1)
  })

  it('recovers from a failed list without a page reload, and never shows the raw backend detail', async () => {
    const user = userEvent.setup()
    stubApi({
      'GET /expenses': [
        { status: 503, body: { detail: 'Service unavailable' } },
        { body: [WORKTOP] },
      ],
      'GET /budget': { body: aBudget() },
      'GET /budget/summary': { body: aSummary() },
    })

    const { t } = renderWithLocale(<ExpensesScreen />)

    expect(await screen.findByText(t('expenses.error.server'))).toBeInTheDocument()
    expect(screen.queryByText('Service unavailable')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: t('expenses.table.retry') }))

    expect(await screen.findByText('Kitchen worktop')).toBeInTheDocument()
    expect(screen.queryByText(t('expenses.error.server'))).not.toBeInTheDocument()
  })

  it('keeps the table usable when the summary request fails, and never shows the raw backend detail', async () => {
    stubApi({
      'GET /expenses': { body: [WORKTOP] },
      'GET /budget': { body: aBudget() },
      'GET /budget/summary': { status: 500, body: { detail: 'Summary exploded' } },
    })

    const { t } = renderWithLocale(<ExpensesScreen />)

    expect(await screen.findByText(t('budget.error.server'))).toBeInTheDocument()
    expect(screen.queryByText('Summary exploded')).not.toBeInTheDocument()
    expect(screen.getByText('Kitchen worktop')).toBeInTheDocument()
  })

  it('keeps the machine category value on the wire when it is picked by its Portuguese label', async () => {
    const user = userEvent.setup()
    const SOFA = anExpense({
      id: 'exp-2',
      description: 'Sofa',
      category: 'furniture_and_fixtures',
      status: 'planned',
    })
    stubApi({
      'GET /expenses': [{ body: [] }, { body: [SOFA] }],
      'GET /budget': { body: aBudget() },
      'GET /budget/summary': { body: aSummary() },
      'POST /expenses': { body: SOFA },
    })

    const { t } = renderWithLocale(<ExpensesScreen />, 'pt-PT')
    await screenReady(t)

    const [headerAdd] = screen.getAllByRole('button', { name: t('expenses.add') })
    await user.click(headerAdd)
    const dialog = screen.getByRole('dialog')

    await user.type(within(dialog).getByLabelText(t('expense.field.description')), 'Sofa')
    await user.type(within(dialog).getByLabelText(t('expense.field.amount')), '500.00')
    await user.type(within(dialog).getByLabelText(t('expense.field.payee')), 'Loja de Móveis')

    const categorySelect = within(dialog).getByLabelText(t('expense.field.category'))
    await user.selectOptions(
      categorySelect,
      within(categorySelect).getByRole('option', {
        name: t('expense.category.furniture_and_fixtures'),
      }),
    )

    await user.click(within(dialog).getByRole('button', { name: t('expenses.add') }))

    expect(await screen.findByText('Sofa')).toBeInTheDocument()
    const posted = apiCalls.find((call) => call.method === 'POST')
    // The request body carries the machine value, never the Portuguese label.
    expect(posted?.body).toMatchObject({ category: 'furniture_and_fixtures' })
  })

  it('filters by a status picked in Portuguese to the same rows the same filter gives in English', async () => {
    const rows = [
      anExpense({ id: 'a', description: 'Worktop', status: 'planned' }),
      anExpense({ id: 'b', description: 'Tiles', status: 'paid' }),
    ]
    stubApi({
      'GET /expenses': { body: rows },
      'GET /budget': { body: aBudget() },
      'GET /budget/summary': { body: aSummary() },
    })

    const enResult = renderWithLocale(<ExpensesScreen />, 'en')
    await screenReady(enResult.t)
    await userEvent.selectOptions(screen.getByLabelText(enResult.t('expense.field.status')), 'planned')
    expect(screen.getByText('Worktop')).toBeInTheDocument()
    expect(screen.queryByText('Tiles')).not.toBeInTheDocument()
    enResult.unmount()

    const ptResult = renderWithLocale(<ExpensesScreen />, 'pt-PT')
    await screenReady(ptResult.t)
    const statusSelect = screen.getByLabelText(ptResult.t('expense.field.status'))
    await userEvent.selectOptions(
      statusSelect,
      within(statusSelect).getByRole('option', { name: ptResult.t('expense.status.planned') }),
    )

    expect(screen.getByText('Worktop')).toBeInTheDocument()
    expect(screen.queryByText('Tiles')).not.toBeInTheDocument()
  })

  it('renders with no English string left over in Portuguese', async () => {
    stubApi({
      'GET /expenses': { body: [WORKTOP] },
      'GET /budget': { body: aBudget() },
      'GET /budget/summary': { body: aSummary() },
    })

    const { t } = renderWithLocale(<ExpensesScreen />, 'pt-PT')
    await screenReady(t)
    // The strip's remaining-budget block only renders once a budget exists.
    expect(await screen.findByText(t('budget.summary.remaining'))).toBeInTheDocument()

    // Every catalogue value that actually differs between languages — values
    // identical in both (a product name, a language's own endonym) are not
    // "English left over", they are just spelled the same by coincidence.
    const englishOnlyValues = new Set(
      (Object.keys(en) as MessageKey[])
        .filter((key) => en[key] !== pt[key])
        .map((key) => en[key]),
    )

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    const renderedTexts = new Set<string>()
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.textContent?.trim()
      if (text) renderedTexts.add(text)
    }
    const renderedAriaLabels = Array.from(document.querySelectorAll('[aria-label]')).map((el) =>
      el.getAttribute('aria-label'),
    )

    for (const value of englishOnlyValues) {
      expect(renderedTexts.has(value)).toBe(false)
      expect(renderedAriaLabels).not.toContain(value)
    }
  })

  it('preserves an open form and its values across a mid-edit language switch, and re-renders the error translated', async () => {
    const user = userEvent.setup()
    stubApi({
      'GET /expenses': { body: [] },
      'GET /budget': { body: aBudget() },
      'GET /budget/summary': { body: aSummary({ expense_count: 0 }) },
    })

    let capturedSetLocale: ((locale: Locale) => void) | undefined
    const { t } = renderWithLocale(
      <>
        <ExpensesScreen />
        <LocaleCapture
          onReady={(setLocale) => {
            capturedSetLocale = setLocale
          }}
        />
      </>,
      'en',
    )
    await screenReady(t)

    const [headerAdd] = screen.getAllByRole('button', { name: t('expenses.add') })
    await user.click(headerAdd)
    const dialog = screen.getByRole('dialog')

    await user.type(within(dialog).getByLabelText(t('expense.field.description')), 'Kitchen worktop')
    await user.type(within(dialog).getByLabelText(t('expense.field.payee')), 'Stone & Co')
    await user.type(within(dialog).getByLabelText(t('expense.field.amount')), '0')
    await user.click(within(dialog).getByRole('button', { name: t('expenses.add') }))

    expect(screen.getByText(t('expense.error.amountInvalid'))).toBeInTheDocument()
    const callsBeforeSwitch = apiCalls.length

    expect(capturedSetLocale).toBeDefined()
    act(() => capturedSetLocale?.('pt-PT'))

    const ptT: TranslateFn = (key, params) => translate('pt-PT', key, params)

    // The modal is still open, on the same values.
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(within(dialog).getByLabelText(ptT('expense.field.description'))).toHaveValue('Kitchen worktop')
    expect(within(dialog).getByLabelText(ptT('expense.field.payee'))).toHaveValue('Stone & Co')
    expect(within(dialog).getByLabelText(ptT('expense.field.amount'))).toHaveValue('0')
    // The already-shown error is re-rendered in the new language, not resubmitted.
    expect(screen.getByText(ptT('expense.error.amountInvalid'))).toBeInTheDocument()
    expect(apiCalls.length).toBe(callsBeforeSwitch)
  })
})
