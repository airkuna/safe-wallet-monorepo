import type { EventConfig, TicketTierConfig } from '../catalog/types'

/**
 * Čista narudžbena aritmetika za ulaznice — cijene putuju kao decimalni EUR
 * stringovi ("149.00"), zbrajaju se u centima (integer), a u base jedinice
 * tokena idu isključivo kroz string/BigInt pretvorbu. Isti obrazac kao
 * Tržnica `logic/order.ts` (svaki pack je samodostatan — bez cross-pack
 * importa). `null` uvijek znači "CTA ostaje onemogućen", nikad tihi krivi
 * iznos.
 */

export const DEFAULT_MAX_PER_ORDER = 10

/**
 * "149.00" / "149,00" / "149" → 14900 (centi). Vraća `null` za sve što nije
 * nenegativan iznos s najviše dvije decimale.
 */
export const eurToCents = (eur: string): number | null => {
  const normalized = eur.trim().replace(',', '.')
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(normalized)
  if (!match) {
    return null
  }
  const [, intPart, fracPart = ''] = match
  return Number(intPart) * 100 + Number(fracPart.padEnd(2, '0'))
}

/** 14900 → "149.00" (kanonski decimalni string za daljnju aritmetiku). */
export const centsToEur = (cents: number): string => {
  const whole = Math.floor(cents / 100)
  const frac = cents % 100
  return `${whole}.${String(frac).padStart(2, '0')}`
}

/** "1264.90" → "1.264,90" — hrvatski prikaz s tisućicama i zarezom. */
export const formatEur = (eur: string): string => {
  const cents = eurToCents(eur)
  if (cents === null) {
    return eur
  }
  const [intPart, fracPart] = centsToEur(cents).split('.')
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${grouped},${fracPart}`
}

export type TicketTotals = {
  unitEur: string
  totalEur: string
}

/**
 * Ukupno za `qty` komada jednog tiera. Vraća `null` čim je cijena
 * neparsabilna ili količina nije pozitivan integer unutar limita narudžbe.
 */
export const ticketTotals = (tier: TicketTierConfig, qty: number): TicketTotals | null => {
  const unit = eurToCents(tier.priceEur)
  const max = tier.maxPoNarudzbi ?? DEFAULT_MAX_PER_ORDER
  if (unit === null || !Number.isInteger(qty) || qty <= 0 || qty > max) {
    return null
  }
  return { unitEur: centsToEur(unit), totalEur: centsToEur(unit * qty) }
}

/**
 * Pretvara decimalni iznos u integer string u base jedinicama tokena
 * (`prefillValueRaw` ugovor Send flowa). Vraća `null` za sve što nije
 * pozitivan decimalni broj.
 */
export const toBaseUnits = (amount: string, decimals: number): string | null => {
  if (!Number.isInteger(decimals) || decimals < 0) {
    return null
  }

  const normalized = amount.trim().replace(',', '.')
  const match = /^(\d*)(?:\.(\d*))?$/.exec(normalized)
  if (!match) {
    return null
  }

  const [, intPart = '', fracPart = ''] = match
  if (intPart.length + fracPart.length === 0) {
    return null
  }
  if (fracPart.length > decimals) {
    return null
  }

  const digits = (intPart + fracPart.padEnd(decimals, '0')).replace(/^0+(?=\d)/, '')
  if (!digits || BigInt(digits) === 0n) {
    return null
  }

  return digits
}

export type TicketHolder = {
  fullName: string
  email?: string
}

/**
 * Za imenski tier svih `qty` imena mora biti popunjeno (trim); za neimenski
 * tier holderi se ne traže.
 */
export const holdersComplete = (tier: TicketTierConfig, holders: TicketHolder[], qty: number): boolean => {
  if (!tier.imenska) {
    return true
  }
  if (holders.length < qty) {
    return false
  }
  return holders.slice(0, qty).every((holder) => holder.fullName.trim().length > 0)
}

/**
 * Ljudski čitljiva referenca narudžbe, npr. `MON-LXK2M3-841`. Vremenska i
 * slučajna komponenta su injektabilne radi determinističkih testova.
 */
export const buildTicketReference = (
  eventSlug: string,
  nowMs: number = Date.now(),
  random: () => number = Math.random,
): string => {
  const prefix =
    eventSlug
      .replace(/[^a-zA-Z]/g, '')
      .slice(0, 3)
      .toUpperCase() || 'EVT'
  const time = nowMs.toString(36).toUpperCase()
  const suffix = String(Math.floor(random() * 900) + 100)
  return `${prefix}-${time}-${suffix}`
}

/**
 * "2027-03-10" (+ opcionalni kraj) → "10.3.2027." / "10.–11.3.2027." /
 * "10.3.–2.4.2027." — bez `Date` objekta (nula TZ iznenađenja). Neparsabilan
 * ulaz → prazan string; event bez termina prikazuje "uskoro" (strings).
 */
export const formatEventDate = (startIso?: string, endIso?: string): string => {
  const parse = (iso: string): [number, number, number] | null => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
    if (!match) {
      return null
    }
    return [Number(match[1]), Number(match[2]), Number(match[3])]
  }

  if (startIso === undefined) {
    return ''
  }
  const start = parse(startIso)
  if (start === null) {
    return ''
  }
  const [startYear, startMonth, startDay] = start

  const end = endIso === undefined ? null : parse(endIso)
  if (end === null || (end[0] === startYear && end[1] === startMonth && end[2] === startDay)) {
    return `${startDay}.${startMonth}.${startYear}.`
  }

  const [endYear, endMonth, endDay] = end
  if (endYear === startYear && endMonth === startMonth) {
    return `${startDay}.–${endDay}.${startMonth}.${startYear}.`
  }
  if (endYear === startYear) {
    return `${startDay}.${startMonth}.–${endDay}.${endMonth}.${startYear}.`
  }
  return `${startDay}.${startMonth}.${startYear}.–${endDay}.${endMonth}.${endYear}.`
}

/**
 * Tekst narudžbe za organizatora (share sheet / e-mail) — MVP kanal dostave
 * narudžbe dok ne postoji backend order-book (faza E2 u
 * docs/whitelabel-wallet/11-dogadjaji-p2p-ticketing.md).
 */
export const composeTicketOrderMessage = (params: {
  reference: string
  event: EventConfig
  tier: TicketTierConfig
  quantity: number
  holders: TicketHolder[]
  totals: TicketTotals
  currencySymbol: string
  payerSafeAddress?: string
  txHash?: string
}): string => {
  const { reference, event, tier, quantity, holders, totals, currencySymbol, payerSafeAddress, txHash } = params

  const lines = [
    `Narudžba ulaznica ${reference} — ${event.naziv}`,
    '',
    `• ${tier.naziv} × ${quantity} — ${formatEur(totals.unitEur)} EUR/kom`,
    `Ukupno: ${formatEur(totals.totalEur)} EUR (plaćeno u ${currencySymbol})`,
  ]

  if (tier.imenska && holders.length > 0) {
    lines.push('', 'Ulaznice glase na:')
    holders.slice(0, quantity).forEach((holder, index) => {
      const email = holder.email !== undefined && holder.email.trim().length > 0 ? ` (${holder.email.trim()})` : ''
      lines.push(`${index + 1}. ${holder.fullName.trim()}${email}`)
    })
  }

  if (payerSafeAddress) {
    lines.push('', `Plaćeno s računa: ${payerSafeAddress}`)
  }
  if (txHash) {
    lines.push(`Transakcija: ${txHash}`)
  }

  return lines.join('\n')
}
