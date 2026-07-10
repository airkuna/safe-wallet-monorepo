import Safe from '@safe-global/protocol-kit'
import type { PredictedSafeProps } from '@safe-global/protocol-kit'
import { Wallet, formatUnits } from 'ethers'
import type { Chain } from '@safe-global/store/gateway/AUTO_GENERATED/chains'
import { createWeb3ReadOnly, getRpcServiceUrl } from '@/src/services/web3'

/**
 * The signer EOA pays for the deployment when no relay is available. Carries
 * everything the UI needs to tell the user how to fund the signer.
 */
export class InsufficientSignerFundsError extends Error {
  constructor(
    public readonly signerAddress: string,
    public readonly requiredWei: bigint,
    chain: Chain,
  ) {
    const amount = formatUnits(requiredWei, chain.nativeCurrency.decimals)
    super(
      `Not enough ${chain.nativeCurrency.symbol} to cover the network fee. ` +
        `Send at least ${amount} ${chain.nativeCurrency.symbol} to your signer address ${signerAddress} and try again.`,
    )
    this.name = 'InsufficientSignerFundsError'
  }
}

export interface DeploymentTx {
  to: string
  value: string
  data: string
}

/**
 * Rebuilds the exact CREATE2 deployment transaction from the props stored at
 * account creation. Pure read: nothing is broadcast.
 */
export const createSafeDeploymentTx = async (chain: Chain, props: PredictedSafeProps): Promise<DeploymentTx> => {
  const rpcUrl = getRpcServiceUrl(chain.rpcUri)
  if (!rpcUrl) {
    throw new Error(`No RPC url available for chain ${chain.chainId}`)
  }

  const protocolKit = await Safe.init({ provider: rpcUrl, predictedSafe: props })
  return protocolKit.createSafeDeploymentTransaction()
}

/**
 * Deploys the Safe from the owner signer EOA. Fails fast with
 * InsufficientSignerFundsError before broadcasting when the EOA cannot cover
 * gas, so the user gets an actionable message instead of an RPC error.
 */
export const activateSafeWithSigner = async (
  chain: Chain,
  props: PredictedSafeProps,
  privateKey: string,
): Promise<string> => {
  const deploymentTx = await createSafeDeploymentTx(chain, props)
  const provider = createWeb3ReadOnly(chain)
  if (!provider) {
    throw new Error(`No RPC provider available for chain ${chain.chainId}`)
  }

  try {
    const wallet = new Wallet(privateKey, provider)
    const txRequest = { to: deploymentTx.to, data: deploymentTx.data, value: BigInt(deploymentTx.value || '0') }

    const [gas, feeData, balance] = await Promise.all([
      provider.estimateGas({ ...txRequest, from: wallet.address }),
      provider.getFeeData(),
      provider.getBalance(wallet.address),
    ])
    const feePerGas = feeData.maxFeePerGas ?? feeData.gasPrice ?? 0n
    const cost = gas * feePerGas + txRequest.value

    if (balance < cost) {
      throw new InsufficientSignerFundsError(wallet.address, cost, chain)
    }

    const response = await wallet.sendTransaction(txRequest)
    const receipt = await response.wait()
    if (!receipt || receipt.status !== 1) {
      throw new Error('The activation transaction was reverted.')
    }
    return response.hash
  } finally {
    provider.destroy()
  }
}

export type RelayActivationMutation = (args: {
  chainId: string
  relayDto: { to: string; data: string; version: string }
}) => Promise<{ taskId: string }>

/**
 * Deploys the Safe through the CGW relay (sponsored, no signer funds needed).
 * Resolves once the proxy has code on-chain; the relay task itself carries no
 * completion signal usable offline.
 */
export const activateSafeWithRelay = async (
  chain: Chain,
  props: PredictedSafeProps,
  safeAddress: string,
  relayMutation: RelayActivationMutation,
): Promise<string> => {
  const deploymentTx = await createSafeDeploymentTx(chain, props)

  const { taskId } = await relayMutation({
    chainId: chain.chainId,
    relayDto: {
      to: deploymentTx.to,
      data: deploymentTx.data,
      version: props.safeDeploymentConfig?.safeVersion ?? '1.4.1',
    },
  })
  if (!taskId) {
    throw new Error('The activation could not be relayed.')
  }

  await waitForSafeDeployment(chain, safeAddress)
  return taskId
}

const DEPLOYMENT_POLL_INTERVAL_MS = 3_000
const DEPLOYMENT_TIMEOUT_MS = 180_000

/**
 * Polls the chain until the Safe address has contract code.
 */
export const waitForSafeDeployment = async (
  chain: Chain,
  safeAddress: string,
  timeoutMs: number = DEPLOYMENT_TIMEOUT_MS,
): Promise<void> => {
  const provider = createWeb3ReadOnly(chain)
  if (!provider) {
    throw new Error(`No RPC provider available for chain ${chain.chainId}`)
  }

  try {
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
      const code = await provider.getCode(safeAddress)
      if (code !== '0x') {
        return
      }
      await new Promise((resolve) => setTimeout(resolve, DEPLOYMENT_POLL_INTERVAL_MS))
    }
    throw new Error('Activation is taking longer than expected. Check again in a few minutes.')
  } finally {
    provider.destroy()
  }
}
