import { useCallback, useEffect, useState } from 'react'
import type { EventConfig, TicketTierConfig } from '../catalog/types'
import { eurToCents, type TicketHolder, type TicketTotals } from '../logic/ticketOrder'
import { applyBackendSync, getTicketOrders, markTicketOrderPaid, type TicketOrder } from '../state/useTickets'
import { confirmTicketOrder, fetchBackendOrders, submitTicketOrder } from './client'
import { isEventsBackendConfigured } from './config'
import type { BackendTicket } from './types'

/**
 * Sinkronizacija narudžbi s domovina-api backendom (E2):
 *   - checkout: `submitOrder` rezervira inventory PRIJE plaćanja; backend
 *     nedostupan → `unreachable` i narudžba ostaje čisto lokalna (E1);
 *     eksplicitno odbijanje (rasprodano, prodaja zatvorena…) je autoritativno.
 *   - `recordTicketPayment`: tx hash iz Send flowa → lokalni zapis + confirm.
 *   - `syncTicketOrders` (+ hook za Moje ulaznice): retroaktivni confirm
 *     ne-potvrđenih uplata i dohvat izdanih ulaznica (QR token stiže
 *     jednokratno i čuva se u lokalnom MMKV zapisu).
 * Backend nikad ne drži ključeve ni sredstva — plaćanje uvijek ide postojećim
 * Send flowom, autorizacija kreditiranja je onchain verifikacija.
 */

export type SubmitOutcome =
  | { kind: 'ok'; backendOrderId: string }
  | { kind: 'rejected'; code: string }
  | {
      kind: 'skipped'
    }

const randomUuid = (): string => {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/**
 * Pošalji narudžbu backendu pri checkoutu. `skipped` = backend nedostupan ili
 * event/tier nije s backend kataloga → pozivatelj nastavlja točno kao u E1.
 */
export const submitOrder = async (params: {
  event: EventConfig
  tier: TicketTierConfig
  quantity: number
  holders: TicketHolder[]
  totals: TicketTotals
  payerSafeAddress?: string
}): Promise<SubmitOutcome> => {
  const { event, tier, quantity, holders, totals, payerSafeAddress } = params
  if (!isEventsBackendConfigured() || event.backendCampaignId === undefined || tier.backendTierId === undefined) {
    return { kind: 'skipped' }
  }

  const orderId = randomUuid()
  const result = await submitTicketOrder({
    order_id: orderId,
    campaign_id: event.backendCampaignId,
    tier_id: tier.backendTierId,
    quantity,
    holders: (tier.imenska ? holders.slice(0, quantity) : []).map((holder) => ({
      full_name: holder.fullName.trim(),
      email: holder.email !== undefined && holder.email.trim().length > 0 ? holder.email.trim() : undefined,
    })),
    payer_address: payerSafeAddress,
  })

  if (result.kind === 'rejected') {
    return { kind: 'rejected', code: result.code }
  }
  if (result.kind === 'unreachable') {
    return { kind: 'skipped' }
  }
  // Backend iznos MORA odgovarati lokalnom — drift kataloga bi značio krivu
  // uplatu i neuspješan confirm; tada je sigurnije odbiti i osvježiti katalog.
  const expectedCents = eurToCents(totals.totalEur)
  if (expectedCents === null || result.order.amount_cents !== expectedCents) {
    return { kind: 'rejected', code: 'amount_mismatch' }
  }
  return { kind: 'ok', backendOrderId: result.order.order_id }
}

const toIssuedTickets = (tickets: BackendTicket[]) =>
  tickets.map((ticket) => ({
    serial: ticket.serial,
    holderName: ticket.holder_name ?? undefined,
    state: ticket.state,
    qrToken: ticket.qr_token ?? undefined,
  }))

/** Zabilježi tx hash iz Send flowa i odmah pokušaj backend confirm. */
export const recordTicketPayment = async (orderId: string, txHash: string): Promise<void> => {
  markTicketOrderPaid(orderId, txHash)
  await syncTicketOrders()
}

const needsConfirm = (order: TicketOrder): boolean =>
  order.backendOrderId !== undefined &&
  order.txHash !== undefined &&
  order.backendState !== 'paid' &&
  order.confirmedTxHash === undefined

/**
 * Retroaktivni confirm + refetch ulaznica za sve backend narudžbe na uređaju.
 * Svaki mrežni pad je tih (best effort) — sljedeći ulaz u Moje ulaznice
 * pokušava ponovno.
 */
export const syncTicketOrders = async (): Promise<void> => {
  if (!isEventsBackendConfigured()) {
    return
  }
  const orders = getTicketOrders()

  await Promise.all(
    orders.filter(needsConfirm).map(async (order) => {
      const { backendOrderId, txHash } = order
      if (backendOrderId === undefined || txHash === undefined) {
        return
      }
      const response = await confirmTicketOrder(backendOrderId, txHash)
      if (response !== null && (response.status === 'paid' || response.status === 'already_paid')) {
        applyBackendSync(order.id, { backendState: 'paid', confirmedTxHash: txHash })
      }
    }),
  )

  const backendIds = getTicketOrders()
    .map((order) => order.backendOrderId)
    .filter((id): id is string => id !== undefined)
  if (backendIds.length === 0) {
    return
  }
  const backendOrders = await fetchBackendOrders(backendIds)
  if (backendOrders === null) {
    return
  }
  const byBackendId = new Map(backendOrders.map((order) => [order.order_id, order]))
  getTicketOrders().forEach((order) => {
    if (order.backendOrderId === undefined) {
      return
    }
    const remote = byBackendId.get(order.backendOrderId)
    if (remote === undefined) {
      return
    }
    applyBackendSync(order.id, {
      backendState: remote.state,
      tickets: remote.tickets.length > 0 ? toIssuedTickets(remote.tickets) : undefined,
    })
  })
}

/**
 * Hook za Moje ulaznice: jedan sync na mount + ručni refresh. Bez backenda je
 * potpuni no-op (E1 ponašanje netaknuto).
 */
export const useTicketSync = (): { syncing: boolean; refresh: () => void } => {
  const [syncing, setSyncing] = useState(false)

  const refresh = useCallback(() => {
    if (!isEventsBackendConfigured()) {
      return
    }
    setSyncing(true)
    void syncTicketOrders().finally(() => setSyncing(false))
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { syncing, refresh }
}
