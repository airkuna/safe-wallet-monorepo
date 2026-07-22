import { renderHook } from '@/src/tests/test-utils'
import { FEATURES } from '@safe-global/utils/utils/chains'
import type { Chain } from '@safe-global/store/gateway/AUTO_GENERATED/chains'
import type { RuntimeBrand } from '@/src/custom/brand/types'
import { useHasFeature } from './useHasFeature'

// Theme token generation calls getBrand() at module-eval time (before this
// file's initializers run), so the mock must fall back to the stock brand.
let mockBrand: RuntimeBrand | undefined
jest.mock('@/src/custom/brand', () => ({
  ...jest.requireActual('@/src/custom/brand'),
  getBrand: (): RuntimeBrand => mockBrand ?? { id: 'safe', name: 'Safe{Mobile}' },
}))

let mockChain: Pick<Chain, 'features'> | null = null
jest.mock('@/src/store/chains', () => ({
  selectActiveChain: () => mockChain,
}))

describe('useHasFeature', () => {
  beforeEach(() => {
    mockBrand = undefined
    mockChain = null
  })

  it('resolves from the chain features array for the stock brand', () => {
    mockChain = { features: ['SEND_FLOW'] }
    const { result } = renderHook(() => useHasFeature(FEATURES.SEND_FLOW))
    expect(result.current).toBe(true)
  })

  it('is false when the chain lacks the feature and no brand override exists', () => {
    mockChain = { features: ['RELAYING_MOBILE'] }
    const { result } = renderHook(() => useHasFeature(FEATURES.SEND_FLOW))
    expect(result.current).toBe(false)
  })

  it('is undefined without an active chain for the stock brand', () => {
    const { result } = renderHook(() => useHasFeature(FEATURES.SEND_FLOW))
    expect(result.current).toBeUndefined()
  })

  it('forces SEND_FLOW on when the brand manifest sets features.forceSendFlow', () => {
    mockBrand = { id: 'airkuna', name: 'airKUNA', features: { forceSendFlow: true } }
    mockChain = { features: [] }
    const { result } = renderHook(() => useHasFeature(FEATURES.SEND_FLOW))
    expect(result.current).toBe(true)
  })

  it('does not force other features for a brand with forceSendFlow', () => {
    mockBrand = { id: 'airkuna', name: 'airKUNA', features: { forceSendFlow: true } }
    mockChain = { features: [] }
    const { result } = renderHook(() => useHasFeature(FEATURES.NATIVE_WALLETCONNECT))
    expect(result.current).toBe(false)
  })
})
