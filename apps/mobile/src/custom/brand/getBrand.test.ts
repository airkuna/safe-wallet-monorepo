import Constants from 'expo-constants'
import { getBrand } from './getBrand'
import { useBrand } from './useBrand'
import type { RuntimeBrand } from './types'

jest.mock('expo-constants', () => ({ __esModule: true, default: {} }))

// The mock above replaces the module with a plain mutable object.
const mockedConstants = Constants as unknown as { expoConfig?: { extra?: { brand?: RuntimeBrand } } }

describe('getBrand', () => {
  afterEach(() => {
    delete mockedConstants.expoConfig
  })

  it('returns the brand payload from the Expo config', () => {
    const brand: RuntimeBrand = {
      id: 'acme',
      name: 'Acme Wallet',
      theme: { light: { 'primary.main': '#0A84FF' } },
      backend: { cgwBaseUrl: 'https://cgw.example.com' },
    }
    mockedConstants.expoConfig = { extra: { brand } }

    expect(getBrand()).toEqual(brand)
    expect(useBrand()).toEqual(brand)
  })

  it('falls back to the stock Safe identity when no payload is present', () => {
    mockedConstants.expoConfig = { extra: {} }

    expect(getBrand()).toEqual({ id: 'safe', name: 'Safe{Mobile}' })
  })

  it('falls back when the Expo config itself is missing', () => {
    expect(getBrand()).toEqual({ id: 'safe', name: 'Safe{Mobile}' })
  })
})
