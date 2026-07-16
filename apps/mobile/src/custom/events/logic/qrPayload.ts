/**
 * QR payload ulaznice: `dgdj1:<token>` gdje je token opaque 64-hex string
 * (backend čuva samo sha256 hash — Tier 0 iz receipts plana).
 *
 * Tvrdo pravilo (ff faza-10 / etapa 10b): ticket QR NIKAD ne ide kroz
 * `resolveScannedAddress` (payment choke-point Send flowa). Prefiks `dgdj1:`
 * garantira međusobno odbijanje formata: payment parser vraća `null` za
 * `dgdj1:` payloade (nije adresa ni EIP-681 URI), a ovaj parser vraća `null`
 * za sve što nema točan prefiks + 64-hex token — adrese, EIP-681, junk.
 */

export const TICKET_QR_PREFIX = 'dgdj1:'

const TOKEN_RE = /^[0-9a-f]{64}$/

/** Sastavlja QR payload iz opaque tokena; `null` za neispravan token. */
export const buildTicketQrPayload = (qrToken: string): string | null =>
  TOKEN_RE.test(qrToken) ? `${TICKET_QR_PREFIX}${qrToken}` : null

/**
 * Parsira skenirani QR: vraća goli token ili `null` za sve što nije točan
 * `dgdj1:<64-hex>` format (payment QR-ovi, adrese, junk — glasno odbijeno).
 */
export const parseTicketQrPayload = (raw: string): string | null => {
  const trimmed = raw.trim()
  if (!trimmed.toLowerCase().startsWith(TICKET_QR_PREFIX)) {
    return null
  }
  const token = trimmed.slice(TICKET_QR_PREFIX.length).toLowerCase()
  return TOKEN_RE.test(token) ? token : null
}
