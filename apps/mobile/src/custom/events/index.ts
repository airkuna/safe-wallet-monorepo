export { isEventsBrand } from './isEventsBrand'
export {
  EVENTS,
  EVENT_SLUGS,
  getEvent,
  getEventCatalog,
  getTier,
  isTierOnSale,
  setBackendEvents,
} from './catalog/registry'
export { mapFeedRowToEvent, refreshEventCatalog, useEventCatalog } from './catalog/backendSource'
export { DEFAULT_CURRENCY } from './catalog/currency'
export { isEventsBackendConfigured } from './api/config'
export { submitOrder, recordTicketPayment, syncTicketOrders, useTicketSync } from './api/useTicketSync'
export type { SubmitOutcome } from './api/useTicketSync'
export type {
  EventConfig,
  EventType,
  VenueConfig,
  OrganizerConfig,
  TicketTierConfig,
  CurrencyConfig,
} from './catalog/types'
export { evStrings } from './strings'
export { useTicketOrders, addTicketOrder, markTicketOrderPaid, applyBackendSync } from './state/useTickets'
export type { TicketOrder, TicketOrderStatus, IssuedTicket } from './state/useTickets'
export { buildTicketQrPayload, parseTicketQrPayload, TICKET_QR_PREFIX } from './logic/qrPayload'
export {
  recordEntryScan,
  findPriorOkScan,
  getLocalEntryCount,
  useEntryLog,
  tokenFingerprint,
} from './state/useEntryLog'
export type { EntryScanRecord, EntryScanResult } from './state/useEntryLog'
export { getScannerToken, setScannerToken, clearScannerToken, useScannerToken } from './state/useScannerAuth'
export type { CheckinResponse, CheckinResult, CheckinStatus } from './api/types'
export { buildEventLink } from './logic/eventLink'
export type {
  OrganizerAccount,
  OrganizerEvent,
  OrganizerOverview,
  OrganizerResult,
  OrganizerTier,
  OrganizerTierInput,
} from './api/types'
export {
  ticketTotals,
  toBaseUnits,
  formatEur,
  formatEventDate,
  holdersComplete,
  buildTicketReference,
  composeTicketOrderMessage,
} from './logic/ticketOrder'
export type { TicketHolder, TicketTotals } from './logic/ticketOrder'
