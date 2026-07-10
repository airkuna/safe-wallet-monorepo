jest.mock('expo-constants', () => ({ __esModule: true, default: {} }))

// Same isolation dance as getBrand.test.ts: the brand payload and scheme are
// baked into expo-constants, so each case loads the module in isolation.
const loadMetadata = (expoConfig?: { scheme?: string | string[]; extra?: { brand?: unknown } }) => {
  let api: typeof import('./metadata') | undefined

  jest.isolateModules(() => {
    const constants = jest.requireMock<{ default: { expoConfig?: unknown } }>('expo-constants').default
    constants.expoConfig = expoConfig

    api = jest.requireActual<typeof import('./metadata')>('./metadata')
  })

  if (!api) {
    throw new Error('isolateModules did not run')
  }

  return api
}

describe('SAFE_WALLET_METADATA', () => {
  it('resolves to the exact upstream values for the stock safe brand', () => {
    const { SAFE_WALLET_METADATA } = loadMetadata({ scheme: ['safe', 'wc'] })

    expect(SAFE_WALLET_METADATA.name).toBe('Safe{Mobile}')
    expect(SAFE_WALLET_METADATA.redirect).toEqual({
      native: 'safe://',
      universal: 'https://app.safe.global',
    })
  })

  it('advertises the brand name and scheme for a brand build', () => {
    const { SAFE_WALLET_METADATA } = loadMetadata({
      scheme: ['domovina', 'wc'],
      extra: { brand: { id: 'domovina', name: 'Domovina Wallet' } },
    })

    expect(SAFE_WALLET_METADATA.name).toBe('Domovina Wallet')
    expect(SAFE_WALLET_METADATA.redirect?.native).toBe('domovina://')
    expect(SAFE_WALLET_METADATA.redirect?.universal).toBeUndefined()
  })
})
