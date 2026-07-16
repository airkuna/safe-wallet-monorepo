import React, { useCallback, useMemo, useRef, useState } from 'react'
import { Share, StyleSheet, Switch, TouchableOpacity } from 'react-native'
import { isAddress } from 'ethers'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import QRCodeStyled from 'react-native-qrcode-styled'
import { ScrollView, Text, View, XStack, YStack } from 'tamagui'
import { SafeButton } from '@/src/components/SafeButton'
import { SafeInput } from '@/src/components/SafeInput/SafeInput'
import { useAppSelector } from '@/src/store/hooks'
import { selectActiveSafe } from '@/src/store/activeSafeSlice'
import {
  createOrganizerEvent,
  fetchOrganizerOverview,
  publishOrganizerEvent,
  updateOrganizerEvent,
} from '../api/client'
import { isEventsBackendConfigured } from '../api/config'
import type { OrganizerEvent, OrganizerTierInput } from '../api/types'
import { randomUuid } from '../api/useTicketSync'
import type { EventType } from '../catalog/types'
import { buildEventLink } from '../logic/eventLink'
import { centsToEur, eurToCents } from '../logic/ticketOrder'
import { setScannerToken, useScannerToken } from '../state/useScannerAuth'
import { evStrings } from '../strings'
import { TokenGate } from './TokenGate'

/**
 * Moj događaj (E4) — kreiranje/uređivanje eventa i tiera + objava + promo QR.
 *
 * Publish gating je SERVER-SIDE (publish_event RPC: org admin + allowlist +
 * pravi Safe); "bez Safe adrese nema objave" u UI-ju je samo zrcalo — gumb je
 * onemogućen dok adresa nije valjana, a server istu provjeru radi ponovno.
 * Nakon objave su cijena/imenska postojećih tiera zaključani (server pravilo
 * tier_locked); nova kategorija se smije dodati (faze prodaje).
 */

const orgStrings = evStrings.organizer

const EVENT_TYPES: readonly EventType[] = ['konferencija', 'koncert', 'meetup', 'kamp', 'ostalo']

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

type TierDraft = {
  key: string
  id?: string
  title: string
  priceEur: string
  inventory: string
  imenska: boolean
}

type FormState = {
  title: string
  eventType: EventType
  venueName: string
  venueCity: string
  venueAddress: string
  startDate: string
  endDate: string
  descriptionHr: string
  organizerEmail: string
  organizerWeb: string
  destination: string
  tiers: TierDraft[]
}

const emptyForm = (): FormState => ({
  title: '',
  eventType: 'ostalo',
  venueName: '',
  venueCity: '',
  venueAddress: '',
  startDate: '',
  endDate: '',
  descriptionHr: '',
  organizerEmail: '',
  organizerWeb: '',
  destination: '',
  tiers: [],
})

const formFromEvent = (event: OrganizerEvent): FormState => ({
  title: event.title,
  eventType: (EVENT_TYPES as readonly string[]).includes(event.event?.event_type ?? '')
    ? ((event.event?.event_type ?? 'ostalo') as EventType)
    : 'ostalo',
  venueName: event.event?.venue_name ?? '',
  venueCity: event.event?.venue_city ?? '',
  venueAddress: event.event?.venue_address ?? '',
  startDate: event.event?.starts_at?.slice(0, 10) ?? '',
  endDate: event.event?.ends_at?.slice(0, 10) ?? '',
  descriptionHr: event.event?.description_hr ?? '',
  organizerEmail: event.event?.organizer_email ?? '',
  organizerWeb: event.event?.organizer_web ?? '',
  destination:
    event.destination_address !== undefined &&
    event.destination_address !== null &&
    !/^0x0{40}$/i.test(event.destination_address)
      ? event.destination_address
      : '',
  tiers: event.tiers.map((tier) => ({
    key: tier.id,
    id: tier.id,
    title: tier.title,
    priceEur: centsToEur(tier.price_cents),
    inventory: tier.inventory_total === null || tier.inventory_total === undefined ? '' : String(tier.inventory_total),
    imenska: tier.imenska,
  })),
})

