import { predictSafeAddress, SafeProvider } from '@safe-global/protocol-kit'
import type { PredictedSafeProps } from '@safe-global/protocol-kit'
import type { Chain } from '@safe-global/store/gateway/AUTO_GENERATED/chains'
import { getLatestSafeVersion } from '@safe-global/utils/utils/chains'
import { getRpcServiceUrl } from '@/src/services/web3'

// A fixed salt is safe here because every created account gets a freshly
// generated owner key, which alone makes the CREATE2 address unique.
export const NEW_SAFE_SALT_NONCE = '0'

export type PredictedNewSafe = {
  address: string
  props: PredictedSafeProps
}

export const buildNewSafeProps = (chain: Chain, ownerAddress: string): PredictedSafeProps => ({
  safeAccountConfig: {
    owners: [ownerAddress],
    threshold: 1,
  },
  safeDeploymentConfig: {
    saltNonce: NEW_SAFE_SALT_NONCE,
    safeVersion: getLatestSafeVersion(chain),
  },
})

/**
 * Computes the deterministic (counterfactual) address of a new 1/1 Safe for the
 * given owner without deploying anything. The stored props are enough for
 * protocol-kit to build the identical deployment transaction later.
 */
export const predictNewSafeAddress = async (chain: Chain, ownerAddress: string): Promise<PredictedNewSafe> => {
  const rpcUrl = getRpcServiceUrl(chain.rpcUri)

  if (!rpcUrl) {
    throw new Error(`No RPC url available for chain ${chain.chainId}`)
  }

  const props = buildNewSafeProps(chain, ownerAddress)
  const safeProvider = new SafeProvider({ provider: rpcUrl })

  const address = await predictSafeAddress({
    safeProvider,
    chainId: BigInt(chain.chainId),
    safeAccountConfig: props.safeAccountConfig,
    safeDeploymentConfig: props.safeDeploymentConfig,
  })

  return { address, props }
}
