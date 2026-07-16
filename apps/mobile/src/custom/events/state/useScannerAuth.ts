import { useSyncExternalStore } from 'react'
import { createMMKV } from 'react-native-mmkv'

/**
 * Pristupni token skenera (GoTrue JWT org admina) — organizator ga zalijepi u
 * Skener ulaza; čuva se lokalno u MMKV-u i šalje kao Authorization header
 * prema events-checkin.
 *
 * VAŽNO: ovo NIJE autorizacija — samo transport kredencijala. Tko smije
 * redeem-ati odlučuje isključivo backend (`redeem_ticket` RPC:
 * has_role_on_account admin). Token bez admin role dobiva 403 na svakom skenu.
 * Wallet je self-custody (nema GoTrue sesiju), pa je paste-token pragmatični
 * MVP; pravi organizator login/refresh je E4 (v. Zapisnik E3).
 */

const storage = createMMKV({ id: 'events-entry-log' })

const TOKEN_KEY = 'events/scannerToken'

const listeners = new Set<() => void>()

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const getSnapshot = (): string | undefined => storage.getString(TOKEN_KEY)

export const getScannerToken = (): string | undefined => getSnapshot()

export const setScannerToken = (token: string): void => {
  const trimmed = token.trim()
  if (trimmed.length === 0) {
    storage.remove(TOKEN_KEY)
  } else {
    storage.set(TOKEN_KEY, trimmed)
  }
  listeners.forEach((listener) => listener())
}

export const clearScannerToken = (): void => {
  storage.remove(TOKEN_KEY)
  listeners.forEach((listener) => listener())
}

/** Trenutni token skenera (reaktivno). */
export const useScannerToken = (): string | undefined => useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
