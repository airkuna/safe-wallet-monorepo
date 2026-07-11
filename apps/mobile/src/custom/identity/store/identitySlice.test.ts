import type { RootState } from '@/src/store'
import identityReducer, {
  setOwnUsername,
  removeOwnUsername,
  selectOwnUsername,
  identityKey,
  type IdentitySliceState,
} from './identitySlice'

const ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'

const createRootState = (identity: IdentitySliceState): RootState => ({ identity }) as RootState

describe('identitySlice', () => {
  describe('identityKey', () => {
    it('lowercases the safe address and keeps the chain id', () => {
      expect(identityKey('1', ADDRESS)).toBe(`1:${ADDRESS.toLowerCase()}`)
    })
  })

  describe('reducers', () => {
    it('setOwnUsername stores the username under the normalized key', () => {
      const state = identityReducer(undefined, setOwnUsername({ chainId: '1', safeAddress: ADDRESS, username: 'ana' }))

      expect(state.ownUsernames).toEqual({ [`1:${ADDRESS.toLowerCase()}`]: 'ana' })
    })

    it('setOwnUsername overwrites an existing username for the same safe', () => {
      const initial = identityReducer(
        undefined,
        setOwnUsername({ chainId: '1', safeAddress: ADDRESS, username: 'ana' }),
      )
      const state = identityReducer(
        initial,
        setOwnUsername({ chainId: '1', safeAddress: ADDRESS.toLowerCase(), username: 'ana-new' }),
      )

      expect(state.ownUsernames).toEqual({ [`1:${ADDRESS.toLowerCase()}`]: 'ana-new' })
    })

    it('keeps usernames per chain for the same address', () => {
      const initial = identityReducer(
        undefined,
        setOwnUsername({ chainId: '1', safeAddress: ADDRESS, username: 'ana' }),
      )
      const state = identityReducer(
        initial,
        setOwnUsername({ chainId: '100', safeAddress: ADDRESS, username: 'ana-gno' }),
      )

      expect(state.ownUsernames[`1:${ADDRESS.toLowerCase()}`]).toBe('ana')
      expect(state.ownUsernames[`100:${ADDRESS.toLowerCase()}`]).toBe('ana-gno')
    })

    it('removeOwnUsername deletes the entry regardless of address casing', () => {
      const initial = identityReducer(
        undefined,
        setOwnUsername({ chainId: '1', safeAddress: ADDRESS.toLowerCase(), username: 'ana' }),
      )
      const state = identityReducer(initial, removeOwnUsername({ chainId: '1', safeAddress: ADDRESS }))

      expect(state.ownUsernames).toEqual({})
    })

    it('removeOwnUsername is a no-op for an unknown safe', () => {
      const initial = identityReducer(
        undefined,
        setOwnUsername({ chainId: '1', safeAddress: ADDRESS, username: 'ana' }),
      )
      const state = identityReducer(initial, removeOwnUsername({ chainId: '5', safeAddress: ADDRESS }))

      expect(state).toEqual(initial)
    })
  })

  describe('selectOwnUsername', () => {
    it('returns the username for a stored safe, case-insensitively', () => {
      const state = createRootState({ ownUsernames: { [`1:${ADDRESS.toLowerCase()}`]: 'ana' } })

      expect(selectOwnUsername(state, '1', ADDRESS)).toBe('ana')
      expect(selectOwnUsername(state, '1', ADDRESS.toLowerCase())).toBe('ana')
    })

    it('returns undefined for an unknown safe or chain', () => {
      const state = createRootState({ ownUsernames: { [`1:${ADDRESS.toLowerCase()}`]: 'ana' } })

      expect(selectOwnUsername(state, '100', ADDRESS)).toBeUndefined()
      expect(selectOwnUsername(state, '1', '0x0000000000000000000000000000000000000001')).toBeUndefined()
    })
  })
})
