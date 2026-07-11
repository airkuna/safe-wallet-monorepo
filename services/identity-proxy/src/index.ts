/**
 * identity-proxy — registration proxy for username identity (whitelabel faza 4).
 *
 * Holds the Namestone API key so it never ships in the app binary. The REST
 * contract is shared with the mobile client
 * (`apps/mobile/src/custom/identity/proxyClient.ts`):
 *
 *   GET  /api/availability?name=<username>  → 200 { status: 'available' | 'taken' | 'reserved' | 'invalid' }
 *   POST /api/register { name, address }    → 201 { ensName } · 409 taken · 400 invalid
 *   GET  /api/names?address=<0x…>           → 200 { names: string[] }
 *
 * Namestone endpoints verified against https://namestone.com/docs (2026-07-11):
 *   POST https://namestone.com/api/public_v1/set-name      { domain, name, address }
 *   GET  https://namestone.com/api/public_v1/get-names     ?domain=&address=&text_records=0
 *   GET  https://namestone.com/api/public_v1/search-names  ?domain=&name=&exact_match=1&limit=1&text_records=0
 * Auth header on all of them: `Authorization: <API key>`.
 */

export interface Env {
  /** Namestone API key — `wrangler secret put NAMESTONE_API_KEY`. */
  NAMESTONE_API_KEY: string
  /** Parent ENS domain the subnames live under (e.g. `kuna.eth`). */
  DOMAIN: string
  /** Optional comma-separated override of the reserved-name list. */
  RESERVED_NAMES?: string
}

const NAMESTONE_BASE = 'https://namestone.com/api/public_v1'

/** Same rules as the mobile client: 3–32 chars, a–z/0–9/hyphens, no edge hyphen. */
const USERNAME_RE = /^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$/

const DEFAULT_RESERVED = ['admin', 'support', 'help', 'safe', 'wallet', 'info', 'root', 'www']

const CORS_HEADERS: Record<string, string> = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
}

type NamestoneName = {
  name: string
  address: string
  domain: string
}

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...CORS_HEADERS },
  })

const getReservedNames = (env: Env): string[] => {
  const fromVar = (env.RESERVED_NAMES ?? '')
    .split(',')
    .map((name) => name.trim().toLowerCase())
    .filter((name) => name.length > 0)
  return fromVar.length > 0 ? fromVar : DEFAULT_RESERVED
}

const isValidUsername = (name: string): boolean => USERNAME_RE.test(name)

const isHexAddress = (address: string): boolean => /^0x[a-fA-F0-9]{40}$/.test(address)

const namestoneFetch = (env: Env, path: string, init?: RequestInit): Promise<Response> =>
  fetch(`${NAMESTONE_BASE}${path}`, {
    ...init,
    headers: {
      authorization: env.NAMESTONE_API_KEY,
      'content-type': 'application/json',
      ...init?.headers,
    },
  })

/** Exact-match lookup — a non-empty result means the subname is taken. */
const isNameTaken = async (env: Env, name: string): Promise<boolean> => {
  const query = `?domain=${encodeURIComponent(env.DOMAIN)}&name=${encodeURIComponent(name)}&exact_match=1&limit=1&text_records=0`
  const response = await namestoneFetch(env, `/search-names${query}`)
  if (!response.ok) {
    throw new Error(`Namestone search-names failed (${response.status})`)
  }
  const body = (await response.json()) as NamestoneName[]
  return body.some((entry) => entry.name.toLowerCase() === name)
}

const handleAvailability = async (env: Env, url: URL): Promise<Response> => {
  const name = (url.searchParams.get('name') ?? '').trim().toLowerCase()
  if (!isValidUsername(name)) {
    return json({ status: 'invalid' })
  }
  if (getReservedNames(env).includes(name)) {
    return json({ status: 'reserved' })
  }
  const taken = await isNameTaken(env, name)
  return json({ status: taken ? 'taken' : 'available' })
}

// Registration is the abuse-prone route: it spends the brand's Namestone quota.
// Rate-limit candidate — per-IP counters need durable state (KV/DO/Cloudflare
// rate-limiting rules); an in-memory Map here would reset per isolate and give
// false safety, so it is intentionally left out for now.
const handleRegister = async (env: Env, request: Request): Promise<Response> => {
  let payload: { name?: unknown; address?: unknown }
  try {
    payload = (await request.json()) as { name?: unknown; address?: unknown }
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const name = typeof payload.name === 'string' ? payload.name.trim().toLowerCase() : ''
  const address = typeof payload.address === 'string' ? payload.address.trim() : ''

  if (!isValidUsername(name) || getReservedNames(env).includes(name)) {
    return json({ error: 'Invalid or reserved name' }, 400)
  }
  if (!isHexAddress(address)) {
    return json({ error: 'Invalid address' }, 400)
  }
  if (await isNameTaken(env, name)) {
    return json({ error: 'Name is already taken' }, 409)
  }

  const response = await namestoneFetch(env, '/set-name', {
    method: 'POST',
    body: JSON.stringify({ domain: env.DOMAIN, name, address }),
  })
  if (!response.ok) {
    return json({ error: `Namestone set-name failed (${response.status})` }, 502)
  }

  return json({ ensName: `${name}.${env.DOMAIN}` }, 201)
}

const handleNames = async (env: Env, url: URL): Promise<Response> => {
  const address = (url.searchParams.get('address') ?? '').trim()
  if (!isHexAddress(address)) {
    return json({ error: 'Invalid address' }, 400)
  }

  const query = `?domain=${encodeURIComponent(env.DOMAIN)}&address=${encodeURIComponent(address)}&text_records=0`
  const response = await namestoneFetch(env, `/get-names${query}`)
  if (!response.ok) {
    return json({ error: `Namestone get-names failed (${response.status})` }, 502)
  }

  const body = (await response.json()) as NamestoneName[]
  const names = body
    .filter((entry) => entry.domain.toLowerCase() === env.DOMAIN.toLowerCase())
    .map((entry) => entry.name)
  return json({ names })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS })
    }

    const url = new URL(request.url)

    try {
      if (request.method === 'GET' && url.pathname === '/api/availability') {
        return await handleAvailability(env, url)
      }
      if (request.method === 'POST' && url.pathname === '/api/register') {
        return await handleRegister(env, request)
      }
      if (request.method === 'GET' && url.pathname === '/api/names') {
        return await handleNames(env, url)
      }
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : 'Upstream error' }, 502)
    }

    return json({ error: 'Not found' }, 404)
  },
}
