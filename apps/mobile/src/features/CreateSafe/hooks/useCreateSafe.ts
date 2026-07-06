import { useCallback, useState } from 'react'
import { Wallet } from 'ethers'
import type { Chain } from '@safe-global/store/gateway/AUTO_GENERATED/chains'
import { PendingSafeStatus } from '@safe-global/utils/features/counterfactual/store/types'
import type { PayMethod } from '@safe-global/utils/features/counterfactual/types'
import { useAppDispatch } from '@/src/store/hooks'
import { storePrivateKey } from '@/src/hooks/useSign/useSign'
import { addSignerWithEffects } from '@/src/store/signerThunks'
import { addSafe } from '@/src/store/safesSlice'
import { setActiveSafe } from '@/src/store/activeSafeSlice'
import { setActiveSigner } from '@/src/store/activeSignerSlice'
import { upsertContact } from '@/src/store/addressBookSlice'
import { Address } from '@/src/types/address'
import { Signer } from '@/src/store/signersSlice'
import Logger from '@/src/utils/logger'
import { addUndeployedSafe } from '../store/undeployedSafesSlice'
import { predictNewSafeAddress } from '../logic/predictNewSafeAddress'
import { buildCounterfactualOverview } from '../logic/buildCounterfactualOverview'

export type CreateSafeStatus = 'idle' | 'creating' | 'error'

/**
 * Creates a new counterfactual 1/1 Safe: generates a fresh local signer,
 * stores it in the existing hardware-backed keystore, predicts the CREATE2
 * address and records the account in the store — all without any on-chain
 * transaction. The Safe deploys with its first outgoing transaction.
 */
export const useCreateSafe = () => {
  const dispatch = useAppDispatch()
  const [status, setStatus] = useState<CreateSafeStatus>('idle')
  const [error, setError] = useState<string>()

  const createSafe = useCallback(
    async (name: string, chain: Chain): Promise<Address | undefined> => {
      setStatus('creating')
      setError(undefined)

      try {
        const wallet = Wallet.createRandom()
        const { address, props } = await predictNewSafeAddress(chain, wallet.address)

        // Persisting the key is the first side effect: if the user cancels the
        // biometric prompt nothing has been written to the store yet.
        await storePrivateKey(wallet.address, wallet.privateKey)

        const signer: Signer = { value: wallet.address, type: 'private-key' }
        const safeAddress = address as Address

        await dispatch(addSignerWithEffects(signer))
        dispatch(
          addUndeployedSafe({
            address: safeAddress,
            chainId: chain.chainId,
            undeployedSafe: {
              props,
              status: {
                status: PendingSafeStatus.AWAITING_EXECUTION,
                type: 'PayLater' as PayMethod,
              },
            },
          }),
        )
        dispatch(
          addSafe({
            address: safeAddress,
            info: {
              [chain.chainId]: buildCounterfactualOverview({
                address,
                chainId: chain.chainId,
                owners: [wallet.address],
                threshold: 1,
              }),
            },
          }),
        )
        dispatch(upsertContact({ value: address, name, chainIds: [chain.chainId] }))
        dispatch(setActiveSafe({ address: safeAddress, chainId: chain.chainId }))
        dispatch(setActiveSigner({ safeAddress, signer }))

        setStatus('idle')
        return safeAddress
      } catch (err) {
        Logger.error('CreateSafe: failed to create a new account', err)
        setStatus('error')
        setError(err instanceof Error ? err.message : 'Failed to create the account.')
        return undefined
      }
    },
    [dispatch],
  )

  return { createSafe, status, error }
}
