import { useEffect, useState } from 'react'
import { ApiError, getHealth } from './api'
import ExpensesScreen from './features/expenses/ExpensesScreen'

/**
 * Application shell.
 *
 * Checks the API is reachable before rendering the real screen, so a broken
 * API base URL or a CORS misconfiguration shows up as a clear message here
 * rather than as a confusing failure halfway through the expenses screen.
 */

type Connection = { state: 'checking' } | { state: 'connected' } | { state: 'failed'; message: string; unreachable: boolean }

export default function App() {
  const [connection, setConnection] = useState<Connection>({ state: 'checking' })

  useEffect(() => {
    const controller = new AbortController()

    async function check(): Promise<void> {
      try {
        await getHealth(controller.signal)
        setConnection({ state: 'connected' })
      } catch (error) {
        if (controller.signal.aborted) return
        const apiError = error instanceof ApiError ? error : null
        setConnection({
          state: 'failed',
          message: apiError?.message ?? 'Unexpected error contacting the API.',
          unreachable: apiError?.isNetworkError ?? true,
        })
      }
    }

    void check()
    return () => controller.abort()
  }, [])

  return (
    <div className="min-h-screen bg-bg text-text">
      {connection.state === 'checking' && (
        <main className="mx-auto max-w-content px-6 py-12">
          <p className="text-body text-muted">Checking…</p>
        </main>
      )}

      {connection.state === 'failed' && (
        <main className="mx-auto max-w-content px-6 py-12">
          <h1 className="text-page-title text-text">home_renov</h1>
          <section className="mt-8 rounded-card border border-border bg-surface p-6">
            <h2 className="text-card-title text-text">Backend connection</h2>
            <p className="mt-2 text-body text-danger">{connection.message}</p>
            {connection.unreachable && (
              <p className="mt-2 text-label text-muted">
                Start the API with <code className="text-text">make run</code> from the repo root,
                then reload.
              </p>
            )}
          </section>
        </main>
      )}

      {connection.state === 'connected' && <ExpensesScreen />}
    </div>
  )
}
