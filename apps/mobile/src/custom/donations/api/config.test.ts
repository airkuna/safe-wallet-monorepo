import { getDonationsApiBaseUrl, getDonationsRestBaseUrl, isDonationsBackendConfigured } from './config'

let mockApiBaseUrl: string | undefined
jest.mock('@/src/custom/brand', () => ({
  getBrand: () => ({
    id: 'test',
    name: 'Test',
    donations: mockApiBaseUrl === undefined ? undefined : { apiBaseUrl: mockApiBaseUrl },
  }),
}))

describe('donations api config', () => {
  it('reads the base url from the manifest and strips trailing slashes', () => {
    mockApiBaseUrl = 'https://api.domovina.ai/functions/v1/'
    expect(getDonationsApiBaseUrl()).toBe('https://api.domovina.ai/functions/v1')
    expect(isDonationsBackendConfigured()).toBe(true)
  })

  it('is unconfigured without the manifest field', () => {
    mockApiBaseUrl = undefined
    expect(getDonationsApiBaseUrl()).toBeUndefined()
    expect(getDonationsRestBaseUrl()).toBeUndefined()
    expect(isDonationsBackendConfigured()).toBe(false)
  })

  it('derives the PostgREST base from the edge functions base', () => {
    mockApiBaseUrl = 'https://api.domovina.ai/functions/v1'
    expect(getDonationsRestBaseUrl()).toBe('https://api.domovina.ai/rest/v1')
  })

  it('has no RPC base for a non-standard functions url', () => {
    mockApiBaseUrl = 'https://api.example.com/custom'
    expect(getDonationsRestBaseUrl()).toBeUndefined()
  })
})
