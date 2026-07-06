import type { RuntimeBrand } from './types'

jest.mock('expo-constants', () => ({ __esModule: true, default: {} }))

// `getBrand` can already be evaluated during jest setup (the theme token seam
// imports it), which pins it to the real expo-constants module. Loading it
// inside an isolated registry guarantees the test and the module share the
// same mocked Constants instance.
const loadGetBrand = (expoConfig?: { extra?: { brand?: RuntimeBrand } }) => {
  let api: { getBrand: () => RuntimeBrand; useBrand: () => RuntimeBrand } | undefined

  jest.isolateModules(() => {
    const constants = jest.requireMock<{ default: { expoConfig?: unknown } }>('expo-constants').default
    constants.expoConfig = expoConfig

    api = {
      getBrand: jest.requireActual<typeof import('./getBrand')>('./getBrand').getBrand,
      useBrand: jest.requireActual<typeof import('./useBrand')>('./useBrand').useBrand,
    }
  })

  if (!api) {
    throw new Error('isolateModules did not run')
  }

  return api
}

describe('getBrand', () => {
  it('returns the brand payload from the Expo config', () => {
    const brand: RuntimeBrand = {
      id: 'acme',
      name: 'Acme Wallet',
      theme: { light: { 'primary.main': '#0A84FF' } },
      backend: { cgwBaseUrl: 'https://cgw.example.com', defaultChainId: '100' },
    }

    const { getBrand, useBrand } = loadGetBrand({ extra: { brand } })

    expect(getBrand()).toEqual(brand)
    expect(useBrand()).toEqual(brand)
  })

  it('falls back to the stock Safe identity when no payload is present', () => {
    const { getBrand } = loadGetBrand({ extra: {} })

    expect(getBrand()).toEqual({ id: 'safe', name: 'Safe{Mobile}' })
  })

  it('falls back when the Expo config itself is missing', () => {
    const { getBrand } = loadGetBrand(undefined)

    expect(getBrand()).toEqual({ id: 'safe', name: 'Safe{Mobile}' })
  })
})
