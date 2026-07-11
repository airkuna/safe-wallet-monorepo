import React, { useCallback } from 'react'
import { Share } from 'react-native'
import { ScrollView, Text, XStack, YStack } from 'tamagui'
import { SafeButton } from '@/src/components/SafeButton'
import { getMerchant } from '../catalog/registry'
import { composeOrderMessage, formatEur } from '../logic/order'
import { setOrderStatus, useOrders, type Order } from '../state/useOrders'
import { mpStrings } from '../strings'

/**
 * Lokalna knjiga narudžbi + MVP kanal prema trgovcu: share sheet s tekstom
 * narudžbe (backend order-book je faza M2). Slanje označava narudžbu kao
 * "sent" tek nakon što share sheet nije odbačen.
 */
export const MojeNarudzbe = () => {
  const orders = useOrders()

  const onShare = useCallback(async (order: Order) => {
    const merchant = getMerchant(order.merchantSlug)
    const message = composeOrderMessage({
      reference: order.reference,
      merchant,
      items: order.items,
      buyer: order.buyer,
      totals: order.totals,
      currencySymbol: order.currencySymbol,
      payerSafeAddress: order.payerSafeAddress,
    })
    const result = await Share.share({ message })
    if (result.action === Share.sharedAction) {
      setOrderStatus(order.id, 'sent')
    }
  }, [])

  return (
    <ScrollView
      flex={1}
      backgroundColor="$backgroundPaper"
      testID="mp-orders-screen"
      contentContainerStyle={{ padding: '$4', paddingBottom: '$10' }}
    >
      <YStack gap="$3">
        {orders.length === 0 && (
          <Text fontSize="$3" color="$colorSecondary" testID="mp-orders-empty">
            {mpStrings.orders.empty}
          </Text>
        )}

        {orders.map((order) => {
          const merchant = getMerchant(order.merchantSlug)
          return (
            <YStack key={order.id} backgroundColor="$background" borderRadius="$4" padding="$4" gap="$2">
              <XStack justifyContent="space-between" alignItems="center">
                <Text fontSize="$4" fontWeight="600">
                  {merchant.name}
                </Text>
                <Text fontSize="$2" color="$colorSecondary">
                  {new Date(order.createdAtMs).toLocaleDateString('hr-HR')}
                </Text>
              </XStack>

              {order.items.map((item) => (
                <Text key={`${order.id}-${item.productId}-${item.size}`} fontSize="$3" color="$colorSecondary">
                  {item.name} · {item.size} × {item.qty}
                </Text>
              ))}

              <XStack justifyContent="space-between">
                <Text fontSize="$3" color="$colorSecondary">
                  {mpStrings.orders.reference}: {order.reference}
                </Text>
                <Text fontSize="$3" fontWeight="700">
                  {formatEur(order.totals.totalEur)} EUR
                </Text>
              </XStack>

              <Text fontSize="$2" color="$colorSecondary" testID={`mp-order-status-${order.id}`}>
                {mpStrings.orders.status[order.status]}
              </Text>

              <SafeButton size="$sm" onPress={() => void onShare(order)} testID={`mp-order-share-${order.id}`}>
                {mpStrings.orders.share}
              </SafeButton>
            </YStack>
          )
        })}

        {orders.length > 0 && (
          <Text fontSize="$2" color="$colorSecondary" textAlign="center">
            {mpStrings.orders.shareHint}
          </Text>
        )}
      </YStack>
    </ScrollView>
  )
}
