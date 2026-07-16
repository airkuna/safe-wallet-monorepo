import React from 'react'
import { TouchableOpacity } from 'react-native'
import { ScrollView, Text, View, XStack, YStack } from 'tamagui'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { SafeFontIcon } from '@/src/components/SafeFontIcon'
import { useEventCatalog } from '../catalog/backendSource'
import { formatEventDate } from '../logic/ticketOrder'
import { evStrings } from '../strings'

/** Događaji hub: popis evenata (backend katalog uz config fallback) + ulaznice. */
export const Dogadjaji = () => {
  const router = useRouter()
  const { top } = useSafeAreaInsets()
  const events = useEventCatalog()

  return (
    <ScrollView flex={1} backgroundColor="$backgroundPaper" testID="ev-hub-screen">
      <YStack paddingTop={top + 12} paddingHorizontal="$4" paddingBottom="$4" gap="$2">
        <Text fontSize="$8" fontWeight="700">
          {evStrings.hub.title}
        </Text>
        <Text fontSize="$3" color="$colorSecondary">
          {evStrings.hub.subtitle}
        </Text>
      </YStack>

      <YStack paddingHorizontal="$4" gap="$3" paddingBottom="$10">
        {events.map((event) => {
          const date = formatEventDate(event.startIso, event.endIso)
          return (
            <TouchableOpacity
              key={event.slug}
              onPress={() => router.push({ pathname: '/events/event', params: { event: event.slug } })}
              testID={`ev-hub-event-${event.slug}`}
            >
              <YStack backgroundColor="$background" borderRadius="$4" padding="$4" gap="$1">
                <XStack justifyContent="space-between" alignItems="center" gap="$3">
                  <Text flex={1} fontSize="$5" fontWeight="600">
                    {event.naziv}
                  </Text>
                  <SafeFontIcon name="chevron-right" size={16} color="$colorSecondary" />
                </XStack>
                <Text fontSize="$3" color="$colorSecondary">
                  {date.length > 0 ? date : evStrings.hub.announced} · {event.venue.naziv}, {event.venue.grad}
                </Text>
              </YStack>
            </TouchableOpacity>
          )
        })}

        <TouchableOpacity onPress={() => router.push('/events/tickets')} testID="ev-hub-tickets">
          <XStack backgroundColor="$background" borderRadius="$4" padding="$4" alignItems="center" gap="$3">
            <View
              width={40}
              height={40}
              borderRadius={20}
              alignItems="center"
              justifyContent="center"
              backgroundColor="$backgroundSecondary"
            >
              <SafeFontIcon name="qr-code" size={20} color="$color" />
            </View>
            <Text flex={1} fontSize="$4" fontWeight="600">
              {evStrings.hub.myTickets}
            </Text>
            <SafeFontIcon name="chevron-right" size={16} color="$colorSecondary" />
          </XStack>
        </TouchableOpacity>

        <XStack
          backgroundColor="$backgroundSecondary"
          borderRadius="$4"
          padding="$4"
          alignItems="center"
          gap="$3"
          testID="ev-hub-your-event"
        >
          <SafeFontIcon name="plus" size={20} color="$colorSecondary" />
          <YStack flex={1} gap="$1">
            <Text fontSize="$4" fontWeight="600" color="$colorSecondary">
              {evStrings.hub.yourEventHere}
            </Text>
            <Text fontSize="$3" color="$colorSecondary">
              {evStrings.hub.yourEventHereDesc}
            </Text>
          </YStack>
        </XStack>
      </YStack>
    </ScrollView>
  )
}
