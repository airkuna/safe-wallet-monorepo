import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocalSearchParams } from 'expo-router'
import { ScrollView, Spinner, Text, XStack, YStack } from 'tamagui'
import { useAppSelector } from '@/src/store/hooks'
import { selectActiveSafe } from '@/src/store/activeSafeSlice'
import { SafeButton } from '@/src/components/SafeButton'
import { SafeInput } from '@/src/components/SafeInput/SafeInput'
import { Alert } from '@/src/components/Alert'
import { useScannedAddressToSend } from '@/src/features/Send/hooks/useScannedAddressToSend'
import { fetchActiveCampaign } from '../api/pinkaClient'
import { isDonationsBackendConfigured } from '../api/config'
import { recordDonation, useDonationSync } from '../api/useDonationSync'
import { useDonationRecords, type DonationRecord } from '../state/useDonations'
import { buildDonationTransfer, DONATION_CURRENCY, eurAmountToCents, formatCents } from '../logic/donationAmount'
import { parseDonationLink } from '../logic/donationLink'
import type { CampaignResult } from '../api/types'
import { donStrings } from '../strings'

/**
 * Doniraj: slug/link (paste ili prefill iz skenera/deep linka) → kampanja s
 * pinka backenda → iznos u EUR → plaćanje kroz postojeći Send flow (EIP-681
 * prefill, ista risk validacija primatelja kao skenirani QR; isti obrazac kao
 * events TicketCheckout). Donacija se sprema lokalno PRIJE navigacije da
 * zapis preživi i prekinuto plaćanje; knjiženje na backendu pokriva cron,
 * confirm je best-effort optimizacija.
 */

type Lookup = { kind: 'idle' } | { kind: 'loading' } | (CampaignResult & { slug: string })

const statusLabel = (record: DonationRecord): string => {
  if (record.confirmed === true) {
    return donStrings.history.status.confirmed
  }
  return record.txHash !== undefined ? donStrings.history.status.pending : donStrings.history.status.initiated
}

