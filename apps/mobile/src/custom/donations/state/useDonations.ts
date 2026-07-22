import { useSyncExternalStore } from 'react'
import { createMMKV } from 'react-native-mmkv'

/**
 * Lokalna knjiga donacija — perzistirana u vlastitom MMKV namespaceu, namjerno
 * IZVAN host Redux storea (nula šavova u `src/store/index.ts`; isti obrazac
 * kao events `state/useTickets.ts`). MVP čuva samo lokalni zapis; backend
 * `contribution_status`/confirm služe za potvrdu knjiženja, cron je fallback.
 */

export type DonationRecord = {
  /** Client-generated UUID zapisa. */
  id: string
  /** Slug subjekta (kampanjski link) — za ponovno otvaranje kampanje. */
  slug: string
  campaignId: string
  campaignTitle: string
  /** Campaign Safe na koji je donacija poslana. */
  destinationAddress: string
  amountCents: number
  /** Hash transakcije nakon povratka iz Send flowa (best effort). */
  txHash?: string
  /** Backend je proknjižio donaciju (pinka-onchain-confirm verificirao tx). */
  confirmed?: boolean
  createdAtMs: number
}

const storage = createMMKV({ id: 'donations' })

const RECORDS_KEY = 'donations/records'

const listeners = new Set<() => void>()

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const parseRecords = (raw: string | undefined): DonationRecord[] => {
  if (!raw) {
    return []
  }
  try {
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as DonationRecord[]) : []
  } catch {
    return []
  }
}

// Snapshot se kešira po sirovom stringu — useSyncExternalStore zahtijeva
// referencijalno stabilan rezultat za nepromijenjeno stanje.
let cachedRaw: string | undefined
let cachedRecords: DonationRecord[] = []

const getSnapshot = (): DonationRecord[] => {
  const raw = storage.getString(RECORDS_KEY)
  if (raw !== cachedRaw) {
    cachedRaw = raw
    cachedRecords = parseRecords(raw)
  }
  return cachedRecords
}

const persist = (records: DonationRecord[]): void => {
  storage.set(RECORDS_KEY, JSON.stringify(records))
  listeners.forEach((listener) => listener())
}

/** Dodaje donaciju na početak liste (najnovija prva). */
export const addDonation = (record: DonationRecord): void => {
  persist([record, ...getSnapshot()])
}

/** Zabilježi tx hash iz Send flowa (best effort, prije backend potvrde). */
export const markDonationPaid = (donationId: string, txHash: string): void => {
  persist(getSnapshot().map((record) => (record.id === donationId ? { ...record, txHash } : record)))
}

/** Označi donaciju backend-proknjiženom (nakon uspješnog confirma). */
export const markDonationConfirmed = (donationId: string): void => {
  persist(getSnapshot().map((record) => (record.id === donationId ? { ...record, confirmed: true } : record)))
}

/** Sve donacije na uređaju, najnovija prva. */
export const useDonationRecords = (): DonationRecord[] => useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

/** Snapshot bez subscriptiona (za sync logiku izvan Reacta). */
export const getDonations = (): DonationRecord[] => getSnapshot()

/** Samo za testove — čisti namespace. */
export const clearDonationsForTesting = (): void => {
  storage.remove(RECORDS_KEY)
  cachedRaw = undefined
  cachedRecords = []
  listeners.forEach((listener) => listener())
}
