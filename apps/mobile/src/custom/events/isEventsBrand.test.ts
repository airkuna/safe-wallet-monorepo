import { isEventsBrand } from './isEventsBrand'
import { getBrand } from '@/src/custom/brand'

jest.mock('@/src/custom/brand', () => ({
  getBrand: jest.fn(),
}))

const mockGetBrand = getBrand as jest.MockedFunction<typeof getBrand>

describe('isEventsBrand', () => {
  it('is true only when the manifest enables features.events', () => {
    mockGetBrand.mockReturnValue({ id: 'domovina', name: 'Domovina', features: { events: true } })
    expect(isEventsBrand()).toBe(true)
  })

  it('is false without the flag, with the flag false, and without features', () => {
    mockGetBrand.mockReturnValue({ id: 'safe', name: 'Safe' })
    expect(isEventsBrand()).toBe(false)

    mockGetBrand.mockReturnValue({ id: 'ff', name: 'FF', features: { ff: true } })
    expect(isEventsBrand()).toBe(false)

    mockGetBrand.mockReturnValue({ id: 'x', name: 'X', features: { events: false } })
    expect(isEventsBrand()).toBe(false)
  })
})
