import { isAddress } from 'ethers'
import { getIdentityConfig } from './config'
import { normalizeUsername, isReservedUsername, toFullEnsName } from './username'
import type { AvailabilityResult } from './types'

/**
 * Client for the brand's registration proxy (`identity.registrationProxyUrl`)
 * — a minimal worker holding the Namestone API key (see
 * `services/identity-proxy/`). The key never ships in the binary.
 *
 * REST contract (shared with the worker):
 *   GET  /api/availability?name=<username>          → 200 { status: 'available' | 'taken' | 'reserved' | 'invalid' }
 *   POST /api/register { name, address }            → 201 { ensName } · 409 taken · 400 invalid
 *   GET  /api/names?address=<0x…>                   → 200 { names: string[] }
 */

const REQUEST_TIMEOUT_MS = 10_000

const proxyFetch = async (path: string, init?: RequestInit): Promise<Response> => {
  const config = getIdentityConfig()
  if (!config) {
    throw new Error('Identity is not configured for this brand')
  }
  const base = config.registrationProxyUrl.replace(/\/$/, '')
  return fetch(`${base}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...init?.headers },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
}

export const checkAvailability = async (input: string): Promise<AvailabilityResult> => {
  const username = normalizeUsername(input)
  if (!username) {
    return 'invalid'
  }
  if (isReservedUsername(username)) {
    return 'reserved'
  }

  try {
    const response = await proxyFetch(`/api/availability?name=${encodeURIComponent(username)}`)
    if (!response.ok) {
      return 'unavailable-service'
    }
    const body = (await response.json()) as { status?: string }
    if (body.status === 'available' || body.status === 'taken' || body.status === 'reserved') {
      return body.status
    }
    return body.status === 'invalid' ? 'invalid' : 'unavailable-service'
  } catch {
    return 'unavailable-service'
  }
}

/** Register `username` → `address`. Resolves to the full ENS name; throws on failure. */
export const registerUsername = async (input: string, address: string): Promise<{ ensName: string }> => {
  const username = normalizeUsername(input, { checkReserved: true })
  if (!username) {
    throw new Error('Invalid username')
  }
  if (!isAddress(address)) {
    throw new Error('Invalid address')
  }

  const response = await proxyFetch('/api/register', {
    method: 'POST',
    body: JSON.stringify({ name: username, address }),
  })

  if (response.status === 409) {
    throw new Error('Username is already taken')
  }
  if (!response.ok) {
    throw new Error(`Registration failed (${response.status})`)
  }

  const body = (await response.json()) as { ensName?: string }
  return { ensName: body.ensName ?? toFullEnsName(username) }
}

/** All usernames registered to an address (reverse directory), newest first. */
export const fetchNamesForAddress = async (address: string): Promise<string[]> => {
  if (!isAddress(address)) {
    return []
  }
  const response = await proxyFetch(`/api/names?address=${encodeURIComponent(address)}`)
  if (!response.ok) {
    return []
  }
  const body = (await response.json()) as { names?: string[] }
  return body.names ?? []
}
