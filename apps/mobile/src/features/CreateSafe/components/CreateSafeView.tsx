import React from 'react'
import { KeyboardAvoidingView, TouchableOpacity } from 'react-native'
import { ScrollView, Text, View, YStack } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { Chain } from '@safe-global/store/gateway/AUTO_GENERATED/chains'
import { LargeHeaderTitle } from '@/src/components/Title/LargeHeaderTitle'
import { SafeInput } from '@/src/components/SafeInput/SafeInput'
import { SafeButton } from '@/src/components/SafeButton'
import { SafeFontIcon } from '@/src/components/SafeFontIcon'
import { Logo } from '@/src/components/Logo'
import { Alert } from '@/src/components/Alert'

type CreateSafeViewProps = {
  name: string
  onNameChange: (name: string) => void
  chains: Chain[]
  selectedChainId?: string
  onSelectChain: (chainId: string) => void
  onCreate: () => void
  isCreating: boolean
  error?: string
}

export const CreateSafeView = ({
  name,
  onNameChange,
  chains,
  selectedChainId,
  onSelectChain,
  onCreate,
  isCreating,
  error,
}: CreateSafeViewProps) => {
  const { top, bottom } = useSafeAreaInsets()
  const canCreate = Boolean(selectedChainId) && !isCreating

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }} keyboardVerticalOffset={bottom + top}>
      <YStack flex={1} testID="create-safe-screen">
        <ScrollView flex={1} contentContainerStyle={{ paddingBottom: '$4', paddingHorizontal: '$4' }}>
          <LargeHeaderTitle marginBottom={'$4'}>Create account</LargeHeaderTitle>
          <Text>
            Your new account gets its address instantly and can receive funds right away. It activates on-chain with
            your first transaction — no upfront network fees.
          </Text>

          <View marginTop={'$4'}>
            <SafeInput
              value={name}
              onChangeText={onNameChange}
              autoFocus={true}
              placeholder="Enter account name here"
              testID="create-safe-name-input"
            />
          </View>

          <Text marginTop={'$6'} marginBottom={'$2'} color="$colorSecondary">
            Network
          </Text>
          <YStack gap={'$2'}>
            {chains.map((chain) => {
              const isSelected = chain.chainId === selectedChainId
              return (
                <TouchableOpacity
                  key={chain.chainId}
                  onPress={() => onSelectChain(chain.chainId)}
                  testID={`create-safe-chain-${chain.chainId}`}
                >
                  <View
                    flexDirection="row"
                    alignItems="center"
                    justifyContent="space-between"
                    paddingVertical="$3"
                    paddingHorizontal="$3"
                    borderRadius={'$4'}
                    backgroundColor={isSelected ? '$backgroundSecondary' : 'transparent'}
                  >
                    <View flexDirection="row" alignItems="center" gap="$2">
                      <Logo logoUri={chain.chainLogoUri} size="$6" />
                      <Text fontSize="$4">{chain.chainName}</Text>
                    </View>
                    {isSelected && <SafeFontIcon name="check" size={18} color="$color" />}
                  </View>
                </TouchableOpacity>
              )
            })}
            {chains.length === 0 && <Text color="$colorSecondary">Loading networks…</Text>}
          </YStack>

          {error && (
            <View marginTop={'$4'}>
              <Alert type="error" message={error} displayIcon testID="create-safe-error" />
            </View>
          )}
        </ScrollView>

        <View paddingHorizontal={'$4'} paddingBottom={bottom || '$4'}>
          <SafeButton
            onPress={canCreate ? onCreate : undefined}
            disabled={!canCreate}
            loading={isCreating}
            loadingText="Creating account…"
            testID="create-safe-submit"
          >
            Create account
          </SafeButton>
        </View>
      </YStack>
    </KeyboardAvoidingView>
  )
}
