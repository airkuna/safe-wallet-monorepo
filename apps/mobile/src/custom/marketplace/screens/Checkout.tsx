import React, { useCallback, useMemo, useState } from 'react'
import { useLocalSearchParams } from 'expo-router'
import { ScrollView, Text, XStack, YStack } from 'tamagui'
import type { Eip681Transfer } from '@safe-global/utils/utils/eip681'
import { useAppSelector } from '@/src/store/hooks'
import { selectActiveSafe } from '@/src/store/activeSafeSlice'
import { SafeButton } from '@/src/components/SafeButton'
import { SafeInput } from '@/src/components/SafeInput/SafeInput'
import { Alert } from '@/src/components/Alert'
import { useScannedAddressToSend } from '@/src/features/Send/hooks/useScannedAddressToSend'
import { getMerchant, getProduct } from '../catalog/registry'
import { DEFAULT_CURRENCY } from '../catalog/currency'
import { merchantColors } from '../theme/merchantColors'
import {
  buildOrderReference,
  formatEur,
  isBuyerComplete,
  orderTotals,
  toBaseUnits,
  type BuyerInfo,
  type OrderItem,
} from '../logic/order'
import { addOrder } from '../state/useOrders'
import { mpStrings } from '../strings'

/**
 * Checkout: podaci za dostavu + sažetak → plaćanje trgovčevom Safe-u kroz
 * postojeći Send flow (EIP-681 prefill, isti put kao skenirani QR — provjera
 * rizika primatelja se ne zaobilazi; isti obrazac kao FF Doniraj). Narudžba se
 * sprema lokalno PRIJE navigacije da referenca preživi i prekinuto plaćanje.
 */
