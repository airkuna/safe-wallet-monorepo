import React, { useCallback, useMemo, useRef, useState } from 'react'
import { TouchableOpacity } from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { ScrollView, Text, XStack, YStack } from 'tamagui'
import { SafeButton } from '@/src/components/SafeButton'
import { SafeFontIcon } from '@/src/components/SafeFontIcon'
import { fetchOrganizerOverview } from '../api/client'
import { isEventsBackendConfigured } from '../api/config'
import type { OrganizerOverview } from '../api/types'
import { formatEventDate } from '../logic/ticketOrder'
import { setScannerToken, useScannerToken } from '../state/useScannerAuth'
import { evStrings } from '../strings'
import { TokenGate } from './TokenGate'

/**
 * Moji događaji (E4) — organizatorski hub: pregled org accounta (allowlist +
 * DAC7 status), lista vlastitih evenata (uklj. draftove) i ulaz u kreiranje.
 *
 * Autorizacija je ISKLJUČIVO server-side (organizer_overview RPC: org admin);
 * pristupni token (GoTrue JWT, isti store kao Skener ulaza) je samo transport
 * kredencijala. UI bez tokena/role ne vidi ništa jer backend ne vraća ništa.
 */

const orgStrings = evStrings.organizer

type LoadState =
  | { kind: 'loading' }
  | { kind: 'unreachable' }
  | { kind: 'rejected'; code: string }
  | { kind: 'ok'; overview: OrganizerOverview }

