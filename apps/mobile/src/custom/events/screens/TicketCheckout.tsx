import React, { useCallback, useMemo, useState } from 'react'
import { TouchableOpacity } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { ScrollView, Text, XStack, YStack } from 'tamagui'
import type { Eip681Transfer } from '@safe-global/utils/utils/eip681'
import { useAppSelector } from '@/src/store/hooks'
import { selectActiveSafe } from '@/src/store/activeSafeSlice'
import { SafeButton } from '@/src/components/SafeButton'
import { SafeInput } from '@/src/components/SafeInput/SafeInput'
import { Alert } from '@/src/components/Alert'
import { useScannedAddressToSend } from '@/src/features/Send/hooks/useScannedAddressToSend'
import { getEvent, getTier } from '../catalog/registry'
import { DEFAULT_CURRENCY } from '../catalog/currency'
import {
  DEFAULT_MAX_PER_ORDER,
  buildTicketReference,
  formatEur,
  holdersComplete,
  ticketTotals,
  toBaseUnits,
  type TicketHolder,
} from '../logic/ticketOrder'
import { addTicketOrder } from '../state/useTickets'
import { evStrings } from '../strings'

/**
 * Kupnja ulaznica: količina + imena holdera (imenski tieri) + sažetak →
 * plaćanje organizatorovom Safe-u kroz postojeći Send flow (EIP-681 prefill,
 * isti put kao skenirani QR — provjera rizika primatelja se ne zaobilazi;
 * isti obrazac kao Tržnica Checkout). Narudžba se sprema lokalno PRIJE
 * navigacije da referenca preživi i prekinuto plaćanje.
 */
