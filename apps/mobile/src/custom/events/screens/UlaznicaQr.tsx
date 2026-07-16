import React from 'react'
import { StyleSheet } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import QRCodeStyled from 'react-native-qrcode-styled'
import { ScrollView, Text, View, YStack } from 'tamagui'
import { getEvent, getTier } from '../catalog/registry'
import { buildTicketQrPayload } from '../logic/qrPayload'
import { useTicketOrders } from '../state/useTickets'
import { evStrings } from '../strings'

/**
 * QR ulaznice po komadu (E3): opaque token iz jednokratne backend dostave
 * (MMKV) renderiran kao `dgdj1:<token>` payload. QR je namjerno crno na
 * bijelom neovisno o temi (brightness-friendly za skeniranje na ulazu);
 * istina je token, ne slika — screenshot/preposlana slika radi točno jednom.
 */
export const UlaznicaQr = () => {
  const params = useLocalSearchParams<{ order?: string; serial?: string }>()
  const orders = useTicketOrders()

  const order = orders.find((candidate) => candidate.id === params.order)
  const ticket = order?.tickets?.find((candidate) => candidate.serial === params.serial)

  if (order === undefined || ticket === undefined) {
    return (
      <YStack flex={1} backgroundColor="$backgroundPaper" padding="$4" testID="ev-qr-missing">
        <Text fontSize="$3" color="$colorSecondary">
          {evStrings.qr.notDelivered}
        </Text>
      </YStack>
    )
  }

  const event = getEvent(order.eventSlug)
  const tier = getTier(event, order.tierId)
  const payload = ticket.qrToken === undefined ? null : buildTicketQrPayload(ticket.qrToken)
  const stateNote = ticket.state === 'issued' ? undefined : evStrings.qr.stateNote[ticket.state]

  return (
    <ScrollView
      flex={1}
      backgroundColor="$backgroundPaper"
      testID="ev-qr-screen"
      contentContainerStyle={{ padding: '$4', paddingBottom: '$10' }}
    >
      <YStack gap="$3" alignItems="center">
        <Text fontSize="$6" fontWeight="700" textAlign="center">
          {event.naziv}
        </Text>
        <Text fontSize="$4" color="$colorSecondary" textAlign="center">
          {tier?.naziv ?? order.tierId} · {ticket.serial}
        </Text>
        <Text fontSize="$5" fontWeight="600" textAlign="center" testID="ev-qr-holder">
          {ticket.holderName ?? evStrings.qr.holderUnnamed}
        </Text>

        {payload !== null ? (
          <View style={styles.qrCard} testID="ev-qr-code">
            <QRCodeStyled data={payload} style={styles.qrSvg} padding={16} color="#000" errorCorrectionLevel="M" />
          </View>
        ) : (
          <Text fontSize="$3" color="$colorSecondary" textAlign="center" testID="ev-qr-undelivered">
            {evStrings.qr.notDelivered}
          </Text>
        )}

        {stateNote !== undefined && (
          <Text fontSize="$3" color="$error" textAlign="center" testID="ev-qr-state-note">
            {stateNote}
          </Text>
        )}

        <Text fontSize="$2" color="$colorSecondary" textAlign="center">
          {evStrings.qr.hint}
        </Text>
      </YStack>
    </ScrollView>
  )
}

// Uvijek crno na bijelom (neovisno o temi) — kontrast za skener na ulazu.
const styles = StyleSheet.create({
  qrCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrSvg: {
    backgroundColor: '#fff',
  },
})
