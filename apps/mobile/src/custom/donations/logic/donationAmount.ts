import { generateEip681Uri, type Eip681Transfer } from '@safe-global/utils/utils/eip681'

/**
 * Valuta-as-config: donacijska tračnica domovina.ai je danas hard-wired na
 * EURe/Gnosis (docs/whitelabel-wallet/15-airkuna-wallet.md §5); prelazak na
 * KUNA token mijenja SAMO ove konstante (uz pinka backend) — nijedan ekran ne
 * hardkodira simbol/adresu/decimale.
 */
export const DONATION_CURRENCY = {
  symbol: 'EURe',
  tokenAddress: '0x420CA0f9B9b604cE0fd9C18EF134C705e5Fa3430',
  chainId: '100',
  decimals: 18,
} as const

// EURe ima 18 decimala, iznos se unosi u centima: wei = centi × 1e16 (BigInt,
// nikad float aritmetika — [15] §5, isti izračun kao pinka_config.dart).
const WEI_PER_CENT = 10n ** 16n

/** Centi → wei kao integer string; `null` za sve što nije pozitivan integer. */
export const centsToWei = (cents: number): string | null => {
  if (!Number.isInteger(cents) || cents <= 0) {
    return null
  }
  return (BigInt(cents) * WEI_PER_CENT).toString()
}

/**
 * "10" / "10,50" / "10.50" → centi. Vraća `null` za sve što nije pozitivan
 * iznos s najviše dvije decimale (`null` = CTA ostaje onemogućen, nikad tihi
 * krivi iznos — isti ugovor kao events `eurToCents`).
 */
export const eurAmountToCents = (input: string): number | null => {
  const normalized = input.trim().replace(',', '.')
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(normalized)
  if (!match) {
    return null
  }
  const [, intPart, fracPart = ''] = match
  const cents = Number(intPart) * 100 + Number(fracPart.padEnd(2, '0'))
  return cents > 0 ? cents : null
}

/** 1050 → "10,50" — hrvatski prikaz iznosa u centima (tisućice točkom). */
export const formatCents = (cents: number): string => {
  const whole = Math.floor(cents / 100)
  const frac = String(cents % 100).padStart(2, '0')
  const grouped = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${grouped},${frac}`
}

/**
 * Sastavlja EIP-681 transfer za postojeći Send flow: EURe na Gnosisu (100) na
 * `destination_address` kampanje. `null` kad iznos nije valjan.
 */
export const buildDonationTransfer = (destinationAddress: string, cents: number): Eip681Transfer | null => {
  const value = centsToWei(cents)
  if (value === null) {
    return null
  }
  return {
    recipient: destinationAddress,
    chainId: DONATION_CURRENCY.chainId,
    tokenAddress: DONATION_CURRENCY.tokenAddress,
    value,
  }
}

/** EIP-681 URI identičan QR-u s donacijske stranice ([15] §5). */
export const buildDonationEip681Uri = (destinationAddress: string, cents: number): string | null => {
  const transfer = buildDonationTransfer(destinationAddress, cents)
  return transfer === null ? null : generateEip681Uri(transfer)
}
