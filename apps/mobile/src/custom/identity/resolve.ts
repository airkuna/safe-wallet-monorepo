import { getAddress } from 'ethers'
import type { Chain } from '@safe-global/store/gateway/AUTO_GENERATED/chains'
import { createWeb3ReadOnly } from '@/src/services/web3'
import { getIdentityConfig } from './config'
import { isUsernameLike, normalizeUsername, toFullEnsName } from './username'
import type { ResolvedRecipient } from './types'

/**
 * Resolve `@ana` / `ana.<parentDomain>` to an address via standard ENS lookup
 * on the resolver chain. Offchain subnames (Namestone) answer through
 * CCIP-Read (ERC-3668), which ethers' EnsResolver follows transparently — any
 * ENS-aware client sees the same answer, we run no directory of our own.
 *
 * `chain` is the resolver chain's CGW config (see `getResolverChainId`);
 * callers obtain it from the chains store. Returns null for non-username
 * inputs, unknown names, or when identity/chain are not configured.
 */
export const resolveUsername = async (input: string, chain: Chain | undefined): Promise<ResolvedRecipient | null> => {
  const config = getIdentityConfig()
  if (!config || !chain || !isUsernameLike(input)) {
    return null
  }

  const username = normalizeUsername(input)
  if (!username) {
    return null
  }

  const provider = createWeb3ReadOnly(chain)
  if (!provider) {
    return null
  }

  const ensName = toFullEnsName(username)
  const resolved = await provider.resolveName(ensName)
  if (!resolved) {
    return null
  }

  return { address: getAddress(resolved), ensName, username }
}
