jest.mock('expo-constants', () => ({ __esModule: true, default: {} }))

// Same isolation dance as getBrand.test.ts: expo-constants can already be pinned by jest setup, so
// each case loads the module inside an isolated registry sharing the mocked Constants instance.
const loadGetPrimaryScheme = (expoConfig?: { scheme?: string | string[] }) => {
  let api: typeof import('./getPrimaryScheme') | undefined

  jest.isolateModules(() => {
    const constants = jest.requireMock<{ default: { expoConfig?: unknown } }>('expo-constants').default
    constants.expoConfig = expoConfig

    api = jest.requireActual<typeof import('./getPrimaryScheme')>('./getPrimaryScheme')
  })

  if (!api) {
    throw new Error('isolateModules did not run')
  }

  return api
}

describe('getPrimaryScheme', () => {
  it('prefers a brand scheme over wc', () => {
    const { getPrimaryScheme } = loadGetPrimaryScheme({ scheme: ['wc', 'domovina'] })

    expect(getPrimaryScheme()).toBe('domovina')
  })

  it('falls back to wc when it is the only registered scheme', () => {
    const { getPrimaryScheme } = loadGetPrimaryScheme({ scheme: ['wc'] })

    expect(getPrimaryScheme()).toBe('wc')
  })

  it('accepts a plain string scheme', () => {
    const { getPrimaryScheme } = loadGetPrimaryScheme({ scheme: 'acme' })

    expect(getPrimaryScheme()).toBe('acme')
  })

  it('falls back to safe when no scheme is configured (tests, Storybook)', () => {
    expect(loadGetPrimaryScheme({}).getPrimaryScheme()).toBe('safe')
    expect(loadGetPrimaryScheme(undefined).getPrimaryScheme()).toBe('safe')
  })
})
