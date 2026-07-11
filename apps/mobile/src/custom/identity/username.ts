import { getIdentityConfig } from './config'

/**
 * Username rules: 3–32 chars, lowercase a–z, digits and single hyphens,
 * no leading/trailing hyphen — the safe subset of ENS labels.
 */
const USERNAME_RE = /^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$/

const DEFAULT_RESERVED = ['admin', 'support', 'help', 'safe', 'wallet', 'info', 'root', 'www']

/** `@ana` or `ana.<parentDomain>` — inputs the Send flow should try to resolve. */
export const isUsernameLike = (input: string): boolean => {
  const config = getIdentityConfig()
  if (!config) {
    return false
  }
  const trimmed = input.trim().toLowerCase()
  return trimmed.startsWith('@') || trimmed.endsWith(`.${config.parentDomain.toLowerCase()}`)
}

/**
 * `@Ana `, `ana`, `ana.kuna.eth` → `ana`; anything outside the username rules
 * (or a reserved name when `checkReserved`) → null.
 */
export const normalizeUsername = (input: string, { checkReserved = false } = {}): string | null => {
  const config = getIdentityConfig()
  let candidate = input.trim().toLowerCase()

  if (candidate.startsWith('@')) {
    candidate = candidate.slice(1)
  }
  if (config && candidate.endsWith(`.${config.parentDomain.toLowerCase()}`)) {
    candidate = candidate.slice(0, -(config.parentDomain.length + 1))
  }
  if (!USERNAME_RE.test(candidate)) {
    return null
  }
  if (checkReserved && isReservedUsername(candidate)) {
    return null
  }
  return candidate
}

export const isReservedUsername = (username: string): boolean => {
  const reserved = getIdentityConfig()?.reservedNames ?? DEFAULT_RESERVED
  return reserved.includes(username.toLowerCase())
}

/** `ana` → `ana.<parentDomain>`. Throws when identity is not configured. */
export const toFullEnsName = (username: string): string => {
  const config = getIdentityConfig()
  if (!config) {
    throw new Error('Identity is not configured for this brand')
  }
  return `${username}.${config.parentDomain}`
}
