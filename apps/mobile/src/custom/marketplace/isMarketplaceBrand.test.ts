import { isMarketplaceBrand } from './isMarketplaceBrand'
import { getBrand } from '@/src/custom/brand'

jest.mock('@/src/custom/brand', () => ({
  getBrand: jest.fn(),
}))

const mockGetBrand = getBrand as jest.MockedFunction<typeof getBrand>

describe('isMarketplaceBrand', () => {
  it('is true only when the manifest enables features.marketplace', () => {
    mockGetBrand.mockReturnValue({ id: 'domovina', name: 'Domovina', features: { marketplace: true } })
    expect(isMarketplaceBrand()).toBe(true)
  })

  it('is false without the flag, with the flag false, and without features', () => {
    mockGetBrand.mockReturnValue({ id: 'safe', name: 'Safe' })
    expect(isMarketplaceBrand()).toBe(false)

    mockGetBrand.mockReturnValue({ id: 'ff', name: 'FF', features: { ff: true } })
    expect(isMarketplaceBrand()).toBe(false)

    mockGetBrand.mockReturnValue({ id: 'x', name: 'X', features: { marketplace: false } })
    expect(isMarketplaceBrand()).toBe(false)
  })
})
