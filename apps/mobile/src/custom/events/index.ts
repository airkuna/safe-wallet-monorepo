export { isEventsBrand } from './isEventsBrand'
export { EVENTS, EVENT_SLUGS, getEvent, getTier, isTierOnSale } from './catalog/registry'
export { DEFAULT_CURRENCY } from './catalog/currency'
export type {
  EventConfig,
  EventType,
  VenueConfig,
  OrganizerConfig,
  TicketTierConfig,
  CurrencyConfig,
} from './catalog/types'
export { evStrings } from './strings'
export { useTicketOrders, addTicketOrder, markTicketOrderPaid } from './state/useTickets'
export type { TicketOrder, TicketOrderStatus } from './state/useTickets'
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
