import { isZeroFeeBrand } from './isZeroFeeBrand'
import { getBrand } from '@/src/custom/brand'

jest.mock('@/src/custom/brand', () => ({
  getBrand: jest.fn(),
}))

const mockGetBrand = getBrand as jest.MockedFunction<typeof getBrand>

describe('isZeroFeeBrand', () => {
  it('is true only when the manifest enables features.donations', () => {
    mockGetBrand.mockReturnValue({ id: 'airkuna', name: 'airKUNA', features: { donations: true } })
    expect(isZeroFeeBrand()).toBe(true)
  })

  it('is false without the flag, with the flag false, and without features', () => {
    mockGetBrand.mockReturnValue({ id: 'safe', name: 'Safe{Mobile}' })
    expect(isZeroFeeBrand()).toBe(false)

    mockGetBrand.mockReturnValue({ id: 'ff', name: 'FF', features: { ff: true } })
    expect(isZeroFeeBrand()).toBe(false)

    mockGetBrand.mockReturnValue({ id: 'x', name: 'X', features: { donations: false } })
    expect(isZeroFeeBrand()).toBe(false)
  })
})
