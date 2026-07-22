import {
  DONATION_CURRENCY,
  buildDonationEip681Uri,
  buildDonationTransfer,
  centsToWei,
  eurAmountToCents,
  formatCents,
} from './donationAmount'

const DESTINATION = '0x1111111111111111111111111111111111111111'

describe('centsToWei', () => {
  it('multiplies cents by 1e16 as BigInt', () => {
    expect(centsToWei(1)).toBe('10000000000000000')
    expect(centsToWei(2500)).toBe('25000000000000000000')
  })

  it('handles large amounts without float precision loss', () => {
    // 10.000.000,00 EUR = 1e9 centi → 1e25 wei (izvan Number.MAX_SAFE_INTEGER domene za wei)
    expect(centsToWei(1_000_000_000)).toBe('10000000000000000000000000')
  })

  it('rejects zero, negatives and non-integers', () => {
    expect(centsToWei(0)).toBeNull()
    expect(centsToWei(-5)).toBeNull()
    expect(centsToWei(10.5)).toBeNull()
  })
})

describe('eurAmountToCents', () => {
  it('parses whole and decimal amounts with dot or comma', () => {
    expect(eurAmountToCents('10')).toBe(1000)
    expect(eurAmountToCents('10.50')).toBe(1050)
    expect(eurAmountToCents('10,5')).toBe(1050)
    expect(eurAmountToCents(' 0.01 ')).toBe(1)
  })

  it('rejects zero, negatives, three decimals and junk', () => {
    expect(eurAmountToCents('0')).toBeNull()
    expect(eurAmountToCents('0,00')).toBeNull()
    expect(eurAmountToCents('-5')).toBeNull()
    expect(eurAmountToCents('1.005')).toBeNull()
    expect(eurAmountToCents('deset')).toBeNull()
    expect(eurAmountToCents('')).toBeNull()
  })
})

describe('formatCents', () => {
  it('renders the Croatian display format', () => {
    expect(formatCents(1)).toBe('0,01')
    expect(formatCents(1050)).toBe('10,50')
    expect(formatCents(126490)).toBe('1.264,90')
  })
})

describe('buildDonationTransfer', () => {
  it('targets EURe on Gnosis with the wei amount', () => {
    expect(buildDonationTransfer(DESTINATION, 2500)).toEqual({
      recipient: DESTINATION,
      chainId: '100',
      tokenAddress: DONATION_CURRENCY.tokenAddress,
      value: '25000000000000000000',
    })
  })

  it('returns null for an invalid amount', () => {
    expect(buildDonationTransfer(DESTINATION, 0)).toBeNull()
  })
})

describe('buildDonationEip681Uri', () => {
  it('matches the QR format from the donation page ([15] §5)', () => {
    expect(buildDonationEip681Uri(DESTINATION, 2500)).toBe(
      `ethereum:${DONATION_CURRENCY.tokenAddress}@100/transfer?address=${DESTINATION}&uint256=25000000000000000000`,
    )
  })

  it('returns null for an invalid amount', () => {
    expect(buildDonationEip681Uri(DESTINATION, -1)).toBeNull()
  })
})
