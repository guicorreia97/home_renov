import { useEffect, useState } from 'react'
import { getHealth } from './api'
import { AppHeader } from './AppHeader'
import { AppShell } from './features/shell/AppShell'
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
    <div className="flex h-screen flex-col overflow-hidden bg-bg text-text">
      <AppHeader />

      {connection.state === 'checking' && (
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-content px-6 py-12">
            <p className="text-body text-muted">{t('app.connection.checking')}</p>
          </div>
        </main>
      )}

      {connection.state === 'failed' && (
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-content px-6 py-12">
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
          </div>
        </main>
      )}

      {/* The healthcheck gate is unchanged: the shell mounts only once the API
          has proven reachable, so a broken base URL still surfaces as the
          message above rather than as a half-drawn desk. */}
      {connection.state === 'connected' && (
        <div className="flex-1 overflow-hidden">
          <AppShell />
        </div>
      )}
    </div>
  )
}
