import { createSelector, createSlice, PayloadAction } from '@reduxjs/toolkit'
import { RootState } from '@/src/store'
import { Address } from '@/src/types/address'
import { UndeployedSafe } from '@safe-global/utils/features/counterfactual/store/types'
import { removeSafe } from '@/src/store/safesSlice'
import { additionalSafesRtkApi } from '@safe-global/store/gateway/safes'

export type UndeployedSafesSliceItem = Record<string, UndeployedSafe>
export type UndeployedSafesSlice = Record<Address, UndeployedSafesSliceItem>

const initialState: UndeployedSafesSlice = {}

const deleteEntry = (state: UndeployedSafesSlice, address: Address, chainId: string) => {
  if (!state[address]?.[chainId]) {
    return
  }
  // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
  delete state[address][chainId]
  if (Object.keys(state[address]).length === 0) {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete state[address]
  }
}

const undeployedSafesSlice = createSlice({
  name: 'undeployedSafes',
  initialState,
  reducers: {
    addUndeployedSafe: (
      state,
      action: PayloadAction<{ address: Address; chainId: string; undeployedSafe: UndeployedSafe }>,
    ) => {
      const { address, chainId, undeployedSafe } = action.payload
      if (!state[address]) {
        state[address] = {}
      }
      state[address][chainId] = undeployedSafe
    },
    removeUndeployedSafe: (state, action: PayloadAction<{ address: Address; chainId: string }>) => {
      deleteEntry(state, action.payload.address, action.payload.chainId)
    },
  },
  extraReducers: (builder) => {
    // Removing an account from the app removes its counterfactual entry with it.
    builder.addCase(removeSafe, (state, action) => {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete state[action.payload]
    })
    // Self-heal: once CGW returns an overview for a safe it is deployed and indexed,
    // so the counterfactual marker is stale and must be dropped.
    builder.addMatcher(additionalSafesRtkApi.endpoints.safesGetOverviewForMany.matchFulfilled, (state, action) => {
      for (const overview of action.payload ?? []) {
        deleteEntry(state, overview.address.value as Address, overview.chainId)
      }
    })
  },
})

export const { addUndeployedSafe, removeUndeployedSafe } = undeployedSafesSlice.actions

export const selectUndeployedSafes = (state: RootState): UndeployedSafesSlice => state.undeployedSafes

export const selectUndeployedSafe = createSelector(
  [
    selectUndeployedSafes,
    (_state: RootState, address: Address) => address,
    (_state: RootState, _address: Address, chainId: string) => chainId,
  ],
  (undeployedSafes, address, chainId): UndeployedSafe | undefined => undeployedSafes[address]?.[chainId],
)

export const selectIsUndeployedSafe = createSelector([selectUndeployedSafe], (undeployedSafe): boolean =>
  Boolean(undeployedSafe),
)

export default undeployedSafesSlice.reducer
