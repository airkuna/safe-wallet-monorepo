import { fetchNamesForAddress } from './proxyClient'
import { isIdentityEnabled } from './config'

/**
 * Address → username (for activity/confirm display). Offchain subnames cannot
 * set a mainnet reverse record, so the proxy's directory is the source; an
 * in-memory TTL cache keeps this cheap for list renders. Persisted state is
 * intentionally limited to the user's OWN username (identitySlice) — other
 * people's names must stay re-resolvable when they change.
 */
const TTL_MS = 10 * 60 * 1000

const cache = new Map<string, { name: string | null; fetchedAt: number }>()

export const reverseLookup = async (address: string): Promise<string | null> => {
  if (!isIdentityEnabled()) {
    return null
  }

  const key = address.toLowerCase()
  const hit = cache.get(key)
  if (hit && Date.now() - hit.fetchedAt < TTL_MS) {
    return hit.name
  }

  try {
    const names = await fetchNamesForAddress(address)
    const name = names[0] ?? null
    cache.set(key, { name, fetchedAt: Date.now() })
    return name
  } catch {
    return hit?.name ?? null
  }
}

/** Test seam. */
export const clearReverseLookupCache = (): void => cache.clear()
