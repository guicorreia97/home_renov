import { useEffect, useState } from 'react'
import { ApiError, apiBaseUrl, getBudgetSummary, getHealth } from './api'
import type { BudgetSummary } from './types'
import { formatMoney } from './lib/format'

/**
 * Application shell.
 *
 * Still no product screens. What this does render is a live connection check,
 * so a broken API base URL or a CORS misconfiguration shows up here rather than
 * halfway through building the first real screen.
 */

type Connection =
  | { state: 'checking' }
  | { state: 'connected'; summary: BudgetSummary }
  | { state: 'failed'; message: string; unreachable: boolean }

export default function App() {
  const [connection, setConnection] = useState<Connection>({ state: 'checking' })

  useEffect(() => {
    const controller = new AbortController()

    async function check(): Promise<void> {
      try {
        await getHealth(controller.signal)
        // The summary exercises the real contract, not just liveness.
        const summary = await getBudgetSummary(controller.signal)
        setConnection({ state: 'connected', summary })
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
      <main className="mx-auto max-w-content px-6 py-12">
        <h1 className="text-page-title text-text">home_renov</h1>
        <p className="mt-4 text-body text-muted">
          The frontend is scaffolded, the design tokens are wired up, and the API client is in
          place. No screens yet.
        </p>

        <section className="mt-8 rounded-card border border-border bg-surface p-6">
          <h2 className="text-card-title text-text">Backend connection</h2>
          <ConnectionStatus connection={connection} />
        </section>
      </main>
    </div>
  )
}

interface ConnectionStatusProps {
  connection: Connection
}

function ConnectionStatus({ connection }: ConnectionStatusProps) {
  if (connection.state === 'checking') {
    return <p className="mt-2 text-body text-muted">Checking…</p>
  }

  if (connection.state === 'failed') {
    return (
      <div className="mt-2">
        <p className="text-body text-danger">{connection.message}</p>
        {connection.unreachable && (
          <p className="mt-2 text-label text-muted">
            Start the API with <code className="text-text">make run</code> from the repo root, then
            reload.
          </p>
        )}
      </div>
    )
  }

  const { summary } = connection
  return (
    <div className="mt-2">
      <p className="text-body text-success">Connected to {apiBaseUrl}</p>
      <dl className="mt-4 flex gap-8">
        <div>
          <dt className="text-label text-muted">Expenses recorded</dt>
          <dd className="mt-1 text-numeric text-text tabular">{summary.expense_count}</dd>
        </div>
        <div>
          <dt className="text-label text-muted">Committed spend</dt>
          <dd className="mt-1 text-numeric text-text tabular">
            {formatMoney(summary.total_committed, summary.currency)}
          </dd>
        </div>
      </dl>
    </div>
  )
}
