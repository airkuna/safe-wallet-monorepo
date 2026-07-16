import React, { useCallback } from 'react'
import { Share } from 'react-native'
import { ScrollView, Text, XStack, YStack } from 'tamagui'
import { SafeButton } from '@/src/components/SafeButton'
import { useTicketSync } from '../api/useTicketSync'
import { getEvent, getTier } from '../catalog/registry'
import { composeTicketOrderMessage, formatEur } from '../logic/ticketOrder'
import { useTicketOrders, type TicketOrder } from '../state/useTickets'
import { evStrings } from '../strings'

/**
 * Lokalna knjiga narudžbi + backend sync (E2): na mount se retroaktivno
 * potvrde uplate (tx hash → events-confirm) i povuku izdane ulaznice sa
 * serialom, holderom i jednokratno isporučenim QR tokenom. Bez backenda
 * ekran radi točno kao u E1 (share sheet prema organizatoru).
 */
export const MojeUlaznice = () => {
  const orders = useTicketOrders()
  const { syncing } = useTicketSync()

  const onShare = useCallback(async (order: TicketOrder) => {
    const event = getEvent(order.eventSlug)
    const tier = getTier(event, order.tierId)
    if (tier === undefined) {
      return
    }
    const message = composeTicketOrderMessage({
      reference: order.reference,
      event,
      tier,
      quantity: order.quantity,
      holders: order.holders,
      totals: order.totals,
      currencySymbol: order.currencySymbol,
      payerSafeAddress: order.payerSafeAddress,
      txHash: order.txHash,
    })
    await Share.share({ message })
  }, [])

  return (
    <ScrollView
      flex={1}
      backgroundColor="$backgroundPaper"
      testID="ev-tickets-screen"
      contentContainerStyle={{ padding: '$4', paddingBottom: '$10' }}
    >
      <YStack gap="$3">
        {syncing && (
          <Text fontSize="$2" color="$colorSecondary" testID="ev-tickets-syncing">
            {evStrings.tickets.syncing}
          </Text>
        )}

        {orders.length === 0 && (
          <Text fontSize="$3" color="$colorSecondary" testID="ev-tickets-empty">
            {evStrings.tickets.empty}
          </Text>
        )}

        {orders.map((order) => {
          const event = getEvent(order.eventSlug)
          const tier = getTier(event, order.tierId)
          return (
            <YStack key={order.id} backgroundColor="$background" borderRadius="$4" padding="$4" gap="$2">
              <XStack justifyContent="space-between" alignItems="center">
                <Text fontSize="$4" fontWeight="600">
                  {event.naziv}
                </Text>
                <Text fontSize="$2" color="$colorSecondary">
                  {new Date(order.createdAtMs).toLocaleDateString('hr-HR')}
                </Text>
              </XStack>

              <Text fontSize="$3" color="$colorSecondary">
                {tier?.naziv ?? order.tierId} × {order.quantity}
              </Text>

              {order.holders.map((holder, index) => (
                <Text key={`${order.id}-holder-${index}`} fontSize="$3" color="$colorSecondary">
                  {index + 1}. {holder.fullName}
                </Text>
              ))}

              <XStack justifyContent="space-between">
                <Text fontSize="$3" color="$colorSecondary">
                  {evStrings.tickets.reference}: {order.reference}
                </Text>
                <Text fontSize="$3" fontWeight="700">
                  {formatEur(order.totals.totalEur)} EUR
                </Text>
              </XStack>

              <Text fontSize="$2" color="$colorSecondary" testID={`ev-ticket-status-${order.id}`}>
                {evStrings.tickets.status[order.status]}
              </Text>

              {order.tickets !== undefined && order.tickets.length > 0 && (
                <YStack gap="$1" testID={`ev-ticket-issued-${order.id}`}>
                  <Text fontSize="$3" fontWeight="600">
                    {evStrings.tickets.issuedHeader}
                  </Text>
                  {order.tickets.map((ticket) => (
                    <XStack key={ticket.serial} justifyContent="space-between" gap="$2">
                      <Text fontSize="$3" color="$colorSecondary">
                        {ticket.serial}
                        {ticket.holderName !== undefined ? ` · ${ticket.holderName}` : ''}
                      </Text>
                      <Text fontSize="$3" color="$colorSecondary">
                        {evStrings.tickets.ticketState[ticket.state]}
                      </Text>
                    </XStack>
                  ))}
                </YStack>
              )}

              {order.status !== 'issued' && (
                <SafeButton size="$sm" onPress={() => void onShare(order)} testID={`ev-ticket-share-${order.id}`}>
                  {evStrings.tickets.share}
                </SafeButton>
              )}
            </YStack>
          )
        })}

        {orders.length > 0 && (
          <Text fontSize="$2" color="$colorSecondary" textAlign="center">
            {evStrings.tickets.shareHint}
          </Text>
        )}
      </YStack>
    </ScrollView>
  )
}
