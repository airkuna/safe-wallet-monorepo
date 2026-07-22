import { getBrand } from '@/src/custom/brand'

/**
 * Backend za donacije dolazi iz brand manifesta (`donations.apiBaseUrl` —
 * Supabase edge functions base, npr. `https://api.domovina.ai/functions/v1`).
 * Bez njega donacijski pack ne zove mrežu (graceful null semantika).
 */
export const getDonationsApiBaseUrl = (): string | undefined => {
  const url = getBrand().donations?.apiBaseUrl
  return url === undefined ? undefined : url.replace(/\/+$/, '')
}

export const isDonationsBackendConfigured = (): boolean => getDonationsApiBaseUrl() !== undefined

/**
 * PostgREST baza istog Supabase stacka — RPC-evi `active_campaign_for_subject`
 * i `contribution_status` žive na `/rest/v1`, ne na `/functions/v1`. Izvodi se
 * iz manifest polja (A1 schema ima samo edge functions bazu); manifest koji ne
 * završava na `/functions/v1` nema RPC pristup (graceful undefined).
 */
export const getDonationsRestBaseUrl = (): string | undefined => {
  const base = getDonationsApiBaseUrl()
  if (base === undefined || !base.endsWith('/functions/v1')) {
    return undefined
  }
  return `${base.slice(0, -'/functions/v1'.length)}/rest/v1`
}

/** Postgres schema pinka backenda (`Content-Profile` header za RPC pozive). */
export const PINKA_SCHEMA = 'pinka_finance'

/**
 * Javni Supabase anon key domovina-api backenda (role `anon`; isporučuje se u
 * web bundleu domovina.ai pa je javan po dizajnu). PostgREST ga traži u
 * `apikey`/`authorization` headerima; edge funkcije ne. RLS + SECURITY DEFINER
 * RPC-evi na backendu su stvarna autorizacija — ovaj ključ ne daje ništa
 * osim javnog čitanja.
 */
export const DONATIONS_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3OTExMTcxMywiZXhwIjo0OTMyNzExNzEzLCJyb2xlIjoiYW5vbiJ9.Q4Ef7xMc2dmjMyfJebPDyqNirnARZzMxTWe7i0dASPI'