const tierInputs = (tiers: TierDraft[]): OrganizerTierInput[] | null => {
  const inputs: OrganizerTierInput[] = []
  for (const tier of tiers) {
    const cents = eurToCents(tier.priceEur)
    if (tier.title.trim().length === 0 || cents === null) {
      return null
    }
    const inventory = tier.inventory.trim()
    if (inventory.length > 0 && !/^\d{1,7}$/.test(inventory)) {
      return null
    }
    inputs.push({
      ...(tier.id !== undefined ? { id: tier.id } : {}),
      title: tier.title.trim(),
      price_cents: cents,
      inventory_total: inventory.length === 0 ? null : Number(inventory),
      imenska: tier.imenska,
    })
  }
  return inputs
}

export const MojDogadjaj = () => {
  const params = useLocalSearchParams<{ campaign?: string; account?: string }>()
  const router = useRouter()
  const scannerToken = useScannerToken()
  const activeSafe = useAppSelector(selectActiveSafe)

  const isEdit = typeof params.campaign === 'string' && params.campaign.length > 0
  const newEventId = useRef(randomUuid())

  const [loaded, setLoaded] = useState<OrganizerEvent | null>(null)
  const [loadError, setLoadError] = useState<string | null>(isEdit ? '' : null) // '' = still loading
  const [form, setForm] = useState<FormState>(emptyForm)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ error: boolean; text: string } | null>(null)
  const loadSeq = useRef(0)

  const setField = useCallback(<K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [field]: value }))
  }, [])

  const loadEvent = useCallback(
    (token: string, campaignId: string) => {
      const seq = ++loadSeq.current
      void fetchOrganizerOverview(token).then((result) => {
        if (seq !== loadSeq.current) {
          return
        }
        if (result.kind !== 'ok') {
          setLoadError(
            result.kind === 'rejected'
              ? (orgStrings.rejected[result.code] ?? orgStrings.rejectedFallback)
              : orgStrings.unreachable,
          )
          return
        }
        const event = result.data.events.find((candidate) => candidate.campaign_id === campaignId)
        if (event === undefined) {
          setLoadError(orgStrings.rejectedFallback)
          return
        }
        setLoaded(event)
        setLoadError(null)
        setForm(formFromEvent(event))
      })
    },
    [setForm],
  )

  const handleFocus = useCallback(() => {
    if (isEdit && scannerToken !== undefined && typeof params.campaign === 'string') {
      loadEvent(scannerToken, params.campaign)
    }
  }, [isEdit, scannerToken, params.campaign, loadEvent])
  useFocusEffect(handleFocus)

  const state = loaded?.state ?? 'draft'
  const isDraft = state === 'draft'
  const destinationOk = isAddress(form.destination)
  const datesOk =
    (form.startDate === '' || DATE_RE.test(form.startDate)) && (form.endDate === '' || DATE_RE.test(form.endDate))
  const formOk =
    form.title.trim().length >= 3 &&
    form.venueName.trim().length > 0 &&
    form.venueCity.trim().length > 0 &&
    datesOk &&
    (form.destination === '' || destinationOk) &&
    tierInputs(form.tiers) !== null

  const onSave = useCallback(async () => {
    const tiers = tierInputs(form.tiers)
    if (tiers === null || !formOk || scannerToken === undefined || busy) {
      return
    }
    setBusy(true)
    setNotice(null)
    const common = {
      title: form.title.trim(),
      event_type: form.eventType,
      venue_name: form.venueName.trim(),
      venue_city: form.venueCity.trim(),
      venue_address: form.venueAddress.trim(),
      ...(form.startDate !== '' ? { starts_at: form.startDate } : {}),
      ...(form.endDate !== '' ? { ends_at: form.endDate } : {}),
      description_hr: form.descriptionHr,
      organizer_email: form.organizerEmail.trim(),
      organizer_web: form.organizerWeb.trim(),
      ...(destinationOk ? { destination_address: form.destination } : {}),
      tiers,
    }
    const result = isEdit
      ? await updateOrganizerEvent({ campaign_id: params.campaign as string, ...common }, scannerToken)
      : await createOrganizerEvent(
          { event_id: newEventId.current, account_id: params.account ?? '', ...common },
          scannerToken,
        )
    setBusy(false)
    if (result.kind === 'ok') {
      setNotice({ error: false, text: orgStrings.saved })
      if (!isEdit) {
        // Nastavak (objava, promo) ide kroz edit ekran istog eventa.
        router.replace({ pathname: '/events/organizer-event', params: { campaign: newEventId.current } })
      } else if (typeof params.campaign === 'string') {
        loadEvent(scannerToken, params.campaign)
      }
      return
    }
    setNotice({
      error: true,
      text:
        result.kind === 'rejected'
          ? (orgStrings.rejected[result.code] ?? orgStrings.rejectedFallback)
          : orgStrings.unreachable,
    })
  }, [form, formOk, destinationOk, scannerToken, busy, isEdit, params.campaign, params.account, router, loadEvent])

  const onPublish = useCallback(
    async (target: 'active' | 'closed') => {
      if (scannerToken === undefined || typeof params.campaign !== 'string' || busy) {
        return
      }
      setBusy(true)
      setNotice(null)
      const result = await publishOrganizerEvent(params.campaign, target, scannerToken)
      setBusy(false)
      if (result.kind === 'ok') {
        setNotice({ error: false, text: target === 'active' ? orgStrings.published : orgStrings.closed })
        loadEvent(scannerToken, params.campaign)
        return
      }
      setNotice({
        error: true,
        text:
          result.kind === 'rejected'
            ? (orgStrings.rejected[result.code] ?? orgStrings.rejectedFallback)
            : orgStrings.unreachable,
      })
    },
    [scannerToken, params.campaign, busy, loadEvent],
  )

  const promoLink = useMemo(
    () => (loaded !== null && (state === 'active' || state === 'funded') ? buildEventLink(loaded.slug) : null),
    [loaded, state],
  )

  if (!isEventsBackendConfigured()) {
    return (
      <YStack flex={1} backgroundColor="$backgroundPaper" padding="$4" testID="ev-organizer-event-unavailable">
        <Text fontSize="$3" color="$colorSecondary">
          {orgStrings.notConfigured}
        </Text>
      </YStack>
    )
  }

  if (scannerToken === undefined) {
    return <TokenGate onSave={(token) => setScannerToken(token)} testIDPrefix="ev-organizer-event" />
  }

  if (isEdit && loaded === null) {
    return (
      <YStack flex={1} backgroundColor="$backgroundPaper" padding="$4" gap="$2" testID="ev-organizer-event-loading">
        <Text fontSize="$3" color={loadError !== null && loadError !== '' ? '$error' : '$colorSecondary'}>
          {loadError !== null && loadError !== '' ? loadError : orgStrings.loading}
        </Text>
      </YStack>
    )
  }

  return (
    <ScrollView
      flex={1}
      backgroundColor="$backgroundPaper"
      testID="ev-organizer-event-screen"
      contentContainerStyle={{ padding: '$4', paddingBottom: '$10' }}
    >
      <YStack gap="$4">
        <YStack gap="$1">
          <Text fontSize="$7" fontWeight="700">
            {isEdit ? orgStrings.formTitleEdit : orgStrings.formTitleNew}
          </Text>
          {loaded !== null && (
            <Text fontSize="$3" color="$colorSecondary" testID="ev-organizer-event-state">
              {orgStrings.state[state] ?? state}
            </Text>
          )}
        </YStack>

        <YStack gap="$2">
          <SafeInput
            value={form.title}
            onChangeText={(value) => setField('title', value)}
            placeholder={orgStrings.fieldTitle}
            testID="ev-organizer-field-title"
          />
          <XStack gap="$2" flexWrap="wrap">
            {EVENT_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                onPress={() => setField('eventType', type)}
                testID={`ev-organizer-type-${type}`}
              >
                <View
                  paddingHorizontal="$3"
                  paddingVertical="$1"
                  borderRadius="$4"
                  backgroundColor={form.eventType === type ? '$color' : '$backgroundSecondary'}
                >
                  <Text fontSize="$2" color={form.eventType === type ? '$background' : '$colorSecondary'}>
                    {type}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </XStack>
          <SafeInput
            value={form.venueName}
            onChangeText={(value) => setField('venueName', value)}
            placeholder={orgStrings.fieldVenueName}
            testID="ev-organizer-field-venue"
          />
          <SafeInput
            value={form.venueCity}
            onChangeText={(value) => setField('venueCity', value)}
            placeholder={orgStrings.fieldVenueCity}
            testID="ev-organizer-field-city"
          />
          <SafeInput
            value={form.venueAddress}
            onChangeText={(value) => setField('venueAddress', value)}
            placeholder={orgStrings.fieldVenueAddress}
            testID="ev-organizer-field-address"
          />
          <XStack gap="$2">
            <View flex={1}>
              <SafeInput
                value={form.startDate}
                onChangeText={(value) => setField('startDate', value)}
                placeholder={orgStrings.fieldStart}
                autoCapitalize="none"
                testID="ev-organizer-field-start"
              />
            </View>
            <View flex={1}>
              <SafeInput
                value={form.endDate}
                onChangeText={(value) => setField('endDate', value)}
                placeholder={orgStrings.fieldEnd}
                autoCapitalize="none"
                testID="ev-organizer-field-end"
              />
            </View>
          </XStack>
          <SafeInput
            value={form.descriptionHr}
            onChangeText={(value) => setField('descriptionHr', value)}
            placeholder={orgStrings.fieldDescription}
            multiline
            testID="ev-organizer-field-description"
          />
          <SafeInput
            value={form.organizerEmail}
            onChangeText={(value) => setField('organizerEmail', value)}
            placeholder={orgStrings.fieldOrganizerEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            testID="ev-organizer-field-email"
          />
          <SafeInput
            value={form.organizerWeb}
            onChangeText={(value) => setField('organizerWeb', value)}
            placeholder={orgStrings.fieldOrganizerWeb}
            autoCapitalize="none"
            testID="ev-organizer-field-web"
          />
        </YStack>

        <YStack gap="$2">
          <Text fontSize="$5" fontWeight="600">
            {orgStrings.fieldSafe}
          </Text>
          <Text fontSize="$2" color="$colorSecondary">
            {orgStrings.safeHint}
          </Text>
          <SafeInput
            value={form.destination}
            onChangeText={(value) => setField('destination', value.trim())}
            placeholder="0x…"
            autoCapitalize="none"
            autoCorrect={false}
            testID="ev-organizer-field-destination"
          />
          {activeSafe !== null && form.destination !== activeSafe.address && (
            <SafeButton
              secondary
              size="$sm"
              onPress={() => setField('destination', activeSafe.address)}
              testID="ev-organizer-use-active-safe"
            >
              {orgStrings.useActiveSafe}
            </SafeButton>
          )}
        </YStack>

        <YStack gap="$2">
          <Text fontSize="$5" fontWeight="600">
            {orgStrings.tiersHeader}
          </Text>
          {!isDraft && (
            <Text fontSize="$2" color="$colorSecondary">
              {orgStrings.tierLockedNote}
            </Text>
          )}
          {form.tiers.map((tier, index) => {
            const locked = !isDraft && tier.id !== undefined
            return (
              <YStack
                key={tier.key}
                backgroundColor="$background"
                borderRadius="$4"
                padding="$3"
                gap="$2"
                testID={`ev-organizer-tier-${index}`}
              >
                <SafeInput
                  value={tier.title}
                  onChangeText={(value) =>
                    setField(
                      'tiers',
                      form.tiers.map((entry) => (entry.key === tier.key ? { ...entry, title: value } : entry)),
                    )
                  }
                  placeholder={orgStrings.tierTitle}
                  testID={`ev-organizer-tier-title-${index}`}
                />
                <XStack gap="$2">
                  <View flex={1}>
                    <SafeInput
                      value={tier.priceEur}
                      onChangeText={(value) =>
                        setField(
                          'tiers',
                          form.tiers.map((entry) =>
                            entry.key === tier.key ? { ...entry, priceEur: value.replace(',', '.') } : entry,
                          ),
                        )
                      }
                      placeholder={orgStrings.tierPrice}
                      keyboardType="decimal-pad"
                      editable={!locked}
                      testID={`ev-organizer-tier-price-${index}`}
                    />
                  </View>
                  <View flex={1}>
                    <SafeInput
                      value={tier.inventory}
                      onChangeText={(value) =>
                        setField(
                          'tiers',
                          form.tiers.map((entry) => (entry.key === tier.key ? { ...entry, inventory: value } : entry)),
                        )
                      }
                      placeholder={orgStrings.tierInventory}
                      keyboardType="number-pad"
                      testID={`ev-organizer-tier-inventory-${index}`}
                    />
                  </View>
                </XStack>
                <XStack alignItems="center" justifyContent="space-between">
                  <YStack flex={1} gap="$1">
                    <Text fontSize="$3">{orgStrings.tierNamed}</Text>
                    <Text fontSize="$2" color="$colorSecondary">
                      {orgStrings.tierNamedHint}
                    </Text>
                  </YStack>
                  <Switch
                    value={tier.imenska}
                    disabled={locked}
                    onValueChange={(value) =>
                      setField(
                        'tiers',
                        form.tiers.map((entry) => (entry.key === tier.key ? { ...entry, imenska: value } : entry)),
                      )
                    }
                    testID={`ev-organizer-tier-imenska-${index}`}
                  />
                </XStack>
                {tier.id === undefined && (
                  <SafeButton
                    secondary
                    size="$sm"
                    onPress={() =>
                      setField(
                        'tiers',
                        form.tiers.filter((entry) => entry.key !== tier.key),
                      )
                    }
                    testID={`ev-organizer-tier-remove-${index}`}
                  >
                    {orgStrings.removeTier}
                  </SafeButton>
                )}
              </YStack>
            )
          })}
          <SafeButton
            secondary
            onPress={() =>
              setField('tiers', [
                ...form.tiers,
                { key: randomUuid(), title: '', priceEur: '', inventory: '', imenska: false },
              ])
            }
            testID="ev-organizer-add-tier"
          >
            {orgStrings.addTier}
          </SafeButton>
        </YStack>

        {notice !== null && (
          <Text fontSize="$3" color={notice.error ? '$error' : '$colorSecondary'} testID="ev-organizer-notice">
            {notice.text}
          </Text>
        )}

        <SafeButton disabled={!formOk || busy} onPress={() => void onSave()} testID="ev-organizer-save">
          {orgStrings.save}
        </SafeButton>

        {isEdit && isDraft && (
          <YStack gap="$2">
            <Text fontSize="$5" fontWeight="600">
              {orgStrings.publishHeader}
            </Text>
            <Text fontSize="$2" color="$colorSecondary" testID="ev-organizer-publish-hint">
              {destinationOk ? orgStrings.publishHintDraft : orgStrings.publishHintNoSafe}
            </Text>
            <SafeButton
              disabled={!destinationOk || busy}
              onPress={() => void onPublish('active')}
              testID="ev-organizer-publish"
            >
              {orgStrings.publish}
            </SafeButton>
          </YStack>
        )}

        {isEdit && (state === 'active' || state === 'funded') && (
          <YStack gap="$3">
            {promoLink !== null && (
              <YStack gap="$2">
                <Text fontSize="$5" fontWeight="600">
                  {orgStrings.promoHeader}
                </Text>
                <Text fontSize="$2" color="$colorSecondary">
                  {orgStrings.promoHint}
                </Text>
                <YStack alignItems="center" gap="$2">
                  <View style={styles.qrCard} testID="ev-organizer-promo-qr">
                    <QRCodeStyled data={promoLink} style={styles.qrSvg} padding={16} color="#000" />
                  </View>
                  <Text fontSize="$2" color="$colorSecondary" testID="ev-organizer-promo-link">
                    {promoLink}
                  </Text>
                </YStack>
                <SafeButton
                  secondary
                  onPress={() => void Share.share({ message: promoLink })}
                  testID="ev-organizer-share"
                >
                  {orgStrings.shareLink}
                </SafeButton>
              </YStack>
            )}
            <SafeButton secondary disabled={busy} onPress={() => void onPublish('closed')} testID="ev-organizer-close">
              {orgStrings.close}
            </SafeButton>
          </YStack>
        )}
      </YStack>
    </ScrollView>
  )
}

// QR uvijek crno na bijelom (kao UlaznicaQr) — čitljivost na plakatu/ekranu.
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
