import { getBrand } from '@/src/custom/brand'

/**
 * Backend za Događaje dolazi iz brand manifesta (`events.apiBaseUrl` —
 * Supabase edge functions base). Bez njega pack radi u E1 modu: katalog je
 * config, narudžbe žive samo na uređaju.
 */
export const getEventsApiBaseUrl = (): string | undefined => {
  const url = getBrand().events?.apiBaseUrl
  return url === undefined ? undefined : url.replace(/\/+$/, '')
}

export const isEventsBackendConfigured = (): boolean => getEventsApiBaseUrl() !== undefined
