/**
 * The HTTP layer. This is the only module in the app that calls `fetch`
 * (frontend rule 3) — screens and components go through the typed functions in
 * the sibling modules, never through here directly.
 */

/**
 * Base URL. Vite inlines this at build time; it is public by definition, so it
 * carries a URL and nothing else — never a credential (rule 7).
 */
const BASE_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

/**
 * A failed request, carrying enough to render a useful message.
 *
 * FastAPI reports errors as `{"detail": ...}`, where `detail` is a string for
 * the handlers' own HTTPExceptions but an array of objects for 422 validation
 * failures. Both are normalised to a readable `message` here so no component
 * has to know that shape.
 */
export class ApiError extends Error {
  readonly status: number
  readonly detail: unknown

  constructor(status: number, message: string, detail: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
  }

  /** The request never reached the API — server down, or CORS refused it. */
  get isNetworkError(): boolean {
    return this.status === 0
  }
}

interface FastApiValidationError {
  loc: (string | number)[]
  msg: string
}

function isValidationErrorList(value: unknown): value is FastApiValidationError[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === 'object' && item !== null && 'msg' in item)
  )
}

/** Turn FastAPI's two different `detail` shapes into one readable sentence. */
function messageFromDetail(detail: unknown, status: number): string {
  if (typeof detail === 'string' && detail.length > 0) return detail

  if (isValidationErrorList(detail)) {
    return detail
      .map((item) => {
        // Drop the leading "body" segment; it tells the reader nothing.
        const field = item.loc.filter((part) => part !== 'body').join('.')
        return field ? `${field}: ${item.msg}` : item.msg
      })
      .join('; ')
  }

  return `Request failed with status ${status}.`
}

async function parseError(response: Response): Promise<ApiError> {
  let detail: unknown
  try {
    const body: unknown = await response.json()
    detail =
      typeof body === 'object' && body !== null && 'detail' in body
        ? (body as { detail: unknown }).detail
        : body
  } catch {
    // A non-JSON error body (a proxy's HTML 502, say) is not worth reporting
    // verbatim; the status line is the useful part.
    detail = undefined
  }
  return new ApiError(response.status, messageFromDetail(detail, response.status), detail)
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  signal?: AbortSignal
}

/**
 * Perform one request and decode the JSON response.
 *
 * `T` is asserted, not validated: the types in `src/types/` mirror the backend's
 * Pydantic models, and those models are what generate the payload. Adding a
 * runtime validator here would duplicate that contract without a second source
 * of truth to check it against.
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, signal } = options

  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      signal,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch (cause) {
    // fetch rejects only when the request never completed. A CORS refusal lands
    // here too, indistinguishable from the server being down — the browser
    // deliberately withholds the detail — so the message names both.
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause
    throw new ApiError(
      0,
      `Could not reach the API at ${BASE_URL}. Is the backend running (make run)?`,
      cause,
    )
  }

  if (!response.ok) throw await parseError(response)

  // 204 No Content — DELETE returns no body to parse.
  if (response.status === 204) return undefined as T

  return (await response.json()) as T
}

/** Where this client is pointed. Useful in error states and diagnostics. */
export const apiBaseUrl: string = BASE_URL
