import { useSyncExternalStore } from 'react'
import { createMMKV } from 'react-native-mmkv'
import type { BuyerInfo, OrderItem, OrderTotals } from '../logic/order'

/**
 * Lokalna knjiga narudžbi — perzistirana u vlastitom MMKV namespaceu,
 * namjerno IZVAN host Redux storea (nula šavova u `src/store/index.ts`; isti
 * obrazac kao FF `state/useSelectedClub.ts`). MVP nema backend order-book
 * (faza M2) pa je ovo jedini izvor istine o kupčevim narudžbama na uređaju.
 */

export type OrderStatus = 'pending' | 'sent'

export type Order = {
  id: string
  reference: string
  merchantSlug: string
  items: OrderItem[]
  buyer: BuyerInfo
  totals: OrderTotals
  currencySymbol: string
  /** Adresa Safe-a s kojeg je kupac platio (za referencu trgovcu). */
  payerSafeAddress?: string
  status: OrderStatus
  createdAtMs: number
}

const storage = createMMKV({ id: 'marketplace' })

const ORDERS_KEY = 'marketplace/orders'

const listeners = new Set<() => void>()

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const parseOrders = (raw: string | undefined): Order[] => {
  if (!raw) {
    return []
  }
  try {
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as Order[]) : []
  } catch {
    return []
  }
}

// Snapshot se kešira po sirovom stringu — useSyncExternalStore zahtijeva
// referencijalno stabilan rezultat za nepromijenjeno stanje.
let cachedRaw: string | undefined
let cachedOrders: Order[] = []

const getSnapshot = (): Order[] => {
  const raw = storage.getString(ORDERS_KEY)
  if (raw !== cachedRaw) {
    cachedRaw = raw
    cachedOrders = parseOrders(raw)
  }
  return cachedOrders
}

const persist = (orders: Order[]): void => {
  storage.set(ORDERS_KEY, JSON.stringify(orders))
  listeners.forEach((listener) => listener())
}

/** Dodaje narudžbu na početak liste (najnovija prva). */
export const addOrder = (order: Order): void => {
  persist([order, ...getSnapshot()])
}

export const setOrderStatus = (orderId: string, status: OrderStatus): void => {
  persist(getSnapshot().map((order) => (order.id === orderId ? { ...order, status } : order)))
}

/** Sve narudžbe na uređaju, najnovija prva. */
export const useOrders = (): Order[] => useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

/** Samo za testove — čisti namespace. */
export const clearOrdersForTesting = (): void => {
  storage.remove(ORDERS_KEY)
  cachedRaw = undefined
  cachedOrders = []
  listeners.forEach((listener) => listener())
}
