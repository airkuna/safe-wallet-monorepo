import React from 'react'
import { View } from 'tamagui'
import { Alert } from '@/src/components/Alert'
import { SafeButton } from '@/src/components/SafeButton'
import { useAppSelector } from '@/src/store/hooks'
import { RootState } from '@/src/store'
import { selectActiveSafe } from '@/src/store/activeSafeSlice'
import { selectChainById } from '@/src/store/chains'
import { selectIsUndeployedSafe } from '../../store/undeployedSafesSlice'
import { useNativeBalance } from '../../hooks/useNativeBalance'
import { useActivateSafe } from '../../hooks/useActivateSafe'

/**
 * Shown on the home screen while the active account is counterfactual (not
 * deployed yet). Renders nothing for regular accounts, so it is safe to mount
 * unconditionally.
 */
export const CounterfactualBannerContainer = () => {
  const activeSafe = useAppSelector(selectActiveSafe)
  const isUndeployed = useAppSelector((state: RootState) =>
    activeSafe ? selectIsUndeployedSafe(state, activeSafe.address, activeSafe.chainId) : false,
  )
  const chain = useAppSelector((state: RootState) =>
    activeSafe ? selectChainById(state, activeSafe.chainId) : undefined,
  )
  const balance = useNativeBalance(isUndeployed ? chain : undefined, isUndeployed ? activeSafe?.address : undefined)
  const { activate, status, error } = useActivateSafe()

  if (!isUndeployed) {
    return null
  }

  const info = balance
    ? `Balance: ${balance}. You can receive funds now — activate the account to start sending.`
    : 'You can receive funds now — activate the account to start sending.'

  return (
    <View marginBottom="$3" testID="counterfactual-banner">
      <Alert type="info" displayIcon message="Account not activated yet" info={info} />
      <View marginTop="$2">
        <SafeButton
          onPress={status === 'activating' ? undefined : activate}
          disabled={status === 'activating'}
          loading={status === 'activating'}
          loadingText="Activating account…"
          testID="counterfactual-activate"
        >
          Activate account
        </SafeButton>
      </View>
      {status === 'error' && error && (
        <View marginTop="$2">
          <Alert type="warning" displayIcon message={error} testID="counterfactual-activate-error" />
        </View>
      )}
    </View>
  )
}
