import { parseDonationLink, resolveDonationScan } from './donationLink'
import { resolveScannedAddress } from '@/src/components/Camera/scannedAddress'

let mockDonations = true
jest.mock('@/src/custom/brand', () => ({
  getBrand: () => ({
    id: 'test',
    name: 'Test',
    features: { donations: mockDonations },
  }),
}))

describe('parseDonationLink', () => {
  it('extracts the slug from the canonical donation URL', () => {
    expect(parseDonationLink('https://domovina.ai/c/moj-kanal/doniraj')).toBe('moj-kanal')
  })

  it('tolerates missing scheme, www, /support and extra segments/query', () => {
    expect(parseDonationLink('domovina.ai/c/moj-kanal/doniraj')).toBe('moj-kanal')
    expect(parseDonationLink('https://www.domovina.ai/c/moj-kanal/support')).toBe('moj-kanal')
    expect(parseDonationLink('https://domovina.ai/c/moj-kanal')).toBe('moj-kanal')
    expect(parseDonationLink('https://domovina.ai/c/moj-kanal/doniraj?uc=UC123#zid')).toBe('moj-kanal')
    expect(parseDonationLink('  https://domovina.ai/c/moj-kanal/doniraj  ')).toBe('moj-kanal')
  })

  it('URL-decodes the slug', () => {
    expect(parseDonationLink('https://domovina.ai/c/moj%20kanal/doniraj')).toBe('moj kanal')
  })

  it('rejects other hosts, other routes and junk', () => {
    expect(parseDonationLink('https://example.com/c/moj-kanal/doniraj')).toBeNull()
    expect(parseDonationLink('https://zla-domovina.ai/c/x/doniraj')).toBeNull()
    expect(parseDonationLink('https://domovina.ai/p/osoba')).toBeNull()
    expect(parseDonationLink('https://domovina.ai/c//doniraj')).toBeNull()
    expect(parseDonationLink('ethereum:0x1111111111111111111111111111111111111111')).toBeNull()
    expect(parseDonationLink('moj-kanal')).toBeNull()
    expect(parseDonationLink('')).toBeNull()
  })

  it('is not interpretable by the payment scanner choke-point', () => {
    // Donacijski URL u payment skeneru ne smije rezultirati adresom — njime se
    // bavi donacijski šav, ne resolveScannedAddress (isti invariant kao events).
    expect(resolveScannedAddress('https://domovina.ai/c/moj-kanal/doniraj')).toBeNull()
  })
})

describe('resolveDonationScan', () => {
  it('resolves the slug only for donations brands', () => {
    mockDonations = true
    expect(resolveDonationScan('https://domovina.ai/c/moj-kanal/doniraj')).toBe('moj-kanal')

    mockDonations = false
    expect(resolveDonationScan('https://domovina.ai/c/moj-kanal/doniraj')).toBeNull()
  })

  it('returns null for non-donation content regardless of brand', () => {
    mockDonations = true
    expect(resolveDonationScan('0x1111111111111111111111111111111111111111')).toBeNull()
  })
})
