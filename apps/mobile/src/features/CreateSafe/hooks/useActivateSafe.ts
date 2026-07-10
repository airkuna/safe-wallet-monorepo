import { useCallback, useState } from 'react'
import { useRelayRelayV1Mutation } from '@safe-global/store/gateway/AUTO_GENERATED/relay'
import { FEATURES, hasFeature } from '@safe-global/utils/utils/chains'
import { useAppDispatch, useAppSelector } from '@/src/store/hooks'
import { RootState } from '@/src/store'
import { selectActiveSafe } from '@/src/store/activeSafeSlice'
import { selectChainById } from '@/src/store/chains'
import { getPrivateKey } from '@/src/hooks/useSign/useSign'
import Logger from '@/src/utils/logger'
import { removeUndeployedSafe, selectUndeployedSafe } from '../store/undeployedSafesSlice'
import { activateSafeWithRelay, activateSafeWithSigner } from '../logic/activateSafe'

export type ActivateSafeStatus = 'idle' | 'activating' | 'success' | 'error'

/**
 * Deploys the active counterfactual Safe: through the CGW relay when the chain
 * sponsors it, otherwise from the owner signer EOA. On success the
 * counterfactual marker is dropped, which flips the app back to the regular
 * CGW-backed data paths.
 */
export const useActivateSafe = () => {
  const dispatch = useAppDispatch()
  const activeSafe = useAppSelector(selectActiveSafe)
  const undeployedSafe = useAppSelector((state: RootState) =>
    activeSafe ? selectUndeployedSafe(state, activeSafe.address, activeSafe.chainId) : undefined,
  )
  const chain = useAppSelector((state: RootState) =>
    activeSafe ? selectChainById(state, activeSafe.chainId) : undefined,
  )
  const [relayMutation] = useRelayRelayV1Mutation()
  const [status, setStatus] = useState<ActivateSafeStatus>('idle')
  const [error, setError] = useState<string>()

  const activate = useCallback(async () => {
    if (!activeSafe || !undeployedSafe || !chain) {
      return
    }

    setStatus('activating')
    setError(undefined)

    try {
      const canRelay = hasFeature(chain, FEATURES.RELAYING)

      if (canRelay) {
        await activateSafeWithRelay(chain, undeployedSafe.props, activeSafe.address, (args) =>
          relayMutation(args).unwrap(),
        )
      } else {
        const ownerAddress = undeployedSafe.props.safeAccountConfig.owners[0]
        const privateKey = await getPrivateKey(ownerAddress)
        if (!privateKey) {
          throw new Error('The signer key for this account was not found on this device.')
        }
        await activateSafeWithSigner(chain, undeployedSafe.props, privateKey)
      }

      dispatch(removeUndeployedSafe({ address: activeSafe.address, chainId: activeSafe.chainId }))
      setStatus('success')
    } catch (err) {
      Logger.error('ActivateSafe: activation failed', err)
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Failed to activate the account.')
    }
  }, [activeSafe, undeployedSafe, chain, dispatch, relayMutation])

  return { activate, status, error }
}
