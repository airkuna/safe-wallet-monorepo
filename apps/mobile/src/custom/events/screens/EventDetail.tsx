import React, { useCallback, useMemo } from 'react'
import { Share, TouchableOpacity } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ScrollView, Text, XStack, YStack } from 'tamagui'
import { Alert } from '@/src/components/Alert'
import { SafeFontIcon } from '@/src/components/SafeFontIcon'
import { getEvent, isTierOnSale } from '../catalog/registry'
import { buildEventLink } from '../logic/eventLink'
import { formatEur, formatEventDate } from '../logic/ticketOrder'
import { evStrings } from '../strings'

const todayIso = (): string => new Date().toISOString().slice(0, 10)

/**
 * Detalj eventa: opis, organizator i lista tierova. Kupnja vodi na checkout;
 * event bez upisanog Safe-a je pregledan, ali s jasnom napomenom (invariant
 * "bez izmišljenih adresa" — plaćanje se onemogućuje na checkoutu).
 */
export const EventDetail = () => {
  const params = useLocalSearchParams<{ event?: string }>()
  const router = useRouter()
  const event = getEvent(params.event)
  const today = useMemo(todayIso, [])

  const date = formatEventDate(event.startIso, event.endIso)

  // Share link = deep link na ovaj event u appu (naziv + link u poruci).
  const onShare = useCallback(() => {
    void Share.share({ message: `${event.naziv}\n${buildEventLink(event.slug)}` })
  }, [event.naziv, event.slug])

  return (
    <ScrollView
      flex={1}
      backgroundColor="$backgroundPaper"
      testID="ev-detail-screen"
      contentContainerStyle={{ padding: '$4', paddingBottom: '$10' }}
    >
      <YStack gap="$4">
        <YStack gap="$1">
          <XStack alignItems="flex-start" justifyContent="space-between" gap="$3">
            <Text flex={1} fontSize="$7" fontWeight="700">
              {event.naziv}
            </Text>
            <TouchableOpacity onPress={onShare} accessibilityLabel={evStrings.event.share} testID="ev-detail-share">
              <SafeFontIcon name="export" size={20} color="$colorSecondary" />
            </TouchableOpacity>
          </XStack>
          <Text fontSize="$3" color="$colorSecondary" testID="ev-detail-date">
            {date.length > 0 ? date : evStrings.event.dateTba} · {event.venue.naziv}, {event.venue.grad}
          </Text>
        </YStack>

        <Text fontSize="$3">{event.opisHr}</Text>

        {event.safeAddress === undefined && event.tiers.length > 0 && (
          <Alert type="info" message={evStrings.event.notOnchain} displayIcon testID="ev-detail-inactive" />
        )}

        <YStack gap="$2">
          <Text fontSize="$5" fontWeight="600">
            {evStrings.event.tickets}
          </Text>

          {event.tiers.length === 0 && (
            <Text fontSize="$3" color="$colorSecondary" testID="ev-detail-no-tiers">
              {evStrings.event.noTiers}
            </Text>
          )}

          {event.tiers.map((tier) => {
            const onSale = isTierOnSale(tier, today)
            return (
              <TouchableOpacity
                key={tier.id}
                disabled={!onSale}
                onPress={() =>
                  router.push({ pathname: '/events/checkout', params: { event: event.slug, tier: tier.id } })
                }
                testID={`ev-detail-tier-${tier.id}`}
              >
                <XStack
                  backgroundColor="$background"
                  borderRadius="$4"
                  padding="$4"
                  alignItems="center"
                  gap="$3"
                  opacity={onSale ? 1 : 0.5}
                >
                  <YStack flex={1} gap="$1">
                    <Text fontSize="$4" fontWeight="600">
                      {tier.naziv}
                    </Text>
                    {tier.opisHr !== undefined && (
                      <Text fontSize="$2" color="$colorSecondary">
                        {tier.opisHr}
                      </Text>
                    )}
                    {tier.imenska && (
                      <Text fontSize="$2" color="$colorSecondary">
                        {evStrings.event.named}
                      </Text>
                    )}
                  </YStack>
                  <YStack alignItems="flex-end" gap="$1">
                    <Text fontSize="$4" fontWeight="700">
                      {formatEur(tier.priceEur)} EUR
                    </Text>
                    <Text fontSize="$2" color="$colorSecondary">
                      {onSale ? evStrings.event.buy : evStrings.event.saleClosed}
                    </Text>
                  </YStack>
                  <SafeFontIcon name="chevron-right" size={16} color="$colorSecondary" />
                </XStack>
              </TouchableOpacity>
            )
          })}
        </YStack>

        <YStack gap="$2">
          <Text fontSize="$5" fontWeight="600">
            {evStrings.event.aboutOrganizer}
          </Text>
          <YStack backgroundColor="$background" borderRadius="$4" padding="$4" gap="$1">
            <Text fontSize="$4" fontWeight="600">
              {event.organizer.username !== undefined ? `@${event.organizer.username}` : event.organizer.naziv}
            </Text>
            <Text fontSize="$3" color="$colorSecondary">
              {evStrings.event.email}: {event.organizer.email}
            </Text>
            {event.organizer.web !== undefined && (
              <Text fontSize="$3" color="$colorSecondary">
                {evStrings.event.web}: {event.organizer.web}
              </Text>
            )}
          </YStack>
        </YStack>
      </YStack>
    </ScrollView>
  )
}
