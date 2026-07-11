import { getBrand } from '@/src/custom/brand'
import type { RuntimeBrand } from '@/src/custom/brand'
import { fetchNamesForAddress } from './proxyClient'
import { reverseLookup, clearReverseLookupCache } from './reverse'

jest.mock('@/src/custom/brand', () => ({ getBrand: jest.fn() }))

jest.mock('./proxyClient', () => ({
  fetchNamesForAddress: jest.fn(),
}))

const mockGetBrand = getBrand as jest.MockedFunction<typeof getBrand>
const mockFetchNames = fetchNamesForAddress as jest.MockedFunction<typeof fetchNamesForAddress>

const enabledBrand: RuntimeBrand = {
  id: 'kuna',
  name: 'Kuna Wallet',
  identity: { parentDomain: 'kuna.eth', registrationProxyUrl: 'https://id.example.org' },
}

const disabledBrand: RuntimeBrand = { id: 'safe', name: 'Safe{Mobile}' }

const ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'

const TTL_MS = 10 * 60 * 1000

describe('reverseLookup', () => {
  beforeEach(() => {
    clearReverseLookupCache()
    mockGetBrand.mockReturnValue(enabledBrand)
  })

  it('returns null without fetching when identity is disabled', async () => {
    mockGetBrand.mockReturnValue(disabledBrand)

    await expect(reverseLookup(ADDRESS)).resolves.toBeNull()
    expect(mockFetchNames).not.toHaveBeenCalled()
  })

  it('fetches once and serves the second call from the cache', async () => {
    mockFetchNames.mockResolvedValue(['ana'])

    await expect(reverseLookup(ADDRESS)).resolves.toBe('ana')
    await expect(reverseLookup(ADDRESS)).resolves.toBe('ana')

    expect(mockFetchNames).toHaveBeenCalledTimes(1)
  })

  it('normalizes the cache key so address casing does not cause extra fetches', async () => {
    mockFetchNames.mockResolvedValue(['ana'])

    await reverseLookup(ADDRESS)
    await expect(reverseLookup(ADDRESS.toLowerCase())).resolves.toBe('ana')

    expect(mockFetchNames).toHaveBeenCalledTimes(1)
  })

  it('caches a null result for addresses without names', async () => {
    mockFetchNames.mockResolvedValue([])

    await expect(reverseLookup(ADDRESS)).resolves.toBeNull()
    await expect(reverseLookup(ADDRESS)).resolves.toBeNull()

    expect(mockFetchNames).toHaveBeenCalledTimes(1)
  })

  it('refetches after the TTL expires', async () => {
    mockFetchNames.mockResolvedValueOnce(['ana']).mockResolvedValueOnce(['ana-new'])

    await expect(reverseLookup(ADDRESS)).resolves.toBe('ana')

    jest.advanceTimersByTime(TTL_MS + 1)

    await expect(reverseLookup(ADDRESS)).resolves.toBe('ana-new')
    expect(mockFetchNames).toHaveBeenCalledTimes(2)
  })

  it('falls back to the stale cached name when the refresh fails', async () => {
    mockFetchNames.mockResolvedValueOnce(['ana']).mockRejectedValueOnce(new Error('network down'))

    await expect(reverseLookup(ADDRESS)).resolves.toBe('ana')

    jest.advanceTimersByTime(TTL_MS + 1)

    await expect(reverseLookup(ADDRESS)).resolves.toBe('ana')
    expect(mockFetchNames).toHaveBeenCalledTimes(2)
  })

  it('returns null when the fetch fails and nothing is cached', async () => {
    mockFetchNames.mockRejectedValue(new Error('network down'))

    await expect(reverseLookup(ADDRESS)).resolves.toBeNull()
  })
})