export const Doniraj = () => {
  const params = useLocalSearchParams<{ slug?: string }>()
  const activeSafe = useAppSelector(selectActiveSafe)
  const { sendPaymentRequestToRecipient } = useScannedAddressToSend()
  const { syncing } = useDonationSync()
  const donations = useDonationRecords()

  const [slugInput, setSlugInput] = useState('')
  const [lookup, setLookup] = useState<Lookup>({ kind: 'idle' })
  const [amount, setAmount] = useState('')

  const findCampaign = useCallback(async (raw: string) => {
    const slug = parseDonationLink(raw) ?? raw.trim()
    if (slug.length === 0) {
      return
    }
    setLookup({ kind: 'loading' })
    const result = await fetchActiveCampaign(slug)
    setLookup({ ...result, slug })
  }, [])

  // Prefill iz skenera / donacijskog linka: ?slug=<slug> → odmah dohvat.
  // Namjerno jednom po mountu (isti obrazac kao PayRequestRedirect).
  useEffect(() => {
    if (params.slug !== undefined && params.slug.length > 0) {
      setSlugInput(params.slug)
      void findCampaign(params.slug)
    }
  }, [])

  const campaign = lookup.kind === 'ok' ? lookup.campaign : null
  const cents = useMemo(() => eurAmountToCents(amount), [amount])
  const belowMin = campaign !== null && cents !== null && cents < campaign.min_contribution_cents
  const noOnchain = campaign !== null && (campaign.destination_address === null || campaign.destination_address === '')
  const canDonate = activeSafe !== null && campaign !== null && !noOnchain && cents !== null && !belowMin

  const onDonate = useCallback(async () => {
    if (
      activeSafe === null ||
      lookup.kind !== 'ok' ||
      lookup.campaign.destination_address === null ||
      lookup.campaign.destination_address === '' ||
      cents === null
    ) {
      return
    }
    const transfer = buildDonationTransfer(lookup.campaign.destination_address, cents)
    if (transfer === null) {
      return
    }
    await recordDonation({
      slug: lookup.slug,
      campaignId: lookup.campaign.id,
      campaignTitle: lookup.campaign.title,
      destinationAddress: lookup.campaign.destination_address,
      amountCents: cents,
    })
    sendPaymentRequestToRecipient(transfer, 'replace')
  }, [activeSafe, lookup, cents, sendPaymentRequestToRecipient])

  return (
    <ScrollView
      flex={1}
      backgroundColor="$background"
      testID="don-screen"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingHorizontal: '$4', paddingTop: '$4', paddingBottom: '$10' }}
    >
      <YStack gap="$4">
        <YStack gap="$1">
          <Text fontSize="$8" fontWeight="600">
            {donStrings.screen.title}
          </Text>
          <Text fontSize="$3" color="$colorSecondary">
            {donStrings.screen.subtitle}
          </Text>
        </YStack>

        {!isDonationsBackendConfigured() && (
          <Alert type="info" message={donStrings.screen.notConfigured} displayIcon testID="don-not-configured" />
        )}

        <YStack gap="$2">
          <Text fontSize="$5" fontWeight="600">
            {donStrings.screen.slugLabel}
          </Text>
          <SafeInput
            value={slugInput}
            onChangeText={setSlugInput}
            autoCapitalize="none"
            placeholder={donStrings.screen.slugPlaceholder}
            testID="don-slug-input"
          />
          <SafeButton
            secondary
            disabled={slugInput.trim().length === 0 || lookup.kind === 'loading'}
            onPress={() => void findCampaign(slugInput)}
            testID="don-find"
          >
            {lookup.kind === 'loading' ? donStrings.screen.searching : donStrings.screen.find}
          </SafeButton>
        </YStack>

        {lookup.kind === 'not_found' && (
          <Alert type="warning" message={donStrings.screen.notFound} displayIcon testID="don-not-found" />
        )}
        {lookup.kind === 'unreachable' && (
          <Alert type="warning" message={donStrings.screen.unreachable} displayIcon testID="don-unreachable" />
        )}

        {campaign !== null && (
          <YStack gap="$2" testID="don-campaign">
            <Text fontSize="$5" fontWeight="600" testID="don-campaign-title">
              {campaign.title}
            </Text>
            {campaign.description !== null && campaign.description.length > 0 && (
              <Text fontSize="$3" color="$colorSecondary">
                {campaign.description}
              </Text>
            )}
            <XStack justifyContent="space-between">
              <Text fontSize="$3" color="$colorSecondary">
                {donStrings.screen.raised}
              </Text>
              <Text fontSize="$3" fontWeight="600" testID="don-campaign-raised">
                {formatCents(campaign.total_raised_cents)} EUR
              </Text>
            </XStack>
            {campaign.goal_cents !== null && campaign.goal_cents > 0 && (
              <XStack justifyContent="space-between">
                <Text fontSize="$3" color="$colorSecondary">
                  {donStrings.screen.goal}
                </Text>
                <Text fontSize="$3" fontWeight="600">
                  {formatCents(campaign.goal_cents)} EUR
                </Text>
              </XStack>
            )}

            {noOnchain ? (
              <Alert type="info" message={donStrings.screen.noOnchain} displayIcon testID="don-no-onchain" />
            ) : (
              <YStack gap="$2">
                <Text fontSize="$5" fontWeight="600">
                  {donStrings.screen.amountLabel}
                </Text>
                <SafeInput
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  placeholder={donStrings.screen.amountPlaceholder}
                  testID="don-amount-input"
                />
                {belowMin && (
                  <Text fontSize="$2" color="$colorSecondary" testID="don-below-min">
                    {donStrings.screen.minAmount.replace('{min}', formatCents(campaign.min_contribution_cents))}
                  </Text>
                )}
                {activeSafe === null && (
                  <Alert
                    type="warning"
                    message={donStrings.screen.noActiveAccount}
                    displayIcon
                    testID="don-no-account"
                  />
                )}
                <SafeButton
                  disabled={!canDonate}
                  onPress={canDonate ? () => void onDonate() : undefined}
                  testID="don-donate"
                >
                  {donStrings.screen.donate}
                  {cents !== null ? ` ${formatCents(cents)} ${DONATION_CURRENCY.symbol}` : ''}
                </SafeButton>
                <Text fontSize="$2" color="$colorSecondary" textAlign="center">
                  {donStrings.screen.directNote}
                </Text>
              </YStack>
            )}
          </YStack>
        )}

        {donations.length > 0 && (
          <YStack gap="$2">
            <XStack alignItems="center" gap="$2">
              <Text fontSize="$5" fontWeight="600">
                {donStrings.history.title}
              </Text>
              {syncing && <Spinner size="small" testID="don-syncing" />}
            </XStack>
            {donations.map((record) => (
              <XStack key={record.id} justifyContent="space-between" testID={`don-record-${record.id}`}>
                <YStack flex={1} paddingRight="$2">
                  <Text fontSize="$3" numberOfLines={1}>
                    {record.campaignTitle}
                  </Text>
                  <Text fontSize="$2" color="$colorSecondary">
                    {statusLabel(record)}
                  </Text>
                </YStack>
                <Text fontSize="$3" fontWeight="600">
                  {formatCents(record.amountCents)} EUR
                </Text>
              </XStack>
            ))}
          </YStack>
        )}
      </YStack>
    </ScrollView>
  )
}
