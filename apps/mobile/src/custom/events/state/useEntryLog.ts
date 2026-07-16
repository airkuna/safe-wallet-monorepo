import { useSyncExternalStore } from 'react'
import { createMMKV } from 'react-native-mmkv'

/**
 * Lokalni log skeniranja na ulazu (MMKV, organizatorov uređaj) — vlastiti
 * namespace, izvan host Redux storea (isti obrazac kao `useTickets`).
 *
 * Uloga u online-only MVP-u (E3 odluka): backend (`redeem_ticket`) je jedina
 * istina o check-inu; log služi kao (1) brojač ulazaka na pultu, (2) brzi
 * lokalni pre-check dvostrukog skena BEZ mrežnog poziva (isti uređaj), i
 * (3) audit trag skenova uklj. neuspjele zbog pada mreže. NIKAD ne "priznaje"
 * ulaz koji backend nije potvrdio. Offline redeem s potpisanim voucherima je
 * dokumentirani upgrade path (v. Zapisnik E3).
 *
 * Privatnost: sprema se samo fingerprint tokena (prvih 16 hex znakova), nikad
 * cijeli token — organizatorov uređaj ne smije akumulirati bearer tokene.
 */

export type EntryScanResult = 'ok' | 'duplicate' | 'rejected' | 'error'

export type EntryScanRecord = {
  /** Prvih 16 hex znakova tokena — dovoljno za lokalni duplicate pre-check. */
  tokenFingerprint: string
  serial?: string
  holderName?: string
  tierTitle?: string
  result: EntryScanResult
  atMs: number
}

export const TOKEN_FINGERPRINT_LENGTH = 16

export const tokenFingerprint = (qrToken: string): string => qrToken.slice(0, TOKEN_FINGERPRINT_LENGTH)

const storage = createMMKV({ id: 'events-entry-log' })

const LOG_KEY = 'events/entryLog'

const listeners = new Set<() => void>()

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const parseLog = (raw: string | undefined): EntryScanRecord[] => {
  if (!raw) {
    return []
  }
  try {
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as EntryScanRecord[]) : []
  } catch {
    return []
  }
}

let cachedRaw: string | undefined
let cachedLog: EntryScanRecord[] = []

const getSnapshot = (): EntryScanRecord[] => {
  const raw = storage.getString(LOG_KEY)
  if (raw !== cachedRaw) {
    cachedRaw = raw
    cachedLog = parseLog(raw)
  }
  return cachedLog
}

const persist = (log: EntryScanRecord[]): void => {
  storage.set(LOG_KEY, JSON.stringify(log))
  listeners.forEach((listener) => listener())
}

/** Dodaje sken na početak loga (najnoviji prvi). */
export const recordEntryScan = (record: EntryScanRecord): void => {
  persist([record, ...getSnapshot()])
}

/**
 * Lokalni anti-double-entry pre-check: prvi USPJEŠNI (ok) sken istog tokena na
 * OVOM uređaju, ako postoji — skener tada pokazuje ⛔ bez mrežnog poziva.
 * Backend ostaje autoritativan za skenove s drugih uređaja.
 */
export const findPriorOkScan = (fingerprint: string): EntryScanRecord | undefined =>
  getSnapshot().find((record) => record.tokenFingerprint === fingerprint && record.result === 'ok')

/** Broj uspješnih ulazaka zabilježenih na ovom uređaju. */
export const getLocalEntryCount = (): number => getSnapshot().filter((record) => record.result === 'ok').length

/** Log skenova, najnoviji prvi. */
export const useEntryLog = (): EntryScanRecord[] => useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

/** Samo za testove — čisti namespace. */
export const clearEntryLogForTesting = (): void => {
  storage.remove(LOG_KEY)
  cachedRaw = undefined
  cachedLog = []
  listeners.forEach((listener) => listener())
}
