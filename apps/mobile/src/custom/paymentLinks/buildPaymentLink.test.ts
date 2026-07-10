jest.mock('expo-constants', () => ({ __esModule: true, default: {} }))

// Same isolation dance as getBrand.test.ts: expo-constants can already be pinned by jest setup, so
// each case loads the module inside an isolated registry sharing the mocked Constants instance.
const loadBuildPaymentLink = (expoConfig?: { scheme?: string | string[] }) => {
  let api: typeof import('./buildPaymentLink') | undefined

  jest.isolateModules(() => {
    const constants = jest.requireMock<{ default: { expoConfig?: unknown } }>('expo-constants').default
    constants.expoConfig = expoConfig

    api = jest.requireActual<typeof import('./buildPaymentLink')>('./buildPaymentLink')
  })

  if (!api) {
    throw new Error('isolateModules did not run')
  }

  return api
}

const EIP681_URI = 'ethereum:0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@1?value=1000000000000000000'

describe('buildPaymentLink', () => {
  it('wraps the EIP-681 URI in a pay deep link with percent-encoding', () => {
    const { buildPaymentLink } = loadBuildPaymentLink({ scheme: ['domovina', 'wc'] })

    expect(buildPaymentLink(EIP681_URI)).toBe(`domovina://pay?uri=${encodeURIComponent(EIP681_URI)}`)
  })

  it('falls back to the safe scheme when none is configured', () => {
    const { buildPaymentLink } = loadBuildPaymentLink(undefined)

    expect(buildPaymentLink(EIP681_URI)).toBe(`safe://pay?uri=${encodeURIComponent(EIP681_URI)}`)
  })

  it('round-trips through decodeURIComponent', () => {
    const { buildPaymentLink } = loadBuildPaymentLink({ scheme: ['acme'] })

    const link = buildPaymentLink(EIP681_URI)
    const encoded = link.split('uri=')[1]

    expect(decodeURIComponent(encoded)).toBe(EIP681_URI)
  })
})
