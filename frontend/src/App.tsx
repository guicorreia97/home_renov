import { useEffect, useState } from 'react'
import { getHealth } from './api'
import { AppHeader } from './AppHeader'
import ExpensesScreen from './features/expenses/ExpensesScreen'
import { useTranslation } from './i18n'
import { classifyFailure, type FailureKind } from './lib/apiFailure'

/**
 * Application shell.
 *
 * Checks the API is reachable before rendering the real screen, so a broken
 * API base URL or a CORS misconfiguration shows up as a clear message here
 * rather than as a confusing failure halfway through the expenses screen.
 */

type Connection = { state: 'checking' } | { state: 'connected' } | { state: 'failed'; kind: FailureKind }

export default function App() {
  const { t } = useTranslation()
  const [connection, setConnection] = useState<Connection>({ state: 'checking' })

  useEffect(() => {
    const controller = new AbortController()

    async function check(): Promise<void> {
      try {
        await getHealth(controller.signal)
        setConnection({ state: 'connected' })
      } catch (error) {
        if (controller.signal.aborted) return
        setConnection({ state: 'failed', kind: classifyFailure(error) })
      }
    }

    void check()
    return () => controller.abort()
  }, [])

  // `t('app.connection.startHint')` leaves `{command}` untouched (no param
  // supplied), so splitting on the literal placeholder gives the two halves
  // around the <code>make run</code> that must stay unlocalised.
  const [hintBefore, hintAfter] = t('app.connection.startHint').split('{command}')

  return (
    <div className="min-h-screen bg-bg text-text">
      <AppHeader />

      {connection.state === 'checking' && (
        <main className="mx-auto max-w-content px-6 py-12">
          <p className="text-body text-muted">{t('app.connection.checking')}</p>
        </main>
      )}

      {connection.state === 'failed' && (
        <main className="mx-auto max-w-content px-6 py-12">
          <section className="rounded-card border border-border bg-surface p-6">
            <h1 className="text-card-title text-text">{t('app.connection.title')}</h1>
            <p className="mt-2 text-body text-danger">
              {t(
                connection.kind === 'network'
                  ? 'app.connection.failed.network'
                  : 'app.connection.failed.server',
              )}
            </p>
            {connection.kind === 'network' && (
              <p className="mt-2 text-label text-muted">
                {hintBefore}
                <code className="text-text">make run</code>
                {hintAfter}
              </p>
            )}
          </section>
        </main>
      )}

      {connection.state === 'connected' && <ExpensesScreen />}
    </div>
  )
}