export const TicketCheckout = () => {
  const params = useLocalSearchParams<{ event?: string; tier?: string }>()
  const event = getEvent(params.event)
  const tier = getTier(event, params.tier)
  const activeSafe = useAppSelector(selectActiveSafe)
  const { sendPaymentRequestToRecipient } = useScannedAddressToSend()

  const currency = event.currency ?? DEFAULT_CURRENCY
  const maxQty = tier?.maxPoNarudzbi ?? DEFAULT_MAX_PER_ORDER

  const [qty, setQty] = useState(1)
  const [holders, setHolders] = useState<TicketHolder[]>([{ fullName: '', email: '' }])

  const setHolderField = (index: number, field: keyof TicketHolder) => (value: string) =>
    setHolders((current) => current.map((holder, i) => (i === index ? { ...holder, [field]: value } : holder)))

  const changeQty = (delta: number) => {
    setQty((current) => {
      const next = Math.min(Math.max(current + delta, 1), maxQty)
      setHolders((currentHolders) => {
        const grown = [...currentHolders]
        while (grown.length < next) {
          grown.push({ fullName: '', email: '' })
        }
        return grown.slice(0, Math.max(next, 1))
      })
      return next
    })
  }

  const totals = useMemo(() => (tier === undefined ? null : ticketTotals(tier, qty)), [tier, qty])
  const valueRaw = useMemo(
    () => (totals === null ? null : toBaseUnits(totals.totalEur, currency.decimals)),
    [totals, currency.decimals],
  )

  const eventInactive = event.safeAddress === undefined
  const holdersOk = tier !== undefined && holdersComplete(tier, holders, qty)
  const canPay = activeSafe !== null && !eventInactive && totals !== null && valueRaw !== null && holdersOk

  const onPay = useCallback(() => {
    if (
      activeSafe === null ||
      event.safeAddress === undefined ||
      tier === undefined ||
      totals === null ||
      valueRaw === null
    ) {
      return
    }

    const nowMs = Date.now()
    const reference = buildTicketReference(event.slug, nowMs)
    addTicketOrder({
      id: reference,
      reference,
      eventSlug: event.slug,
      tierId: tier.id,
      quantity: qty,
      holders: tier.imenska ? holders.slice(0, qty) : [],
      totals,
      currencySymbol: currency.symbol,
      payerSafeAddress: activeSafe.address,
      status: 'pending',
      createdAtMs: nowMs,
    })

    const transfer: Eip681Transfer = {
      recipient: event.safeAddress,
      chainId: currency.chainId,
      tokenAddress: currency.tokenAddress,
      value: valueRaw,
    }
    sendPaymentRequestToRecipient(transfer, 'replace')
  }, [activeSafe, event, tier, totals, valueRaw, qty, holders, currency, sendPaymentRequestToRecipient])

  if (tier === undefined || totals === null) {
    return null
  }

  return (
    <ScrollView
      flex={1}
      backgroundColor="$background"
      testID="ev-checkout-screen"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingHorizontal: '$4', paddingTop: '$4', paddingBottom: '$10' }}
    >
      <YStack gap="$4">
        <YStack gap="$1">
          <Text fontSize="$5" fontWeight="600">
            {event.naziv}
          </Text>
          <Text fontSize="$3" color="$colorSecondary">
            {tier.naziv} · {formatEur(totals.unitEur)} EUR
          </Text>
          {tier.napomena !== undefined && (
            <Text fontSize="$2" color="$colorSecondary">
              {tier.napomena}
            </Text>
          )}
        </YStack>

        <YStack gap="$2">
          <Text fontSize="$5" fontWeight="600">
            {evStrings.checkout.quantity}
          </Text>
          <XStack alignItems="center" gap="$4">
            <TouchableOpacity onPress={() => changeQty(-1)} testID="ev-checkout-qty-minus">
              <XStack
                width={40}
                height={40}
                borderRadius={20}
                alignItems="center"
                justifyContent="center"
                backgroundColor="$backgroundSecondary"
              >
                <Text fontSize="$6">−</Text>
              </XStack>
            </TouchableOpacity>
            <Text fontSize="$6" fontWeight="700" testID="ev-checkout-qty">
              {qty}
            </Text>
            <TouchableOpacity onPress={() => changeQty(1)} testID="ev-checkout-qty-plus">
              <XStack
                width={40}
                height={40}
                borderRadius={20}
                alignItems="center"
                justifyContent="center"
                backgroundColor="$backgroundSecondary"
              >
                <Text fontSize="$6">+</Text>
              </XStack>
            </TouchableOpacity>
          </XStack>
        </YStack>

        {tier.imenska && (
          <YStack gap="$2">
            <Text fontSize="$5" fontWeight="600">
              {evStrings.checkout.holders}
            </Text>
            {holders.slice(0, qty).map((holder, index) => (
              <YStack key={index} gap="$2">
                <Text fontSize="$3" color="$colorSecondary">
                  {evStrings.checkout.ticketLabel} {index + 1}
                </Text>
                <SafeInput
                  value={holder.fullName}
                  onChangeText={setHolderField(index, 'fullName')}
                  placeholder={evStrings.checkout.holderName}
                  testID={`ev-checkout-holder-name-${index}`}
                />
                <SafeInput
                  value={holder.email ?? ''}
                  onChangeText={setHolderField(index, 'email')}
                  keyboardType="email-address"
                  placeholder={evStrings.checkout.holderEmail}
                  testID={`ev-checkout-holder-email-${index}`}
                />
              </YStack>
            ))}
          </YStack>
        )}

        <XStack justifyContent="space-between">
          <Text fontSize="$4" fontWeight="700">
            {evStrings.checkout.total}
          </Text>
          <Text fontSize="$4" fontWeight="700" testID="ev-checkout-total">
            {formatEur(totals.totalEur)} EUR
          </Text>
        </XStack>

        {activeSafe === null && (
          <Alert
            type="warning"
            message={evStrings.checkout.noActiveAccount}
            displayIcon
            testID="ev-checkout-no-account"
          />
        )}

        {activeSafe !== null && eventInactive && (
          <Alert type="info" message={evStrings.checkout.eventInactive} displayIcon testID="ev-checkout-inactive" />
        )}

        <SafeButton disabled={!canPay} onPress={canPay ? onPay : undefined} testID="ev-checkout-pay">
          {evStrings.checkout.pay} {formatEur(totals.totalEur)} {currency.symbol}
        </SafeButton>

        <Text fontSize="$2" color="$colorSecondary" textAlign="center">
          {evStrings.checkout.directNote}
        </Text>
      </YStack>
    </ScrollView>
  )
}
