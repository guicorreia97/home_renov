import { ApiError } from '../api'

/**
 * The two failure shapes the UI distinguishes. Never the backend's own
 * `detail`/message text (design.md, decision 8) — that stays in the console
 * only, and only via `console.warn` (an expected, handled failure path, not
 * a defect in the app itself; `console.error` would fail the test suite —
 * see `src/test/setup.ts`).
 *
 * Stored in React state as this kind, never as translated text — see the
 * rule "never store a translated string in state": a language switch while
 * a failure is on screen must re-render it in the new language, and a kind
 * survives that switch where a pre-rendered string would not.
 */
export type FailureKind = 'network' | 'server'

/**
 * Classifies a caught error and logs its diagnostic — `status` and the
 * client's already-normalised `message` only, never a request body or form
 * value (project rule: no user content in logs).
 *
 * A non-`ApiError` (the request never reached `src/api/client.ts` at all) is
 * treated as `'network'`, matching `ApiError.isNetworkError`'s own meaning:
 * the app could not talk to the backend.
 */
export function classifyFailure(error: unknown): FailureKind {
  const kind: FailureKind = error instanceof ApiError && !error.isNetworkError ? 'server' : 'network'
  console.warn('[api] request failed', {
    status: error instanceof ApiError ? error.status : undefined,
    message: error instanceof ApiError ? error.message : 'non-ApiError thrown',
  })
  return kind
}
