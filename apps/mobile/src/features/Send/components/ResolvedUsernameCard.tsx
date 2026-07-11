import React, { useCallback, useState } from 'react'
import { Pressable } from 'react-native'
import { Text, View } from 'tamagui'
import { SafeFontIcon } from '@/src/components/SafeFontIcon'
import { Identicon } from '@/src/components/Identicon'
import { shortenAddress } from '@/src/utils/formatters'
import { useCopyAndDispatchToast } from '@/src/hooks/useCopyAndDispatchToast'
import type { ResolvedRecipient } from '@/src/custom/identity'
import type { Address } from '@/src/types/address'
import { borderColors, RecipientLabel } from './RecipientInput'
import type { RecipientValidationState } from '../hooks/useRecipientValidation'

interface ResolvedUsernameCardProps {
  resolved: ResolvedRecipient
  validationState: RecipientValidationState
  chainName?: string
  onClear: () => void
}

/**
 * Recipient card for a username resolved via the identity module. Shows the
 * `@username` and full ENS name; the hex address stays shortened until the
 * user explicitly taps it (tap again to copy the full address).
 */
export function ResolvedUsernameCard({ resolved, validationState, chainName, onClear }: ResolvedUsernameCardProps) {
  const [showAddress, setShowAddress] = useState(false)
  const copyAddress = useCopyAndDispatchToast()

  const handleAddressPress = useCallback(() => {
    if (showAddress) {
      copyAddress(resolved.address)
    } else {
      setShowAddress(true)
    }
  }, [showAddress, copyAddress, resolved.address])

  return (
    <View gap="$2">
      <View flexDirection="row" alignItems="center" gap="$1" paddingLeft={4}>
        <RecipientLabel validationState={validationState} chainName={chainName} />
      </View>
      <View
        flexDirection="row"
        alignItems="center"
        gap="$3"
        borderWidth={1}
        borderColor={borderColors[validationState]}
        borderRadius={8}
        padding="$4"
        minHeight={64}
        backgroundColor="transparent"
        testID="resolved-username-card"
      >
        <Identicon address={resolved.address as Address} size={32} rounded />
        <View flex={1} gap={2}>
          <Text fontSize="$4" fontWeight={600} color="$color" testID="resolved-username">
            @{resolved.username}
          </Text>
          <Text fontSize="$3" color="$colorSecondary" testID="resolved-ens-name">
            {resolved.ensName}
          </Text>
          <Pressable onPress={handleAddressPress} hitSlop={8} testID="resolved-address-toggle">
            <Text fontSize="$3" color="$colorSecondary">
              {showAddress ? resolved.address : shortenAddress(resolved.address, 4)}
            </Text>
          </Pressable>
        </View>
        <Pressable onPress={onClear} hitSlop={12} testID="clear-recipient-button">
          <SafeFontIcon name="close" size={16} color="$colorSecondary" />
        </Pressable>
      </View>
    </View>
  )
}
