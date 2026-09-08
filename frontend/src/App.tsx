/**
 * Application shell.
 *
 * Deliberately empty of product UI — no screens exist yet. This renders the
 * page ground and the centered 1200px content column that every future screen
 * sits inside, and serves as a live check that the design tokens resolve.
 */
export default function App() {
  return (
    <div className="min-h-screen bg-bg text-text">
      <main className="mx-auto max-w-content px-6 py-12">
        <h1 className="text-page-title text-text">home_renov</h1>
        <p className="mt-4 text-body text-muted">
          The frontend is scaffolded and the design tokens are wired up. No screens yet.
        </p>
      </main>
    </div>
  )
}
