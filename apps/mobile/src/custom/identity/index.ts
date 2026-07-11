/**
 * Public API — username identity (ENS offchain subnames). UI integrations
 * (Send, CreateSafe) import ONLY from here.
 */
export type {
  IdentityConfig,
  ResolvedRecipient,
  AvailabilityResult,
  RecipientResolution,
  RecipientResolutionStatus,
} from './types'
export { getIdentityConfig, isIdentityEnabled, getResolverChainId } from './config'
export { isUsernameLike, normalizeUsername, isReservedUsername, toFullEnsName } from './username'
export { resolveUsername } from './resolve'
export { checkAvailability, registerUsername, fetchNamesForAddress } from './proxyClient'
export { reverseLookup, clearReverseLookupCache } from './reverse'
export { useRecipientResolution } from './hooks/useRecipientResolution'
export { useOwnUsername } from './hooks/useOwnUsername'
export { setOwnUsername, removeOwnUsername, selectOwnUsername, identityKey } from './store/identitySlice'
