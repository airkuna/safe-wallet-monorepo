import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView } from 'react-native'
import { Text, View, getTokenValue } from 'tamagui'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { SafeButton } from '@/src/components/SafeButton'
import { SafeFontIcon } from '@/src/components/SafeFontIcon'
import { RecipientInput } from './components/RecipientInput'
import { RecipientSections } from './components/RecipientSections'
import { ResolvedUsernameCard } from './components/ResolvedUsernameCard'
import { UsernameResolutionHint } from './components/UsernameResolutionHint'
import { AddToAddressBookModal } from './components/AddToAddressBookModal'
import { SuspiciousAddressComparison } from './components/SuspiciousAddressComparison'
import { KnownOtherChainWarning } from './components/KnownOtherChainWarning'
import { useRecipientValidation } from './hooks/useRecipientValidation'
import { useRecipientSearch } from './hooks/useRecipientSearch'
import { useRecipientResolution } from '@/src/custom/identity'
import { useAppSelector } from '@/src/store/hooks'
import { useDefinedActiveSafe } from '@/src/store/hooks/activeSafe'
import { selectChainById } from '@/src/store/chains'
import { IconName } from '@/src/types/iconTypes'

function IconRow({
  icon,
  label,
  onPress,
  testID,
}: {
  icon: IconName
  label: string
  onPress: () => void
  testID: string
}) {
  return (
    <Pressable onPress={onPress} testID={testID}>
      <View flexDirection="row" alignItems="center" gap="$3" paddingVertical="$3" paddingRight="$3">
        <View
          width={40}
          height={40}
          borderRadius={20}
          backgroundColor="$backgroundSkeleton"
          alignItems="center"
          justifyContent="center"
        >
          <SafeFontIcon name={icon} size={24} color="$color" />
        </View>
        <Text fontSize="$5" color="$color">
          {label}
        </Text>
      </View>
    </Pressable>
  )
}

