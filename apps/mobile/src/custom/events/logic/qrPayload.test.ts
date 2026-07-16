import { resolveScannedAddress } from '@/src/components/Camera/scannedAddress'
import { buildTicketQrPayload, parseTicketQrPayload, TICKET_QR_PREFIX } from './qrPayload'

const TOKEN = 'ab'.repeat(32)

describe('qrPayload', () => {
  it('round-trips build → parse', () => {
    const payload = buildTicketQrPayload(TOKEN)
    expect(payload).toBe(`${TICKET_QR_PREFIX}${TOKEN}`)
    expect(parseTicketQrPayload(payload as string)).toBe(TOKEN)
  })

  it('build rejects malformed tokens', () => {
    expect(buildTicketQrPayload('')).toBeNull()
    expect(buildTicketQrPayload('abc')).toBeNull()
    expect(buildTicketQrPayload('zz'.repeat(32))).toBeNull()
    expect(buildTicketQrPayload(`${TOKEN}00`)).toBeNull()
  })

  it('parse tolerates whitespace and uppercase token, normalises to lowercase', () => {
    expect(parseTicketQrPayload(`  ${TICKET_QR_PREFIX}${TOKEN.toUpperCase()}  `)).toBe(TOKEN)
  })

  it('parse rejects payment formats and junk', () => {
    expect(parseTicketQrPayload('0x1111111111111111111111111111111111111111')).toBeNull()
    expect(parseTicketQrPayload('gno:0x1111111111111111111111111111111111111111')).toBeNull()
    expect(
      parseTicketQrPayload('ethereum:0x420CA0f9B9b604cE0fd9C18EF134C705e5Fa3430@100/transfer?address=0x1&uint256=1'),
    ).toBeNull()
    expect(parseTicketQrPayload('wc:abc@2?relay-protocol=irn')).toBeNull()
    expect(parseTicketQrPayload('')).toBeNull()
    expect(parseTicketQrPayload(TOKEN)).toBeNull() // goli token bez prefiksa nije valjan QR
    expect(parseTicketQrPayload(`${TICKET_QR_PREFIX}junk`)).toBeNull()
    expect(parseTicketQrPayload(`dgdj2:${TOKEN}`)).toBeNull()
  })

  // Tvrdo pravilo (ff faza-10 etapa 10b): ticket QR ne smije završiti u Send
  // flowu. resolveScannedAddress je jedini ulaz payment skenera — dokaz da
  // dgdj1 payload tamo pada na null znači da nikad ne stiže do Send prefilla.
  it('payment scanner (resolveScannedAddress) rejects ticket QR payloads', () => {
    const payload = buildTicketQrPayload(TOKEN) as string
    expect(resolveScannedAddress(payload)).toBeNull()
  })
})
