import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '@/src/store'

/**
 * The user's OWN usernames, keyed `${chainId}:${safeAddress}` (a Safe address
 * is per-chain; the username is bound to the brand's primary network — see
 * faza-4 Zapisnik). Persisted via the root persist config (blacklist-based).
 */
export type IdentitySliceState = {
  ownUsernames: Record<string, string>
}

const initialState: IdentitySliceState = {
  ownUsernames: {},
}

export const identityKey = (chainId: string, safeAddress: string): string => `${chainId}:${safeAddress.toLowerCase()}`

const identitySlice = createSlice({
  name: 'identity',
  initialState,
  reducers: {
    setOwnUsername: (state, action: PayloadAction<{ chainId: string; safeAddress: string; username: string }>) => {
      const { chainId, safeAddress, username } = action.payload
      state.ownUsernames[identityKey(chainId, safeAddress)] = username
    },
    removeOwnUsername: (state, action: PayloadAction<{ chainId: string; safeAddress: string }>) => {
      const { chainId, safeAddress } = action.payload
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete state.ownUsernames[identityKey(chainId, safeAddress)]
    },
  },
})

export const { setOwnUsername, removeOwnUsername } = identitySlice.actions

export const selectOwnUsername = (state: RootState, chainId: string, safeAddress: string): string | undefined =>
  state.identity?.ownUsernames[identityKey(chainId, safeAddress)]

export default identitySlice.reducer
