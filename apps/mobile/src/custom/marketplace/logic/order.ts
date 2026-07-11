import type { MerchantConfig, ShippingConfig } from '../catalog/types'

/**
 * Čista narudžbena aritmetika — sve cijene putuju kao decimalni EUR stringovi
 * ("64.90"), zbrajaju se u centima (integer), a u base jedinice tokena idu
 * isključivo kroz string/BigInt pretvorbu (isti obrazac kao FF
 * `logic/donation.ts`) da "129.80" uvijek završi kao točno
 * 129800000000000000000.
 */

export type OrderItem = {
  productId: string
  name: string
  size: string
  qty: number
  /** Jedinična cijena u EUR (decimalni string). */
  priceEur: string
}

/**
 * "64.90" / "64,90" / "65" → 6490 / 6490 / 6500 (centi). Vraća `null` za sve
 * što nije nenegativan iznos s najviše dvije decimale.
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

/** 6490 → "64.90" (kanonski decimalni string za daljnju aritmetiku). */
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

export type OrderTotals = {
  itemsEur: string
  shippingEur: string
  totalEur: string
}

/**
 * Zbroj stavki + dostava (fiksna, s pragom za besplatnu). Vraća `null` čim je
 * ijedna cijena neparsabilna ili količina nije pozitivan integer — `null`
 * znači "checkout gumb ostaje onemogućen", nikad tihi krivi iznos.
 */
export const orderTotals = (items: OrderItem[], shipping?: ShippingConfig): OrderTotals | null => {
  if (items.length === 0) {
    return null
  }

  let itemsCents = 0
  for (const item of items) {
    const unit = eurToCents(item.priceEur)
    if (unit === null || !Number.isInteger(item.qty) || item.qty <= 0) {
      return null
    }
    itemsCents += unit * item.qty
  }

  let shippingCents = 0
  if (shipping) {
    const flat = eurToCents(shipping.flatEur)
    if (flat === null) {
      return null
    }
    shippingCents = flat
    if (shipping.freeAboveEur !== undefined) {
      const threshold = eurToCents(shipping.freeAboveEur)
      if (threshold === null) {
        return null
      }
      if (itemsCents >= threshold) {
        shippingCents = 0
      }
    }
  }

  return {
    itemsEur: centsToEur(itemsCents),
    shippingEur: centsToEur(shippingCents),
    totalEur: centsToEur(itemsCents + shippingCents),
  }
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

/**
 * Ljudski čitljiva referenca narudžbe, npr. `CRO-LXK2M3-841`. Vremenska i
 * slučajna komponenta su injektabilne radi determinističkih testova.
 */
export const buildOrderReference = (
  merchantSlug: string,
  nowMs: number = Date.now(),
  random: () => number = Math.random,
): string => {
  const prefix =
    merchantSlug
      .replace(/[^a-zA-Z]/g, '')
      .slice(0, 3)
      .toUpperCase() || 'ORD'
  const time = nowMs.toString(36).toUpperCase()
  const suffix = String(Math.floor(random() * 900) + 100)
  return `${prefix}-${time}-${suffix}`
}

export type BuyerInfo = {
  fullName: string
  street: string
  postalCodeAndCity: string
  email: string
  phone?: string
}

/** Sva obvezna polja kupca popunjena (trim). */
export const isBuyerComplete = (buyer: BuyerInfo): boolean =>
  [buyer.fullName, buyer.street, buyer.postalCodeAndCity, buyer.email].every((field) => field.trim().length > 0)

/**
 * Tekst narudžbe za trgovca (share sheet / e-mail) — MVP kanal dostave
 * narudžbe dok ne postoji backend order-book (faza M2 u
 * docs/whitelabel-wallet/09-trznica-marketplace.md).
 */
export const composeOrderMessage = (params: {
  reference: string
  merchant: MerchantConfig
  items: OrderItem[]
  buyer: BuyerInfo
  totals: OrderTotals
  currencySymbol: string
  payerSafeAddress?: string
}): string => {
  const { reference, merchant, items, buyer, totals, currencySymbol, payerSafeAddress } = params

  const lines = [
    `Narudžba ${reference} — ${merchant.name}`,
    '',
    ...items.map(
      (item) => `• ${item.name} — veličina ${item.size} × ${item.qty} — ${formatEur(item.priceEur)} EUR/kom`,
    ),
    '',
    `Dostava: ${formatEur(totals.shippingEur)} EUR`,
    `Ukupno: ${formatEur(totals.totalEur)} EUR (plaćeno u ${currencySymbol})`,
    '',
    'Podaci za dostavu:',
    buyer.fullName,
    buyer.street,
    buyer.postalCodeAndCity,
    `E-mail: ${buyer.email}`,
  ]

  if (buyer.phone && buyer.phone.trim().length > 0) {
    lines.push(`Telefon: ${buyer.phone}`)
  }

  if (payerSafeAddress) {
    lines.push('', `Plaćeno s računa: ${payerSafeAddress}`)
  }

  return lines.join('\n')
}
