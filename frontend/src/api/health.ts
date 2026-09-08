import { request } from './client'

/** The API returns `{"message": "OK"}` — verified against the running service. */
export interface HealthStatus {
  message: string
}

/** Liveness probe — the cheapest way to confirm the client can reach the API. */
export function getHealth(signal?: AbortSignal): Promise<HealthStatus> {
  return request<HealthStatus>('/healthcheck', { signal })
}
