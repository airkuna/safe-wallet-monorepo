import React from 'react'
import { KeyboardAvoidingView } from 'react-native'
import { ScrollView, Text, View, YStack } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LargeHeaderTitle } from '@/src/components/Title/LargeHeaderTitle'
import { SafeInput } from '@/src/components/SafeInput/SafeInput'
import { SafeButton } from '@/src/components/SafeButton'
import { Alert } from '@/src/components/Alert'
import type { UsernameAvailability } from '../../hooks/useUsernameAvailability'

type UsernameStepViewProps = {
  username: string
  onUsernameChange: (username: string) => void
  availability: UsernameAvailability
  /** Full ENS name preview (`ana.kuna.eth`) for the current input. */
  fullEnsName?: string
  onConfirm: () => void
  onSkip: () => void
  isRegistering: boolean
  error?: string
}

const HINTS: Record<Exclude<UsernameAvailability, 'idle' | 'available'>, string> = {
  checking: 'Checking availability…',
  taken: 'This name is already taken',
  invalid: 'Use 3–32 characters: lowercase letters, numbers and hyphens',
  reserved: 'This name is reserved',
  'unavailable-service': 'The name service is unreachable right now. You can register a name later.',
}

export const UsernameStepView = ({
  username,
  onUsernameChange,
  availability,
  fullEnsName,
  onConfirm,
  onSkip,
  isRegistering,
  error,
}: UsernameStepViewProps) => {
  const { top, bottom } = useSafeAreaInsets()
  const canConfirm = availability === 'available' && !isRegistering

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }} keyboardVerticalOffset={bottom + top}>
      <YStack flex={1} testID="create-safe-username-screen">
        <ScrollView flex={1} contentContainerStyle={{ paddingBottom: '$4', paddingHorizontal: '$4' }}>
          <LargeHeaderTitle marginBottom={'$4'}>Choose your name</LargeHeaderTitle>
          <Text>
            Pick a name others can use to send you money — no long addresses needed. This is optional and you can set it
            up later.
          </Text>

          <View marginTop={'$4'}>
            <SafeInput
              value={username}
              onChangeText={onUsernameChange}
              autoFocus={true}
              placeholder="yourname"
              success={availability === 'available'}
              testID="create-safe-username-input"
            />
          </View>

          <View marginTop={'$2'} minHeight={'$4'}>
            {availability === 'available' && fullEnsName && (
              <Text color="$success" testID="create-safe-username-available">
                {fullEnsName} is available
              </Text>
            )}
            {availability !== 'idle' && availability !== 'available' && (
              <Text color="$colorSecondary" testID={`create-safe-username-${availability}`}>
                {HINTS[availability]}
              </Text>
            )}
          </View>

          {error && (
            <View marginTop={'$4'}>
              <Alert type="error" message={error} displayIcon testID="create-safe-username-error" />
            </View>
          )}
        </ScrollView>

        <YStack paddingHorizontal={'$4'} paddingBottom={bottom || '$4'} gap={'$2'}>
          <SafeButton
            onPress={canConfirm ? onConfirm : undefined}
            disabled={!canConfirm}
            loading={isRegistering}
            loadingText="Registering name…"
            testID="create-safe-username-submit"
          >
            Claim name
          </SafeButton>
          <SafeButton text onPress={isRegistering ? undefined : onSkip} testID="create-safe-username-skip">
            Skip for now
          </SafeButton>
        </YStack>
      </YStack>
    </KeyboardAvoidingView>
  )
}
