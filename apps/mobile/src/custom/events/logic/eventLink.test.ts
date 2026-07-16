import { buildEventLink } from './eventLink'
import { resolveScannedAddress } from '@/src/components/Camera/scannedAddress'

jest.mock('@/src/custom/brand', () => ({
  getPrimaryScheme: () => 'domovina',
}))

describe('buildEventLink', () => {
  it('builds a deep link to the in-app event route', () => {
    expect(buildEventLink('money-motion-2027')).toBe('domovina://events/event?event=money-motion-2027')
  })

  it('URL-encodes the slug', () => {
    expect(buildEventLink('a b/č')).toBe('domovina://events/event?event=a%20b%2F%C4%8D')
  })

  it('is not interpretable by the payment scanner choke-point', () => {
    // Event link u payment skeneru ne smije rezultirati adresom (E3 invariant).
    expect(resolveScannedAddress(buildEventLink('money-motion-2027'))).toBeNull()
  })
})
