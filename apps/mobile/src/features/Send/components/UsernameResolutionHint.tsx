import React from 'react'
import { Text, View } from 'tamagui'
import { Loader } from '@/src/components/Loader'
import { SafeFontIcon } from '@/src/components/SafeFontIcon'
import type { RecipientResolutionStatus } from '@/src/custom/identity'

const hintConfig: Partial<Record<RecipientResolutionStatus, { icon?: 'info' | 'alert'; text: string }>> = {
  resolving: { text: 'Looking up name…' },
  'not-found': { icon: 'info', text: 'Name not found' },
  error: { icon: 'alert', text: "Couldn't check this name. You can still enter an address." },
}

/**
 * Inline hint under the recipient input while a `@username` input is being
 * resolved by the identity module. Renders nothing for idle/resolved states,
 * so brands without identity never see it.
 */
export function UsernameResolutionHint({ status }: { status: RecipientResolutionStatus }) {
  const hint = hintConfig[status]

  if (!hint) {
    return null
  }

  return (
    <View flexDirection="row" alignItems="center" gap="$2" paddingLeft={4} testID={`username-hint-${status}`}>
      {hint.icon ? (
        <SafeFontIcon name={hint.icon} size={14} color="$colorSecondary" />
      ) : (
        <Loader size={14} color="$colorSecondary" />
      )}
      <Text fontSize="$3" color="$colorSecondary">
        {hint.text}
      </Text>
    </View>
  )
}
