import { getRelayCopy } from './relayCopy'
import { getBrand } from '@/src/custom/brand'
import { zfStrings } from './strings'

jest.mock('@/src/custom/brand', () => ({
  getBrand: jest.fn(),
}))

const mockGetBrand = getBrand as jest.MockedFunction<typeof getBrand>

describe('getRelayCopy', () => {
  it('returns the HR relay copy for donations brands', () => {
    mockGetBrand.mockReturnValue({ id: 'airkuna', name: 'airKUNA', features: { donations: true } })
    const copy = getRelayCopy()
    expect(copy).toBe(zfStrings.relay)
    expect(copy?.title).toBe('Bez naknade')
    expect(copy?.remainingToday(3)).toBe('još 3 danas')
  })

  it('never claims a percentage in the unavailable fallback', () => {
    mockGetBrand.mockReturnValue({ id: 'airkuna', name: 'airKUNA', features: { donations: true } })
    expect(getRelayCopy()?.unavailable).not.toMatch(/%/)
  })

  it('returns null on the stock safe brand so upstream copy stays untouched', () => {
    mockGetBrand.mockReturnValue({ id: 'safe', name: 'Safe{Mobile}' })
    expect(getRelayCopy()).toBeNull()
  })
})