export function SelectRecipientContainer() {
  const router = useRouter()
  const { bottom } = useSafeAreaInsets()
  const { scannedAddress, scanNonce, prefillTokenAddress, prefillValueRaw } = useLocalSearchParams<{
    scannedAddress?: string
    scanNonce?: string
    prefillTokenAddress?: string
    prefillValueRaw?: string
  }>()
  const activeSafe = useDefinedActiveSafe()
  const chain = useAppSelector((state) => selectChainById(state, activeSafe.chainId))
  const chainName = chain?.chainName ?? 'this network'
  const [address, setAddress] = useState('')
  const [recipientName, setRecipientName] = useState<string>()
  const [showAddContact, setShowAddContact] = useState(false)

  useEffect(() => {
    if (scannedAddress) {
      setAddress(scannedAddress)
      setRecipientName(undefined)
    }
  }, [scannedAddress, scanNonce])

  // Username inputs (`@ana` / `ana.brand.eth`) resolve via the identity module; for brands without
  // an `identity` manifest field the hook stays `idle` and everything below is byte-identical.
  const resolution = useRecipientResolution(address)
  const resolvedRecipient = resolution.resolved
  const effectiveAddress = resolution.status === 'idle' ? address : (resolvedRecipient?.address ?? '')

  const validation = useRecipientValidation(effectiveAddress)
  const searchResults = useRecipientSearch(address)

  // Payment-request prefill (deep link / EIP-681 QR) travels with the navigation params so the token
  // and amount steps can pick it up. Forwarded on every continue path — the user can still edit the
  // recipient here; token/amount stay editable downstream.
  const prefillParams = useMemo(
    () => ({
      ...(prefillTokenAddress ? { prefillTokenAddress } : {}),
      ...(prefillValueRaw ? { prefillValueRaw } : {}),
    }),
    [prefillTokenAddress, prefillValueRaw],
  )

  const handleAddressChange = useCallback((text: string) => {
    setAddress(text)
    setRecipientName(undefined)
  }, [])

  const handleSelect = useCallback(
    (selectedAddress: string, name?: string) => {
      router.push({
        pathname: '/(send)/token',
        params: {
          recipientAddress: selectedAddress.trim(),
          ...(name ? { recipientName: name } : {}),
          ...prefillParams,
        },
      })
    },
    [router, prefillParams],
  )

  const handleClear = useCallback(() => {
    setAddress('')
    setRecipientName(undefined)
  }, [])

  const handleQrPress = useCallback(() => {
    router.push('/(send)/scan-qr')
  }, [router])

  const displayName = recipientName ?? validation.contactName
  // Resolved usernames forward `@username` as the recipient name (unless a contact name wins), so
  // the token/amount/confirm screens show the name instead of hex — same param a contact uses.
  const forwardName = displayName ?? (resolvedRecipient ? `@${resolvedRecipient.username}` : undefined)

  const handleContinue = useCallback(() => {
    if (!validation.canContinue) {
      return
    }

    router.push({
      pathname: '/(send)/token',
      params: {
        recipientAddress: effectiveAddress.trim(),
        ...(forwardName ? { recipientName: forwardName } : {}),
        ...prefillParams,
      },
    })
  }, [effectiveAddress, forwardName, validation.canContinue, router, prefillParams])

  const handleSuspiciousSelect = useCallback(
    (selectedAddress: string, name?: string) => {
      router.push({
        pathname: '/(send)/token',
        params: {
          recipientAddress: selectedAddress.trim(),
          ...(name ? { recipientName: name } : {}),
          ...prefillParams,
        },
      })
    },
    [router, prefillParams],
  )

  const handleContactSaved = useCallback(() => {
    setShowAddContact(false)
  }, [])
  const isSuspicious = validation.state === 'suspicious'
  const isKnownOtherChain = validation.state === 'known-other-chain'
  const isSelected = !!displayName
  const hasAddress = validation.state !== 'empty' && validation.state !== 'typing'
  const showBrowseOptions = !isSelected && !hasAddress
  const showAddToAddressBook = !isSelected && validation.state === 'unknown'

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View flex={1}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={Keyboard.dismiss}
          contentContainerStyle={{
            paddingTop: getTokenValue('$6'),
            paddingBottom: getTokenValue('$4'),
            paddingHorizontal: getTokenValue('$4'),
          }}
        >
          {isSuspicious && validation.suspiciousMatch ? (
            <SuspiciousAddressComparison
              suspiciousAddress={effectiveAddress}
              knownAddress={validation.suspiciousMatch.knownAddress}
              knownName={validation.suspiciousMatch.knownName}
              onSelect={handleSuspiciousSelect}
            />
          ) : (
            <View gap="$2">
              {resolvedRecipient ? (
                <ResolvedUsernameCard
                  resolved={resolvedRecipient}
                  validationState={validation.state}
                  chainName={chainName}
                  onClear={handleClear}
                />
              ) : (
                <RecipientInput
                  value={address}
                  onChangeText={handleAddressChange}
                  onClear={handleClear}
                  validationState={validation.state}
                  contactName={validation.contactName}
                  selectedName={displayName}
                  chainName={chainName}
                />
              )}

              <UsernameResolutionHint status={resolution.status} />

              {isKnownOtherChain && validation.contactAddress && (
                <KnownOtherChainWarning
                  contactAddress={validation.contactAddress}
                  chainId={activeSafe.chainId}
                  chainName={chainName}
                />
              )}

              {showAddToAddressBook && (
                <IconRow
                  icon="plus"
                  label="Add to address book"
                  onPress={() => setShowAddContact(true)}
                  testID="add-to-address-book"
                />
              )}

              {showBrowseOptions && (
                <>
                  <IconRow icon="qr-code" label="Scan QR code" onPress={handleQrPress} testID="scan-qr-button" />

                  <RecipientSections
                    safes={searchResults.safes}
                    signers={searchResults.signers}
                    addressBook={searchResults.addressBook}
                    onSelect={handleSelect}
                  />
                </>
              )}
            </View>
          )}
        </ScrollView>

        {!isSuspicious && (
          <View paddingHorizontal="$4" paddingTop="$3" paddingBottom={Math.max(bottom, getTokenValue('$4'))}>
            <SafeButton onPress={handleContinue} disabled={!validation.canContinue} testID="continue-button">
              Continue
            </SafeButton>
          </View>
        )}
      </View>

      <AddToAddressBookModal
        visible={showAddContact}
        address={effectiveAddress}
        suggestedName={resolvedRecipient ? `@${resolvedRecipient.username}` : undefined}
        onClose={() => setShowAddContact(false)}
        onSaved={handleContactSaved}
      />
    </KeyboardAvoidingView>
  )
}
