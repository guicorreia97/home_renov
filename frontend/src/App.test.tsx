import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { translate } from './i18n'
import { aBudget, aSummary } from './test/fixtures'
import { renderWithLocale } from './test/renderWithLocale'
import { stubApi, stubNetworkFailure } from './test/setup'
import App from './App'

function stubConnectedScreen(): void {
  stubApi({
    'GET /healthcheck': { body: { message: 'OK' } },
    'GET /expenses': { body: [] },
    'GET /budget': { body: aBudget() },
    'GET /budget/summary': { body: aSummary() },
  })
}

describe('App', () => {
  it('shows the header — product name and language control — before the health check resolves', async () => {
    stubConnectedScreen()
    renderWithLocale(<App />)

    expect(screen.getByText(translate('en', 'app.name'))).toBeInTheDocument()
    expect(screen.getByLabelText(translate('en', 'app.language'))).toBeInTheDocument()
    expect(screen.getByText(translate('en', 'app.connection.checking'))).toBeInTheDocument()

    // Let the in-flight health check settle before the test tears down.
    await screen.findByRole('heading', { name: translate('en', 'expenses.title') })
  })

  it('keeps the header once connected, alongside the expenses screen', async () => {
    stubConnectedScreen()
    renderWithLocale(<App />)

    expect(
      await screen.findByRole('heading', { name: translate('en', 'expenses.title') }),
    ).toBeInTheDocument()
    expect(screen.getByText(translate('en', 'app.name'))).toBeInTheDocument()
    expect(screen.getByLabelText(translate('en', 'app.language'))).toBeInTheDocument()
  })

  it('shows the header and localised copy, never the backend detail, when the health check fails on the server', async () => {
    stubApi({ 'GET /healthcheck': { status: 500, body: { detail: 'internal secret stack trace' } } })
    renderWithLocale(<App />)

    expect(
      await screen.findByRole('heading', { name: translate('en', 'app.connection.title') }),
    ).toBeInTheDocument()
    expect(screen.getByText(translate('en', 'app.name'))).toBeInTheDocument()
    expect(screen.getByLabelText(translate('en', 'app.language'))).toBeInTheDocument()
    expect(screen.getByText(translate('en', 'app.connection.failed.server'))).toBeInTheDocument()
    expect(screen.queryByText(/internal secret/)).not.toBeInTheDocument()
    // The "start the API" hint is for the unreachable case only. `make run` is
    // a literal shell command, not app copy — it is deliberately never
    // translated (design.md).
    expect(screen.queryByText('make run')).not.toBeInTheDocument()
  })

  it('shows the network-unreachable copy and the start hint when the backend cannot be reached at all', async () => {
    stubApi({ 'GET /healthcheck': { body: { message: 'OK' } } })
    stubNetworkFailure()
    renderWithLocale(<App />)

    expect(
      await screen.findByText(translate('en', 'app.connection.failed.network')),
    ).toBeInTheDocument()
    expect(screen.getByText('make run')).toBeInTheDocument()
  })

  it('renders the failed state and the header in Portuguese', async () => {
    stubApi({ 'GET /healthcheck': { status: 500, body: { detail: 'boom' } } })
    renderWithLocale(<App />, 'pt-PT')

    expect(
      await screen.findByRole('heading', { name: translate('pt-PT', 'app.connection.title') }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(translate('pt-PT', 'app.language'))).toBeInTheDocument()
    expect(screen.getByText(translate('pt-PT', 'app.connection.failed.server'))).toBeInTheDocument()
  })

  it('switches language from the header and re-renders the connected screen', async () => {
    stubConnectedScreen()
    renderWithLocale(<App />)

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: translate('en', 'expenses.title') })).toBeInTheDocument(),
    )

    const languageSelect = screen.getByLabelText(translate('en', 'app.language'))
    await userEvent.selectOptions(languageSelect, translate('en', 'app.language.pt-PT'))

    expect(
      screen.getByRole('heading', { name: translate('pt-PT', 'expenses.title') }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(translate('pt-PT', 'app.language'))).toBeInTheDocument()
  })
})
