/**
 * Username identity via ENS offchain subnames (whitelabel faza 4).
 * Public API contract — Send/CreateSafe integrations compile against these
 * types; implementations live in this module only.
 */

export type IdentityConfig = {
  parentDomain: string
  registrationProxyUrl: string
  resolverChainId?: string
  reservedNames?: string[]
}

export type ResolvedRecipient = {
  /** Checksummed resolved address. */
  address: string
  /** Full ENS name (`ana.kuna.eth`). */
  ensName: string
  /** Bare username (`ana`). */
  username: string
}

export type AvailabilityResult = 'available' | 'taken' | 'invalid' | 'reserved' | 'unavailable-service'

export type RecipientResolutionStatus = 'idle' | 'resolving' | 'resolved' | 'not-found' | 'error'

export type RecipientResolution = {
  status: RecipientResolutionStatus
  resolved: ResolvedRecipient | null
}
