import { isBrandForcedFeature } from './forcedFeatures'
import { FEATURES } from '@safe-global/utils/utils/chains'
import type { RuntimeBrand } from '@/src/custom/brand/types'

let mockBrand: RuntimeBrand = { id: 'safe', name: 'Safe{Mobile}' }
jest.mock('@/src/custom/brand', () => ({
  getBrand: () => mockBrand,
}))

describe('isBrandForcedFeature', () => {
  it('forces SEND_FLOW only when the manifest sets features.forceSendFlow', () => {
    mockBrand = { id: 'airkuna', name: 'airKUNA', features: { donations: true, forceSendFlow: true } }
    expect(isBrandForcedFeature(FEATURES.SEND_FLOW)).toBe(true)
  })

  it('does not force other features even when forceSendFlow is on', () => {
    mockBrand = { id: 'airkuna', name: 'airKUNA', features: { forceSendFlow: true } }
    expect(isBrandForcedFeature(FEATURES.NATIVE_WALLETCONNECT)).toBe(false)
    expect(isBrandForcedFeature(FEATURES.RELAYING)).toBe(false)
  })

  it('is false for the stock brand without features', () => {
    mockBrand = { id: 'safe', name: 'Safe{Mobile}' }
    expect(isBrandForcedFeature(FEATURES.SEND_FLOW)).toBe(false)
  })

  it('is false when the flag is explicitly off or only other packs are on', () => {
    mockBrand = { id: 'domovina', name: 'DOMOVINA', features: { forceSendFlow: false, events: true } }
    expect(isBrandForcedFeature(FEATURES.SEND_FLOW)).toBe(false)
  })
})
