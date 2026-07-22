import { isDonationsBrand } from './isDonationsBrand'
import type { RuntimeBrand } from '@/src/custom/brand/types'

let mockBrand: RuntimeBrand = { id: 'safe', name: 'Safe{Mobile}' }
jest.mock('@/src/custom/brand', () => ({
  getBrand: () => mockBrand,
}))

describe('isDonationsBrand', () => {
  it('is true only when the manifest sets features.donations', () => {
    mockBrand = { id: 'airkuna', name: 'airKUNA', features: { donations: true } }
    expect(isDonationsBrand()).toBe(true)
  })

  it('is false for the stock brand without features', () => {
    mockBrand = { id: 'safe', name: 'Safe{Mobile}' }
    expect(isDonationsBrand()).toBe(false)
  })

  it('is false when the flag is explicitly off or another pack is on', () => {
    mockBrand = { id: 'domovina', name: 'DOMOVINA', features: { donations: false, events: true } }
    expect(isDonationsBrand()).toBe(false)
  })
})
