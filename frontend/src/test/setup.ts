/**
 * Global test setup: jest-dom matchers, DOM cleanup, and a `fetch` stub.
 *
 * The API client (`src/api/client.ts`) is the app's only caller of `fetch`, so
 * stubbing `fetch` stubs the whole network boundary without mocking anything we
 * own — the client's own error normalising, abort handling and 204 case all
 * still run under test. See docs/testing-guide.md.
 */
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'

/** Must match `BASE_URL` in src/api/client.ts under test (no VITE_API_URL set). */
const BASE_URL = 'http://localhost:8000'

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

/** A route key, e.g. `'GET /expenses'` or `'PATCH /expenses/abc'`. */
export type Route = `${HttpMethod} ${string}`

export interface StubbedResponse {
  /** Defaults to 200, or 204 when `body` is omitted. */
  status?: number
  body?: unknown
}

/**
 * A route's stub. An array is consumed one entry per call, and the final entry
 * repeats — which is how a test asserts that a refetch after a mutation returns
 * the *new* data rather than the stale first response.
 */
export type Stub = StubbedResponse | StubbedResponse[]

export interface RecordedCall {
  method: HttpMethod
  path: string
  body: unknown
}

/** Every request made since the current test began, in order. */
export const apiCalls: RecordedCall[] = []

const stubs = new Map<string, StubbedResponse[]>()

/**
 * Point routes at canned responses. Call it as many times per test as needed;
 * a later call replaces an earlier stub for the same route.
 *
 * ```ts
 * stubApi({
 *   'GET /expenses': { body: [expense] },
 *   'GET /budget/summary': [{ body: before }, { body: after }],
 *   'DELETE /expenses/abc': { status: 204 },
 * })
 * ```
 */
export function stubApi(handlers: Partial<Record<Route, Stub>>): void {
  for (const [route, stub] of Object.entries(handlers) as [Route, Stub][]) {
    stubs.set(route, Array.isArray(stub) ? [...stub] : [stub])
  }
}

function nextResponse(route: string): StubbedResponse {
  const queue = stubs.get(route)
  if (!queue || queue.length === 0) {
    throw new Error(
      `No stub for "${route}". Add one with stubApi({ '${route}': { body: … } }).`,
    )
  }
  // The last entry is sticky, so a component that polls does not exhaust it.
  return queue.length === 1 ? queue[0] : queue.shift()!
}

function stubbedFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const url = typeof input === 'string' ? input : input.toString()
  const method = (init.method ?? 'GET') as HttpMethod
  const path = url.startsWith(BASE_URL) ? url.slice(BASE_URL.length) : url

  const signal = init.signal
  if (signal?.aborted) {
    return Promise.reject(new DOMException('The operation was aborted.', 'AbortError'))
  }

  apiCalls.push({
    method,
    path,
    body: typeof init.body === 'string' ? JSON.parse(init.body) : undefined,
  })

  const { status, body } = nextResponse(`${method} ${path}`)
  const code = status ?? (body === undefined ? 204 : 200)

  if (code === 204) return Promise.resolve(new Response(null, { status: 204 }))

  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status: code,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
}

/** Make the next matching request fail the way an unreachable backend does. */
export function stubNetworkFailure(): void {
  vi.mocked(globalThis.fetch).mockImplementationOnce(() =>
    Promise.reject(new TypeError('Failed to fetch')),
  )
}

/**
 * A React warning, a thrown render, or a promise nobody awaited is a defect, not
 * background noise — and in a terminal nobody reads the scrollback. Each is
 * captured here and re-raised as a test failure.
 */
const consoleErrors: string[] = []
const rejections: unknown[] = []
let originalConsoleError: typeof console.error

function recordRejection(event: PromiseRejectionEvent): void {
  rejections.push(event.reason)
}

beforeEach(() => {
  stubs.clear()
  apiCalls.length = 0
  consoleErrors.length = 0
  rejections.length = 0
  vi.stubGlobal('fetch', vi.fn(stubbedFetch))

  originalConsoleError = console.error
  console.error = (...args: unknown[]) => {
    consoleErrors.push(args.map(String).join(' '))
    originalConsoleError(...args)
  }
  window.addEventListener('unhandledrejection', recordRejection)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  console.error = originalConsoleError
  window.removeEventListener('unhandledrejection', recordRejection)

  if (consoleErrors.length > 0) {
    throw new Error(`Test logged ${consoleErrors.length} console error(s):\n${consoleErrors.join('\n')}`)
  }
  if (rejections.length > 0) {
    throw new Error(`Test left ${rejections.length} unhandled promise rejection(s):\n${rejections.map(String).join('\n')}`)
  }
})
