import { getBrand } from '@/src/custom/brand'
import type { RuntimeBrand } from '@/src/custom/brand'
import { isUsernameLike, normalizeUsername, isReservedUsername, toFullEnsName } from './username'

jest.mock('@/src/custom/brand', () => ({ getBrand: jest.fn() }))

const mockGetBrand = getBrand as jest.MockedFunction<typeof getBrand>

const enabledBrand: RuntimeBrand = {
  id: 'kuna',
  name: 'Kuna Wallet',
  identity: { parentDomain: 'kuna.eth', registrationProxyUrl: 'https://id.example.org' },
}

const disabledBrand: RuntimeBrand = { id: 'safe', name: 'Safe{Mobile}' }

describe('username', () => {
  beforeEach(() => {
    mockGetBrand.mockReturnValue(enabledBrand)
  })

  describe('isUsernameLike', () => {
    it('accepts @-prefixed handles', () => {
      expect(isUsernameLike('@ana')).toBe(true)
    })

    it('accepts full names under the parent domain, case-insensitively', () => {
      expect(isUsernameLike('ana.kuna.eth')).toBe(true)
      expect(isUsernameLike('  Ana.KUNA.eth  ')).toBe(true)
    })

    it('rejects a bare address', () => {
      expect(isUsernameLike('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045')).toBe(false)
    })

    it('rejects bare labels and foreign ENS names', () => {
      expect(isUsernameLike('ana')).toBe(false)
      expect(isUsernameLike('ana.other.eth')).toBe(false)
    })

    it('returns false for everything when the brand has no identity config', () => {
      mockGetBrand.mockReturnValue(disabledBrand)

      expect(isUsernameLike('@ana')).toBe(false)
      expect(isUsernameLike('ana.kuna.eth')).toBe(false)
    })
  })

  describe('normalizeUsername', () => {
    it('trims, lowercases and strips the @ prefix', () => {
      expect(normalizeUsername('  @Ana ')).toBe('ana')
      expect(normalizeUsername('ANA')).toBe('ana')
    })

    it('strips the parent domain suffix', () => {
      expect(normalizeUsername('ana.kuna.eth')).toBe('ana')
      expect(normalizeUsername('@Ana.Kuna.ETH')).toBe('ana')
    })

    it('enforces the 3-character minimum', () => {
      expect(normalizeUsername('ab')).toBeNull()
      expect(normalizeUsername('abc')).toBe('abc')
    })

    it('enforces the 32-character maximum', () => {
      expect(normalizeUsername('a'.repeat(32))).toBe('a'.repeat(32))
      expect(normalizeUsername('a'.repeat(33))).toBeNull()
    })

    it('allows inner hyphens but rejects leading/trailing ones', () => {
      expect(normalizeUsername('ana-maria')).toBe('ana-maria')
      expect(normalizeUsername('-ana')).toBeNull()
      expect(normalizeUsername('ana-')).toBeNull()
    })

    it('rejects characters outside a-z, 0-9 and hyphen', () => {
      expect(normalizeUsername('an_a')).toBeNull()
      expect(normalizeUsername('ana!')).toBeNull()
      expect(normalizeUsername('ana ma')).toBeNull()
    })

    it('rejects a full name with dots when the domain suffix does not match', () => {
      expect(normalizeUsername('ana.other.eth')).toBeNull()
    })

    it('keeps reserved names unless checkReserved is set', () => {
      expect(normalizeUsername('admin')).toBe('admin')
      expect(normalizeUsername('admin', { checkReserved: true })).toBeNull()
      expect(normalizeUsername('@Admin', { checkReserved: true })).toBeNull()
    })

    it('still normalizes @-handles when identity is not configured', () => {
      mockGetBrand.mockReturnValue(disabledBrand)

      expect(normalizeUsername('@ana')).toBe('ana')
      expect(normalizeUsername('ana.kuna.eth')).toBeNull()
    })
  })

  describe('isReservedUsername', () => {
    it('uses the default reserved list when the brand does not override it', () => {
      expect(isReservedUsername('admin')).toBe(true)
      expect(isReservedUsername('SUPPORT')).toBe(true)
      expect(isReservedUsername('ana')).toBe(false)
    })

    it('uses the brand-provided reserved list when present', () => {
      mockGetBrand.mockReturnValue({
        ...enabledBrand,
        identity: {
          parentDomain: 'kuna.eth',
          registrationProxyUrl: 'https://id.example.org',
          reservedNames: ['kuna'],
        },
      })

      expect(isReservedUsername('kuna')).toBe(true)
      expect(isReservedUsername('admin')).toBe(false)
    })
  })

  describe('toFullEnsName', () => {
    it('appends the parent domain', () => {
      expect(toFullEnsName('ana')).toBe('ana.kuna.eth')
    })

    it('throws when identity is not configured', () => {
      mockGetBrand.mockReturnValue(disabledBrand)

      expect(() => toFullEnsName('ana')).toThrow('Identity is not configured for this brand')
    })
  })
})
