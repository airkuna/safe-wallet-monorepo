// Same isolation dance as getBrand.test.ts: expo-constants can already be
// pinned by jest setup, so the brand payload is injected per test via
// jest.isolateModules + a fresh mock.
const loadGatewayUrl = (brand: unknown, variant: 'production' | 'development'): string => {
  let gatewayUrl = ''
  jest.isolateModules(() => {
    jest.doMock('expo-constants', () => ({
      __esModule: true,
      default: { expoConfig: { extra: { brand } } },
    }))
    process.env.EXPO_PUBLIC_APP_VARIANT = variant
    gatewayUrl = jest.requireActual<typeof import('./constants')>('./constants').GATEWAY_URL
  })
  return gatewayUrl
}

const originalVariant = process.env.EXPO_PUBLIC_APP_VARIANT

describe('GATEWAY_URL brand override', () => {
  afterEach(() => {
    process.env.EXPO_PUBLIC_APP_VARIANT = originalVariant
    jest.resetModules()
  })

  it('uses the brand gateway in production builds', () => {
    const url = loadGatewayUrl(
      { id: 'x', name: 'X', backend: { cgwBaseUrl: 'https://cgw.brand.example' } },
      'production',
    )
    expect(url).toBe('https://cgw.brand.example')
  })

  it('keeps the staging gateway in development builds despite a brand production gateway', () => {
    const url = loadGatewayUrl(
      { id: 'x', name: 'X', backend: { cgwBaseUrl: 'https://cgw.brand.example' } },
      'development',
    )
    expect(url).toBe('https://safe-client.staging.5afe.dev')
  })

  it('uses the brand staging gateway in development builds when provided', () => {
    const url = loadGatewayUrl(
      {
        id: 'x',
        name: 'X',
        backend: { cgwBaseUrl: 'https://cgw.brand.example', cgwStagingBaseUrl: 'https://cgw-staging.brand.example' },
      },
      'development',
    )
    expect(url).toBe('https://cgw-staging.brand.example')
  })

  it('falls back to the stock gateways without a brand backend', () => {
    expect(loadGatewayUrl(undefined, 'production')).toBe('https://safe-client.safe.global')
    expect(loadGatewayUrl(undefined, 'development')).toBe('https://safe-client.staging.5afe.dev')
  })
})
