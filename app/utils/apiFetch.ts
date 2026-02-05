import { ofetch } from "ofetch"

/**
 * Untyped fetch wrapper that bypasses Nuxt's typed route inference
 * which causes "Excessive stack depth" TS errors with dynamic API URLs.
 */
export const apiFetch = ofetch
