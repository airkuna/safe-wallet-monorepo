import React, { useState } from 'react'
import { ScrollView, Text, YStack } from 'tamagui'
import { SafeButton } from '@/src/components/SafeButton'
import { SafeInput } from '@/src/components/SafeInput/SafeInput'
import { evStrings } from '../strings'

/**
 * Unos pristupnog tokena (GoTrue JWT org admina) — zajednički za Skener ulaza
 * (E3) i organizatorski mod (E4; isti token, isti MMKV store useScannerAuth).
 * Token je TRANSPORT kredencijala, ne autorizacija: svaka akcija se
 * autorizira server-side (org admin role u RPC-ima).
 */
export const TokenGate = ({ onSave, testIDPrefix }: { onSave: (token: string) => void; testIDPrefix: string }) => {
  const [draft, setDraft] = useState('')

  return (
    <ScrollView
      flex={1}
      backgroundColor="$backgroundPaper"
      testID={`${testIDPrefix}-token-gate`}
      contentContainerStyle={{ padding: '$4' }}
    >
      <YStack gap="$3">
        <Text fontSize="$6" fontWeight="700">
          {evStrings.scanner.tokenTitle}
        </Text>
        <Text fontSize="$3" color="$colorSecondary">
          {evStrings.scanner.tokenHint}
        </Text>
        <SafeInput
          value={draft}
          onChangeText={setDraft}
          placeholder={evStrings.scanner.tokenPlaceholder}
          autoCapitalize="none"
          autoCorrect={false}
          testID={`${testIDPrefix}-token-input`}
        />
        <SafeButton
          disabled={draft.trim().length === 0}
          onPress={() => onSave(draft)}
          testID={`${testIDPrefix}-token-save`}
        >
          {evStrings.scanner.tokenSave}
        </SafeButton>
      </YStack>
    </ScrollView>
  )
}