export const Checkout = () => {
  const params = useLocalSearchParams<{ merchant?: string; product?: string; size?: string; qty?: string }>()
  const merchant = getMerchant(params.merchant)
  const product = getProduct(merchant, params.product)
  const colors = merchantColors(merchant.brand)
  const activeSafe = useAppSelector(selectActiveSafe)
  const { sendPaymentRequestToRecipient } = useScannedAddressToSend()

  const currency = merchant.currency ?? DEFAULT_CURRENCY

  const [buyer, setBuyer] = useState<BuyerInfo>({
    fullName: '',
    street: '',
    postalCodeAndCity: '',
    email: '',
    phone: '',
  })

  const setField = (field: keyof BuyerInfo) => (value: string) =>
    setBuyer((current) => ({ ...current, [field]: value }))

  const qty = Number(params.qty ?? '1')
  const items = useMemo<OrderItem[]>(() => {
    if (product === undefined || params.size === undefined || !Number.isInteger(qty) || qty <= 0) {
      return []
    }
    return [{ productId: product.id, name: product.name, size: params.size, qty, priceEur: product.priceEur }]
  }, [product, params.size, qty])

  const totals = useMemo(() => orderTotals(items, merchant.shipping), [items, merchant.shipping])
  const valueRaw = useMemo(
    () => (totals === null ? null : toBaseUnits(totals.totalEur, currency.decimals)),
    [totals, currency.decimals],
  )

  const storeInactive = merchant.safeAddress === undefined
  const canPay = activeSafe !== null && !storeInactive && totals !== null && valueRaw !== null && isBuyerComplete(buyer)

  const onPay = useCallback(() => {
    if (activeSafe === null || merchant.safeAddress === undefined || totals === null || valueRaw === null) {
      return
    }

    const nowMs = Date.now()
    const reference = buildOrderReference(merchant.slug, nowMs)
    addOrder({
      id: reference,
      reference,
      merchantSlug: merchant.slug,
      items,
      buyer,
      totals,
      currencySymbol: currency.symbol,
      payerSafeAddress: activeSafe.address,
      status: 'pending',
      createdAtMs: nowMs,
    })

    const transfer: Eip681Transfer = {
      recipient: merchant.safeAddress,
      chainId: currency.chainId,
      tokenAddress: currency.tokenAddress,
      value: valueRaw,
    }
    sendPaymentRequestToRecipient(transfer, 'replace')
  }, [activeSafe, merchant, totals, valueRaw, items, buyer, currency, sendPaymentRequestToRecipient])

  if (product === undefined || totals === null) {
    return null
  }

  return (
    <ScrollView
      flex={1}
      backgroundColor="$background"
      testID="mp-checkout-screen"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingHorizontal: '$4', paddingTop: '$4', paddingBottom: '$10' }}
    >
      <YStack gap="$4">
        <YStack gap="$2">
          <Text fontSize="$5" fontWeight="600">
            {mpStrings.checkout.summary}
          </Text>
          {items.map((item) => (
            <XStack key={item.productId} justifyContent="space-between">
              <Text flex={1} fontSize="$3">
                {item.name} · {item.size} × {item.qty}
              </Text>
              <Text fontSize="$3">{formatEur(totals.itemsEur)} EUR</Text>
            </XStack>
          ))}
          <XStack justifyContent="space-between">
            <Text fontSize="$3" color="$colorSecondary">
              {mpStrings.checkout.shipping}
            </Text>
            <Text fontSize="$3" color="$colorSecondary" testID="mp-checkout-shipping">
              {totals.shippingEur === '0.00' ? mpStrings.checkout.shippingFree : `${formatEur(totals.shippingEur)} EUR`}
            </Text>
          </XStack>
          <XStack justifyContent="space-between">
            <Text fontSize="$4" fontWeight="700">
              {mpStrings.checkout.total}
            </Text>
            <Text fontSize="$4" fontWeight="700" testID="mp-checkout-total">
              {formatEur(totals.totalEur)} EUR
            </Text>
          </XStack>
        </YStack>

        <YStack gap="$2">
          <Text fontSize="$5" fontWeight="600">
            {mpStrings.checkout.delivery}
          </Text>
          <SafeInput
            value={buyer.fullName}
            onChangeText={setField('fullName')}
            placeholder={mpStrings.checkout.fullName}
            testID="mp-checkout-name"
          />
          <SafeInput
            value={buyer.street}
            onChangeText={setField('street')}
            placeholder={mpStrings.checkout.street}
            testID="mp-checkout-street"
          />
          <SafeInput
            value={buyer.postalCodeAndCity}
            onChangeText={setField('postalCodeAndCity')}
            placeholder={mpStrings.checkout.postalCodeAndCity}
            testID="mp-checkout-city"
          />
          <SafeInput
            value={buyer.email}
            onChangeText={setField('email')}
            keyboardType="email-address"
            placeholder={mpStrings.checkout.email}
            testID="mp-checkout-email"
          />
          <SafeInput
            value={buyer.phone ?? ''}
            onChangeText={setField('phone')}
            keyboardType="phone-pad"
            placeholder={mpStrings.checkout.phone}
            testID="mp-checkout-phone"
          />
        </YStack>

        {activeSafe === null && (
          <Alert
            type="warning"
            message={mpStrings.checkout.noActiveAccount}
            displayIcon
            testID="mp-checkout-no-account"
          />
        )}

        {activeSafe !== null && storeInactive && (
          <Alert type="info" message={mpStrings.checkout.storeInactive} displayIcon testID="mp-checkout-inactive" />
        )}

        <SafeButton
          disabled={!canPay}
          onPress={canPay ? onPay : undefined}
          backgroundColor={canPay ? colors.primary : undefined}
          textColor={canPay ? colors.onPrimary : undefined}
          testID="mp-checkout-pay"
        >
          {mpStrings.checkout.pay} {formatEur(totals.totalEur)} {currency.symbol}
        </SafeButton>

        <Text fontSize="$2" color="$colorSecondary" textAlign="center">
          {mpStrings.checkout.invoiceNote}
        </Text>
      </YStack>
    </ScrollView>
  )
}
