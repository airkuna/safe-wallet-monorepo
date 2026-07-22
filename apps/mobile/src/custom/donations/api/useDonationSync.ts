import { useCallback, useEffect, useState } from 'react'
import {
  addDonation,
  getDonations,
  markDonationConfirmed,
  markDonationPaid,
  type DonationRecord,
} from '../state/useDonations'
import { confirmContribution } from './pinkaClient'
import { isDonationsBackendConfigured } from './config'

/**
 * Sinkronizacija donacija s pinka backendom (tx-hash → confirm obrazac, uzor
 * events `useTicketSync`):
 *   - `recordDonation`: optimistički lokalni zapis pri pokretanju plaćanja
 *     (prije navigacije u Send flow, da preživi i prekinuto plaćanje);
 *   - `recordDonationPayment`: tx hash iz Send flowa → lokalni zapis + odmah
 *     best-effort confirm (instant kredit);
 *   - `syncDonations` (+ hook za Doniraj ekran): retroaktivni confirm zapisa
 *     s txHash-om bez potvrde.
 * Pad backenda je uvijek tih — cron `pinka-onchain-ingest` kreditira donaciju
 * u ~1–2 min bez ikakve akcije klijenta ([15] §5). Backend nikad ne drži
 * ključeve ni sredstva; plaćanje ide isključivo postojećim Send flowom.
 */

/** Client-generated v4 UUID (id lokalnog zapisa donacije). */
export const randomUuid = (): string => {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/**
 * Kreira lokalni zapis donacije; s poznatim txHash-om odmah pokušava
 * best-effort confirm (pad confirma NE ruši zapis — cron je fallback).
 */
export const recordDonation = async (input: {
  slug: string
  campaignId: string
  campaignTitle: string
  destinationAddress: string
  amountCents: number
  txHash?: string
}): Promise<DonationRecord> => {
  const record: DonationRecord = {
    id: randomUuid(),
    slug: input.slug,
    campaignId: input.campaignId,
    campaignTitle: input.campaignTitle,
    destinationAddress: input.destinationAddress,
    amountCents: input.amountCents,
    txHash: input.txHash,
    createdAtMs: Date.now(),
  }
  addDonation(record)
  if (record.txHash !== undefined) {
    await syncDonations()
  }
  return record
}

/** Zabilježi tx hash iz Send flowa i odmah pokušaj backend confirm. */
export const recordDonationPayment = async (donationId: string, txHash: string): Promise<void> => {
  markDonationPaid(donationId, txHash)
  await syncDonations()
}

const needsConfirm = (record: DonationRecord): boolean => record.txHash !== undefined && record.confirmed !== true

/**
 * Retroaktivni confirm svih donacija s txHash-om bez backend potvrde. Svaki
 * mrežni pad je tih (best effort) — sljedeći ulaz u Doniraj pokušava ponovno,
 * a knjiženje ionako pokriva cron.
 */
export const syncDonations = async (): Promise<void> => {
  if (!isDonationsBackendConfigured()) {
    return
  }
  await Promise.all(
    getDonations()
      .filter(needsConfirm)
      .map(async (record) => {
        const { txHash } = record
        if (txHash === undefined) {
          return
        }
        const response = await confirmContribution(record.campaignId, txHash)
        const credited =
          response !== null &&
          response.ok === true &&
          response.mined === true &&
          response.reverted !== true &&
          (response.credited ?? 0) > 0
        if (credited) {
          markDonationConfirmed(record.id)
        }
      }),
  )
}

/**
 * Hook za Doniraj ekran: jedan sync na mount + ručni refresh. Bez backenda je
 * potpuni no-op.
 */
export const useDonationSync = (): { syncing: boolean; refresh: () => void } => {
  const [syncing, setSyncing] = useState(false)

  const refresh = useCallback(() => {
    if (!isDonationsBackendConfigured()) {
      return
    }
    setSyncing(true)
    void syncDonations().finally(() => setSyncing(false))
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { syncing, refresh }
}
