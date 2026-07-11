/**
 * Trgovac-as-data: jedan binary poslužuje N malih trgovaca ("Shopify za
 * hrvatske MSP-ove"); katalog je config, ne kod — isti invariant kao FF
 * klub-as-data (`src/custom/ff/clubs/types.ts`). Cijene su decimalni stringovi
 * u EUR ("64.90") — nikad float — a pretvorba u base jedinice tokena ide kroz
 * logic/order.ts string/BigInt aritmetiku.
 */

export type CurrencyConfig = {
  /** ERC-20 adresa tokena namire. */
  tokenAddress: string
  /** Chain na kojem živi trgovčev Safe i token. */
  chainId: string
  symbol: string
  decimals: number
}

export type MerchantBrand = {
  /** Dominantna brand boja (hex `#RRGGBB`) — headeri, naglasci. */
  primaryHex: string
  /** Akcentna boja — CTA elementi. */
  accentHex: string
}

/** Zakonski podaci izdavatelja računa — obvezni na potvrdi narudžbe. */
export type MerchantLegal = {
  /** Puni naziv pravnog subjekta (d.o.o. / j.d.o.o. / obrt). */
  legalName: string
  /** OIB; `undefined` → prikaži trgovinu kao ilustrativnu. */
  oib?: string
  address?: string
  email?: string
  phone?: string
  web?: string
}

export type ShippingConfig = {
  /** Fiksna dostava u EUR (decimalni string); "0" = besplatna. */
  flatEur: string
  /** Prag za besplatnu dostavu u EUR; izostavljeno → nema praga. */
  freeAboveEur?: string
  note?: string
}

export type ProductConfig = {
  /** Stabilan identifikator unutar trgovca (slug). */
  id: string
  name: string
  /** Cijena u EUR kao decimalni string ("64.90") — bez floata. */
  priceEur: string
  desc: string
  /** Priča/inspiracija modela (marketing copy trgovca). */
  story?: string
  sizes: string[]
  material?: string
  imageUrl?: string
  /** Link na proizvod u postojećem webshopu trgovca. */
  productUrl?: string
}

export type MerchantConfig = {
  /** Stabilan identifikator trgovca (slug). */
  slug: string
  name: string
  tagline?: string
  town?: string
  story?: string
  logoUrl?: string
  brand: MerchantBrand
  legal?: MerchantLegal
  /**
   * Checksummed adresa trgovčevog Safe-a na chainu valute. Dok nije deployan
   * i upisan, plaćanje je onemogućeno u UI-ju (nikad ne izmišljamo adrese) —
   * katalog ostaje pregledan.
   */
  safeAddress?: string
  /** Override valute; izostavljeno → DEFAULT_CURRENCY (EURe na Gnosisu). */
  currency?: CurrencyConfig
  shipping?: ShippingConfig
  products: ProductConfig[]
}
