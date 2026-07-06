import React from 'react'
import { Platform, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native'
import { Text, View, XStack, YStack, useTheme } from 'tamagui'
import QRCodeStyled from 'react-native-qrcode-styled'
import { ToastViewport } from '@tamagui/toast'
import { Container } from '@/src/components/Container'
import { SafeButton } from '@/src/components/SafeButton'
import { SafeFontIcon } from '@/src/components/SafeFontIcon'
import { Logo } from '@/src/components/Logo'
import type { RequestTokenOption } from './useRequestAmount'

type RequestAmountViewProps = {
  tokenOptions: RequestTokenOption[]
  selectedToken: RequestTokenOption
  onSelectToken: (key: string) => void
  amount: string
  onAmountChange: (text: string) => void
  eip681Uri: string
  onShareLink: () => void
  onCopyLink: () => void
}

export const RequestAmountView = ({
  tokenOptions,
  selectedToken,
  onSelectToken,
  amount,
  onAmountChange,
  eip681Uri,
  onShareLink,
  onCopyLink,
}: RequestAmountViewProps) => {
  const theme = useTheme()

  return (
    <>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>
        <YStack gap="$5" alignItems="center">
          <XStack alignItems="center" gap="$2" justifyContent="center">
            <TextInput
              value={amount}
              onChangeText={onAmountChange}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={String(theme.colorSecondary.get())}
              style={[styles.amountInput, { color: String(theme.color.get()) }]}
              autoFocus
              testID="request-amount-input"
            />
            <Text fontSize="$8" fontWeight={600} color="$colorSecondary">
              {selectedToken.symbol}
            </Text>
          </XStack>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <XStack gap="$2" paddingHorizontal="$1">
              {tokenOptions.map((option) => {
                const isSelected = option.key === selectedToken.key
                return (
                  <Pressable
                    key={option.key}
                    onPress={() => onSelectToken(option.key)}
                    accessibilityRole="button"
                    accessibilityLabel={`Request in ${option.symbol}`}
                    testID={`request-token-${option.key}`}
                  >
                    <XStack
                      alignItems="center"
                      gap="$2"
                      paddingHorizontal="$3"
                      paddingVertical="$2"
                      borderRadius={20}
                      borderWidth={1}
                      borderColor={isSelected ? '$color' : '$borderLight'}
                      backgroundColor={isSelected ? '$backgroundSkeleton' : 'transparent'}
                    >
                      <Logo logoUri={option.logoUri ?? undefined} size="$5" />
                      <Text fontSize="$4" fontWeight={isSelected ? 600 : 400}>
                        {option.symbol}
                      </Text>
                    </XStack>
                  </Pressable>
                )
              })}
            </XStack>
          </ScrollView>

          <Container maxWidth={220}>
            <View style={styles.qrRoot} testID="request-amount-qr">
              <QRCodeStyled
                data={eip681Uri}
                style={styles.qrSvg}
                padding={16}
                pieceCornerType={'rounded'}
                pieceBorderRadius={3}
                isPiecesGlued
                color={'#000'}
                errorCorrectionLevel={'Q'}
              />
            </View>
            <Text marginTop="$3" fontSize="$3" color="$colorLight" textAlign="center">
              Scan with any wallet or share the link below
            </Text>
          </Container>

          <XStack gap="$3">
            <SafeButton
              size={'$sm'}
              onPress={onShareLink}
              icon={<SafeFontIcon name={'export'} size={16} />}
              testID="request-share-link"
            >
              Share link
            </SafeButton>
            <SafeButton
              size={'$sm'}
              onPress={onCopyLink}
              icon={<SafeFontIcon name={'copy'} size={16} />}
              secondary
              testID="request-copy-link"
            >
              Copy link
            </SafeButton>
          </XStack>
        </YStack>
      </ScrollView>
      {Platform.OS === 'ios' && <ToastViewport multipleToasts={false} left={0} right={0} />}
    </>
  )
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
    paddingTop: 24,
  },
  amountInput: {
    fontSize: 40,
    fontWeight: '600',
    minWidth: 80,
    textAlign: 'right',
    padding: 0,
  },
  qrRoot: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrSvg: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    flex: 1,
  },
})