export const MojDogadjaji = () => {
  const router = useRouter()
  const scannerToken = useScannerToken()
  const [state, setState] = useState<LoadState>({ kind: 'loading' })
  const [showTokenGate, setShowTokenGate] = useState(false)
  const loadSeq = useRef(0)

  const load = useCallback((token: string) => {
    const seq = ++loadSeq.current
    setState({ kind: 'loading' })
    void fetchOrganizerOverview(token).then((result) => {
      if (seq !== loadSeq.current) {
        return
      }
      if (result.kind === 'ok') {
        setState({ kind: 'ok', overview: result.data })
      } else if (result.kind === 'rejected') {
        setState({ kind: 'rejected', code: result.code })
      } else {
        setState({ kind: 'unreachable' })
      }
    })
  }, [])

  // Refetch na svaki fokus (povratak s forme mora pokazati svježe stanje).
  const handleFocus = useCallback(() => {
    if (scannerToken !== undefined) {
      load(scannerToken)
    }
  }, [scannerToken, load])
  useFocusEffect(handleFocus)

  const onSaveToken = useCallback(
    (token: string) => {
      setScannerToken(token)
      setShowTokenGate(false)
      load(token.trim())
    },
    [load],
  )

  const overview = state.kind === 'ok' ? state.overview : undefined
  // Novi event ide na prvi org (ne-osobni) account; fallback prvi account.
  const newEventAccount = useMemo(() => {
    const accounts = overview?.accounts ?? []
    return accounts.find((account) => !account.is_personal) ?? accounts[0]
  }, [overview])

  if (!isEventsBackendConfigured()) {
    return (
      <YStack flex={1} backgroundColor="$backgroundPaper" padding="$4" testID="ev-organizer-unavailable">
        <Text fontSize="$3" color="$colorSecondary">
          {orgStrings.notConfigured}
        </Text>
      </YStack>
    )
  }

  if (scannerToken === undefined || showTokenGate) {
    return <TokenGate onSave={onSaveToken} testIDPrefix="ev-organizer" />
  }

  return (
    <ScrollView
      flex={1}
      backgroundColor="$backgroundPaper"
      testID="ev-organizer-screen"
      contentContainerStyle={{ padding: '$4', paddingBottom: '$10' }}
    >
      <YStack gap="$4">
        <YStack gap="$1">
          <Text fontSize="$7" fontWeight="700">
            {orgStrings.title}
          </Text>
          <Text fontSize="$3" color="$colorSecondary">
            {orgStrings.subtitle}
          </Text>
        </YStack>

        {state.kind === 'loading' && (
          <Text fontSize="$3" color="$colorSecondary" testID="ev-organizer-loading">
            {orgStrings.loading}
          </Text>
        )}

        {state.kind === 'unreachable' && (
          <YStack gap="$2" testID="ev-organizer-unreachable">
            <Text fontSize="$3" color="$colorSecondary">
              {orgStrings.unreachable}
            </Text>
            <SafeButton secondary onPress={() => load(scannerToken)} testID="ev-organizer-retry">
              {orgStrings.retry}
            </SafeButton>
          </YStack>
        )}

        {state.kind === 'rejected' && (
          <YStack gap="$2" testID="ev-organizer-rejected">
            <Text fontSize="$3" color="$error">
              {orgStrings.rejected[state.code] ?? orgStrings.rejectedFallback}
            </Text>
            <SafeButton secondary onPress={() => setShowTokenGate(true)} testID="ev-organizer-change-token">
              {evStrings.scanner.tokenChange}
            </SafeButton>
          </YStack>
        )}

        {overview !== undefined && (
          <>
            <YStack gap="$2">
              <Text fontSize="$5" fontWeight="600">
                {orgStrings.accountsHeader}
              </Text>
              {overview.accounts.length === 0 && (
                <Text fontSize="$3" color="$colorSecondary" testID="ev-organizer-no-account">
                  {orgStrings.noOrgAccount}
                </Text>
              )}
              {overview.accounts.map((account) => (
                <YStack
                  key={account.id}
                  backgroundColor="$background"
                  borderRadius="$4"
                  padding="$4"
                  gap="$1"
                  testID={`ev-organizer-account-${account.id}`}
                >
                  <Text fontSize="$4" fontWeight="600">
                    {account.name}
                  </Text>
                  <Text fontSize="$2" color={account.allowlisted ? '$colorSecondary' : '$error'}>
                    {account.allowlisted ? orgStrings.allowlisted : orgStrings.notAllowlisted}
                  </Text>
                  <Text fontSize="$2" color="$colorSecondary">
                    {account.has_record ? orgStrings.dac7Done : orgStrings.dac7Missing}
                  </Text>
                </YStack>
              ))}
            </YStack>

            <YStack gap="$2">
              {overview.events.length === 0 && (
                <Text fontSize="$3" color="$colorSecondary" testID="ev-organizer-empty">
                  {orgStrings.empty}
                </Text>
              )}
              {overview.events.map((event) => {
                const date = formatEventDate(
                  event.event?.starts_at?.slice(0, 10) ?? undefined,
                  event.event?.ends_at?.slice(0, 10) ?? undefined,
                )
                return (
                  <TouchableOpacity
                    key={event.campaign_id}
                    onPress={() =>
                      router.push({ pathname: '/events/organizer-event', params: { campaign: event.campaign_id } })
                    }
                    testID={`ev-organizer-event-${event.campaign_id}`}
                  >
                    <YStack backgroundColor="$background" borderRadius="$4" padding="$4" gap="$1">
                      <XStack justifyContent="space-between" alignItems="center" gap="$3">
                        <Text flex={1} fontSize="$4" fontWeight="600">
                          {event.title}
                        </Text>
                        <Text
                          fontSize="$2"
                          color={event.state === 'draft' ? '$colorSecondary' : '$color'}
                          testID={`ev-organizer-state-${event.campaign_id}`}
                        >
                          {orgStrings.state[event.state] ?? event.state}
                        </Text>
                      </XStack>
                      <Text fontSize="$2" color="$colorSecondary">
                        {date.length > 0 ? `${date} · ` : ''}
                        {event.event?.venue_name ?? ''}
                        {event.event?.venue_city !== undefined && event.event?.venue_city !== null
                          ? `, ${event.event.venue_city}`
                          : ''}
                      </Text>
                    </YStack>
                  </TouchableOpacity>
                )
              })}

              {newEventAccount !== undefined && (
                <SafeButton
                  onPress={() =>
                    router.push({ pathname: '/events/organizer-event', params: { account: newEventAccount.id } })
                  }
                  testID="ev-organizer-new-event"
                >
                  {orgStrings.newEvent}
                </SafeButton>
              )}
            </YStack>

            <TouchableOpacity onPress={() => router.push('/events/scanner')} testID="ev-organizer-scanner">
              <XStack backgroundColor="$background" borderRadius="$4" padding="$4" alignItems="center" gap="$3">
                <SafeFontIcon name="qr-code" size={20} color="$color" />
                <Text flex={1} fontSize="$4" fontWeight="600">
                  {orgStrings.openScanner}
                </Text>
                <SafeFontIcon name="chevron-right" size={16} color="$colorSecondary" />
              </XStack>
            </TouchableOpacity>

            <SafeButton secondary size="$sm" onPress={() => setShowTokenGate(true)} testID="ev-organizer-token-change">
              {evStrings.scanner.tokenChange}
            </SafeButton>
          </>
        )}
      </YStack>
    </ScrollView>
  )
}
