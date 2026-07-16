import { useSyncExternalStore } from 'react'
import { createMMKV } from 'react-native-mmkv'
import type { TicketHolder, TicketTotals } from '../logic/ticketOrder'

/**
 * Lokalna knjiga narudžbi ulaznica — perzistirana u vlastitom MMKV
 * namespaceu, namjerno IZVAN host Redux storea (nula šavova u
 * `src/store/index.ts`; isti obrazac kao Tržnica `state/useOrders.ts`).
 * E1 nema backend pa je ovo jedini izvor istine o kupčevim ulaznicama na
 * uređaju; prava verifikacija uplate i izdane ulaznice = faza E2.
 */

export type TicketOrderStatus = 'pending' | 'paid-unverified' | 'issued'

/** Izdana ulaznica s backenda (E2) — QR token stiže jednokratno i čuva se ovdje. */
export type IssuedTicket = {
  serial: string
  holderName?: string
  state: 'issued' | 'checked_in' | 'void'
  /** Opaque QR token (backend čuva samo hash); undefined dok nije isporučen. */
  qrToken?: string
}

export type TicketOrder = {
  /** = referenca (stabilan id). */
  id: string
  reference: string
  eventSlug: string
  tierId: string
  quantity: number
  /** Imena po komadu za imenske tiere; prazno za neimenske. */
  holders: TicketHolder[]
  totals: TicketTotals
  currencySymbol: string
  /** Adresa Safe-a s kojeg je kupac platio (za referencu organizatoru). */
  payerSafeAddress?: string
  /** Hash transakcije nakon povratka iz Send flowa (best effort). */
  txHash?: string
  status: TicketOrderStatus
  createdAtMs: number
  /** Backend narudžba (E2): UUID = idempotency ključ i bearer capability. */
  backendOrderId?: string
  /** Zadnje poznato backend stanje narudžbe (pending|paid|expired|…). */
  backendState?: string
  /** Tx hash koji je backend verificirao (nakon uspješnog events-confirm). */
  confirmedTxHash?: string
  /** Izdane ulaznice s backenda; postavlja status na 'issued'. */
  tickets?: IssuedTicket[]
}

const storage = createMMKV({ id: 'events' })

const ORDERS_KEY = 'events/ticketOrders'

const listeners = new Set<() => void>()

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const parseOrders = (raw: string | undefined): TicketOrder[] => {
  if (!raw) {
    return []
  }
  try {
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as TicketOrder[]) : []
  } catch {
    return []
  }
}

// Snapshot se kešira po sirovom stringu — useSyncExternalStore zahtijeva
// referencijalno stabilan rezultat za nepromijenjeno stanje.
let cachedRaw: string | undefined
let cachedOrders: TicketOrder[] = []

const getSnapshot = (): TicketOrder[] => {
  const raw = storage.getString(ORDERS_KEY)
  if (raw !== cachedRaw) {
    cachedRaw = raw
    cachedOrders = parseOrders(raw)
  }
  return cachedOrders
}

const persist = (orders: TicketOrder[]): void => {
  storage.set(ORDERS_KEY, JSON.stringify(orders))
  listeners.forEach((listener) => listener())
}

/** Dodaje narudžbu na početak liste (najnovija prva). */
export const addTicketOrder = (order: TicketOrder): void => {
  persist([order, ...getSnapshot()])
}

/** Označava narudžbu plaćenom (best effort, prije E2 verifikacije). */
export const markTicketOrderPaid = (orderId: string, txHash?: string): void => {
  persist(
    getSnapshot().map((order) =>
      order.id === orderId ? { ...order, status: 'paid-unverified' as const, txHash: txHash ?? order.txHash } : order,
    ),
  )
}

/**
 * Merge backend sync rezultata u lokalnu narudžbu. QR tokeni se isporučuju
 * JEDNOKRATNO (backend potom čuva samo hash), pa se već spremljeni token po
 * serialu nikad ne pregazi praznim.
 */
export const applyBackendSync = (
  orderId: string,
  patch: { backendState?: string; confirmedTxHash?: string; tickets?: IssuedTicket[] },
): void => {
  persist(
    getSnapshot().map((order) => {
      if (order.id !== orderId) {
        return order
      }
      const previousBySerial = new Map((order.tickets ?? []).map((ticket) => [ticket.serial, ticket]))
      const tickets =
        patch.tickets === undefined
          ? order.tickets
          : patch.tickets.map((ticket) => ({
              ...ticket,
              qrToken: ticket.qrToken ?? previousBySerial.get(ticket.serial)?.qrToken,
            }))
      return {
        ...order,
        backendState: patch.backendState ?? order.backendState,
        confirmedTxHash: patch.confirmedTxHash ?? order.confirmedTxHash,
        tickets,
        status: tickets !== undefined && tickets.length > 0 ? ('issued' as const) : order.status,
      }
    }),
  )
}

/** Sve narudžbe ulaznica na uređaju, najnovija prva. */
export const useTicketOrders = (): TicketOrder[] => useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

/** Snapshot bez subscriptiona (za sync logiku izvan Reacta). */
export const getTicketOrders = (): TicketOrder[] => getSnapshot()

/** Samo za testove — čisti namespace. */
export const clearTicketOrdersForTesting = (): void => {
  storage.remove(ORDERS_KEY)
  cachedRaw = undefined
  cachedOrders = []
  listeners.forEach((listener) => listener())
}
