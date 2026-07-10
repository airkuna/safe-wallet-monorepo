import Safe from '@safe-global/protocol-kit'
import { activateSafeWithSigner, activateSafeWithRelay, InsufficientSignerFundsError } from './activateSafe'
import { createWeb3ReadOnly } from '@/src/services/web3'
import type { PredictedSafeProps } from '@safe-global/protocol-kit'
import type { Chain } from '@safe-global/store/gateway/AUTO_GENERATED/chains'

jest.mock('@safe-global/protocol-kit', () => ({
  __esModule: true,
  default: { init: jest.fn() },
}))

jest.mock('@/src/services/web3', () => ({
  createWeb3ReadOnly: jest.fn(),
  getRpcServiceUrl: jest.fn().mockReturnValue('https://rpc.example.org'),
}))

const mockSendTransaction = jest.fn()
jest.mock('ethers', () => {
  const actual = jest.requireActual('ethers')
  return {
    ...actual,
    Wallet: jest.fn().mockImplementation(() => ({
      address: '0x2222222222222222222222222222222222222222',
      sendTransaction: mockSendTransaction,
    })),
  }
})

const mockSafeInit = Safe.init as jest.MockedFunction<typeof Safe.init>
const mockCreateWeb3ReadOnly = createWeb3ReadOnly as jest.MockedFunction<typeof createWeb3ReadOnly>

const chain = {
  chainId: '1',
  chainName: 'Ethereum',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUri: { authentication: 'NO_AUTHENTICATION', value: 'https://rpc.example.org' },
} as Chain

const props: PredictedSafeProps = {
  safeAccountConfig: { owners: ['0x2222222222222222222222222222222222222222'], threshold: 1 },
  safeDeploymentConfig: { saltNonce: '0', safeVersion: '1.4.1' },
}

const deploymentTx = { to: '0xFactory', value: '0', data: '0xdeadbeef' }

const buildProvider = (overrides: Record<string, unknown> = {}) =>
  ({
    estimateGas: jest.fn().mockResolvedValue(100000n),
    getFeeData: jest.fn().mockResolvedValue({ maxFeePerGas: 10n, gasPrice: null }),
    getBalance: jest.fn().mockResolvedValue(10000000n),
    getCode: jest.fn().mockResolvedValue('0x6080'),
    destroy: jest.fn(),
    ...overrides,
  }) as unknown as ReturnType<typeof createWeb3ReadOnly>

describe('activateSafe', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSafeInit.mockResolvedValue({
      createSafeDeploymentTransaction: jest.fn().mockResolvedValue(deploymentTx),
    } as unknown as Safe)
  })

  describe('activateSafeWithSigner', () => {
    it('broadcasts the deployment tx and resolves with its hash', async () => {
      mockCreateWeb3ReadOnly.mockReturnValue(buildProvider())
      mockSendTransaction.mockResolvedValue({
        hash: '0xhash',
        wait: jest.fn().mockResolvedValue({ status: 1 }),
      })

      const hash = await activateSafeWithSigner(chain, props, '0xkey')

      expect(hash).toBe('0xhash')
      expect(mockSendTransaction).toHaveBeenCalledWith({ to: '0xFactory', data: '0xdeadbeef', value: 0n })
    })

    it('throws InsufficientSignerFundsError with a funding hint before broadcasting', async () => {
      mockCreateWeb3ReadOnly.mockReturnValue(buildProvider({ getBalance: jest.fn().mockResolvedValue(0n) }))

      await expect(activateSafeWithSigner(chain, props, '0xkey')).rejects.toThrow(InsufficientSignerFundsError)
      expect(mockSendTransaction).not.toHaveBeenCalled()
    })

    it('throws when the deployment transaction reverts', async () => {
      mockCreateWeb3ReadOnly.mockReturnValue(buildProvider())
      mockSendTransaction.mockResolvedValue({
        hash: '0xhash',
        wait: jest.fn().mockResolvedValue({ status: 0 }),
      })

      await expect(activateSafeWithSigner(chain, props, '0xkey')).rejects.toThrow('reverted')
    })
  })

  describe('activateSafeWithRelay', () => {
    it('relays the deployment and waits until the safe has code', async () => {
      mockCreateWeb3ReadOnly.mockReturnValue(buildProvider())
      const relayMutation = jest.fn().mockResolvedValue({ taskId: 'task-1' })

      const taskId = await activateSafeWithRelay(chain, props, '0xSafe', relayMutation)

      expect(taskId).toBe('task-1')
      expect(relayMutation).toHaveBeenCalledWith({
        chainId: '1',
        relayDto: { to: '0xFactory', data: '0xdeadbeef', version: '1.4.1' },
      })
    })

    it('throws when the relay returns no task id', async () => {
      const relayMutation = jest.fn().mockResolvedValue({ taskId: '' })

      await expect(activateSafeWithRelay(chain, props, '0xSafe', relayMutation)).rejects.toThrow('could not be relayed')
    })
  })
})
