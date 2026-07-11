import type { Chain } from '@safe-global/store/gateway/AUTO_GENERATED/chains'
import { getBrand } from '@/src/custom/brand'
import type { RuntimeBrand } from '@/src/custom/brand'
import { createWeb3ReadOnly } from '@/src/services/web3'
import { resolveUsername } from './resolve'

jest.mock('@/src/custom/brand', () => ({ getBrand: jest.fn() }))

jest.mock('@/src/services/web3', () => ({
  createWeb3ReadOnly: jest.fn(),
}))

const mockGetBrand = getBrand as jest.MockedFunction<typeof getBrand>
const mockCreateWeb3ReadOnly = createWeb3ReadOnly as jest.MockedFunction<typeof createWeb3ReadOnly>

const enabledBrand: RuntimeBrand = {
  id: 'kuna',
  name: 'Kuna Wallet',
  identity: { parentDomain: 'kuna.eth', registrationProxyUrl: 'https://id.example.org' },
}

const disabledBrand: RuntimeBrand = { id: 'safe', name: 'Safe{Mobile}' }

const chain = {
  chainId: '1',
  chainName: 'Ethereum',
  rpcUri: { authentication: 'NO_AUTHENTICATION', value: 'https://rpc.example.org' },
} as Chain

const LOWERCASE_ADDRESS = '0xd8da6bf26964af9d7eed9e03e53415d37aa96045'
const CHECKSUMMED_ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'

const buildProvider = (resolveName: jest.Mock) => ({ resolveName }) as unknown as ReturnType<typeof createWeb3ReadOnly>

describe('resolveUsername', () => {
  beforeEach(() => {
    mockGetBrand.mockReturnValue(enabledBrand)
  })

  it('resolves an @-handle through provider.resolveName and returns a checksummed address', async () => {
    const resolveName = jest.fn().mockResolvedValue(LOWERCASE_ADDRESS)
    mockCreateWeb3ReadOnly.mockReturnValue(buildProvider(resolveName))

    const result = await resolveUsername('@Ana', chain)

    expect(mockCreateWeb3ReadOnly).toHaveBeenCalledWith(chain)
    expect(resolveName).toHaveBeenCalledWith('ana.kuna.eth')
    expect(result).toEqual({
      address: CHECKSUMMED_ADDRESS,
      ensName: 'ana.kuna.eth',
      username: 'ana',
    })
  })

  it('resolves a full name under the parent domain', async () => {
    const resolveName = jest.fn().mockResolvedValue(CHECKSUMMED_ADDRESS)
    mockCreateWeb3ReadOnly.mockReturnValue(buildProvider(resolveName))

    const result = await resolveUsername('ana.kuna.eth', chain)

    expect(resolveName).toHaveBeenCalledWith('ana.kuna.eth')
    expect(result?.address).toBe(CHECKSUMMED_ADDRESS)
  })

  it('returns null when the name does not resolve', async () => {
    const resolveName = jest.fn().mockResolvedValue(null)
    mockCreateWeb3ReadOnly.mockReturnValue(buildProvider(resolveName))

    await expect(resolveUsername('@unknown', chain)).resolves.toBeNull()
  })

  it('returns null for non-username input without touching the provider', async () => {
    await expect(resolveUsername(CHECKSUMMED_ADDRESS, chain)).resolves.toBeNull()
    expect(mockCreateWeb3ReadOnly).not.toHaveBeenCalled()
  })

  it('returns null for a username-like input that fails normalization', async () => {
    await expect(resolveUsername('@a!', chain)).resolves.toBeNull()
    expect(mockCreateWeb3ReadOnly).not.toHaveBeenCalled()
  })

  it('returns null when the resolver chain is missing', async () => {
    await expect(resolveUsername('@ana', undefined)).resolves.toBeNull()
    expect(mockCreateWeb3ReadOnly).not.toHaveBeenCalled()
  })

  it('returns null when identity is not configured', async () => {
    mockGetBrand.mockReturnValue(disabledBrand)

    await expect(resolveUsername('@ana', chain)).resolves.toBeNull()
    expect(mockCreateWeb3ReadOnly).not.toHaveBeenCalled()
  })

  it('returns null when no provider can be created', async () => {
    mockCreateWeb3ReadOnly.mockReturnValue(undefined)

    await expect(resolveUsername('@ana', chain)).resolves.toBeNull()
  })
})
