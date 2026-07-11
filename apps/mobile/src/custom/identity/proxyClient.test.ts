import { getBrand } from '@/src/custom/brand'
import type { RuntimeBrand } from '@/src/custom/brand'
import { checkAvailability, registerUsername, fetchNamesForAddress } from './proxyClient'

jest.mock('@/src/custom/brand', () => ({ getBrand: jest.fn() }))

const mockGetBrand = getBrand as jest.MockedFunction<typeof getBrand>

const enabledBrand: RuntimeBrand = {
  id: 'kuna',
  name: 'Kuna Wallet',
  identity: { parentDomain: 'kuna.eth', registrationProxyUrl: 'https://id.example.org' },
}

const ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

const spyOnFetch = () => jest.spyOn(global, 'fetch')

describe('proxyClient', () => {
  let fetchSpy: ReturnType<typeof spyOnFetch>

  beforeEach(() => {
    mockGetBrand.mockReturnValue(enabledBrand)
    fetchSpy = spyOnFetch()
  })

  afterEach(() => {
    fetchSpy.mockRestore()
  })

  describe('checkAvailability', () => {
    it('returns available from the proxy and hits the availability endpoint', async () => {
      fetchSpy.mockResolvedValue(jsonResponse({ status: 'available' }))

      await expect(checkAvailability('@Ana')).resolves.toBe('available')

      expect(fetchSpy).toHaveBeenCalledTimes(1)
      expect(fetchSpy.mock.calls[0][0]).toBe('https://id.example.org/api/availability?name=ana')
    })

    it('returns taken when the proxy reports the name as taken', async () => {
      fetchSpy.mockResolvedValue(jsonResponse({ status: 'taken' }))

      await expect(checkAvailability('ana')).resolves.toBe('taken')
    })

    it('short-circuits reserved names locally without a network call', async () => {
      await expect(checkAvailability('admin')).resolves.toBe('reserved')
      expect(fetchSpy).not.toHaveBeenCalled()
    })

    it('returns invalid for malformed input without a network call', async () => {
      await expect(checkAvailability('ab')).resolves.toBe('invalid')
      await expect(checkAvailability('an_a')).resolves.toBe('invalid')
      expect(fetchSpy).not.toHaveBeenCalled()
    })

    it('returns invalid when the proxy itself judges the name invalid', async () => {
      fetchSpy.mockResolvedValue(jsonResponse({ status: 'invalid' }))

      await expect(checkAvailability('ana')).resolves.toBe('invalid')
    })

    it('returns unavailable-service on a network error', async () => {
      fetchSpy.mockRejectedValue(new Error('network down'))

      await expect(checkAvailability('ana')).resolves.toBe('unavailable-service')
    })

    it('returns unavailable-service on a non-OK response', async () => {
      fetchSpy.mockResolvedValue(jsonResponse({ error: 'boom' }, 500))

      await expect(checkAvailability('ana')).resolves.toBe('unavailable-service')
    })

    it('returns unavailable-service on an unrecognized body', async () => {
      fetchSpy.mockResolvedValue(jsonResponse({ status: 'weird' }))

      await expect(checkAvailability('ana')).resolves.toBe('unavailable-service')
    })

    it('strips a trailing slash from the proxy base URL', async () => {
      mockGetBrand.mockReturnValue({
        ...enabledBrand,
        identity: { parentDomain: 'kuna.eth', registrationProxyUrl: 'https://id.example.org/' },
      })
      fetchSpy.mockResolvedValue(jsonResponse({ status: 'available' }))

      await checkAvailability('ana')

      expect(fetchSpy.mock.calls[0][0]).toBe('https://id.example.org/api/availability?name=ana')
    })
  })

  describe('registerUsername', () => {
    it('registers the normalized name and resolves with the proxy ensName', async () => {
      fetchSpy.mockResolvedValue(jsonResponse({ ensName: 'ana.kuna.eth' }, 201))

      await expect(registerUsername('@Ana', ADDRESS)).resolves.toEqual({ ensName: 'ana.kuna.eth' })

      expect(fetchSpy.mock.calls[0][0]).toBe('https://id.example.org/api/register')
      const init = fetchSpy.mock.calls[0][1]
      expect(init?.method).toBe('POST')
      expect(JSON.parse(String(init?.body))).toEqual({ name: 'ana', address: ADDRESS })
    })

    it('falls back to the locally derived ensName when the proxy omits it', async () => {
      fetchSpy.mockResolvedValue(jsonResponse({}, 201))

      await expect(registerUsername('ana', ADDRESS)).resolves.toEqual({ ensName: 'ana.kuna.eth' })
    })

    it('throws a taken error on 409', async () => {
      fetchSpy.mockResolvedValue(jsonResponse({ error: 'taken' }, 409))

      await expect(registerUsername('ana', ADDRESS)).rejects.toThrow('Username is already taken')
    })

    it('throws on other non-OK statuses', async () => {
      fetchSpy.mockResolvedValue(jsonResponse({ error: 'boom' }, 500))

      await expect(registerUsername('ana', ADDRESS)).rejects.toThrow('Registration failed (500)')
    })

    it('throws for an invalid username without a network call', async () => {
      await expect(registerUsername('ab', ADDRESS)).rejects.toThrow('Invalid username')
      expect(fetchSpy).not.toHaveBeenCalled()
    })

    it('throws for a reserved username without a network call', async () => {
      await expect(registerUsername('admin', ADDRESS)).rejects.toThrow('Invalid username')
      expect(fetchSpy).not.toHaveBeenCalled()
    })

    it('throws for an invalid address without a network call', async () => {
      await expect(registerUsername('ana', '0xnot-an-address')).rejects.toThrow('Invalid address')
      expect(fetchSpy).not.toHaveBeenCalled()
    })
  })

  describe('fetchNamesForAddress', () => {
    it('returns the names reported by the proxy', async () => {
      fetchSpy.mockResolvedValue(jsonResponse({ names: ['ana', 'ana-backup'] }))

      await expect(fetchNamesForAddress(ADDRESS)).resolves.toEqual(['ana', 'ana-backup'])

      expect(fetchSpy.mock.calls[0][0]).toBe(`https://id.example.org/api/names?address=${ADDRESS}`)
    })

    it('returns an empty list when the body has no names', async () => {
      fetchSpy.mockResolvedValue(jsonResponse({}))

      await expect(fetchNamesForAddress(ADDRESS)).resolves.toEqual([])
    })

    it('returns an empty list for an invalid address without a network call', async () => {
      await expect(fetchNamesForAddress('0x123')).resolves.toEqual([])
      expect(fetchSpy).not.toHaveBeenCalled()
    })

    it('returns an empty list on a non-OK response', async () => {
      fetchSpy.mockResolvedValue(jsonResponse({ error: 'boom' }, 500))

      await expect(fetchNamesForAddress(ADDRESS)).resolves.toEqual([])
    })
  })
})
