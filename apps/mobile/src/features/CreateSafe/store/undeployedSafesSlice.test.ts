import reducer, { addUndeployedSafe, removeUndeployedSafe, selectUndeployedSafe } from './undeployedSafesSlice'
import { removeSafe } from '@/src/store/safesSlice'
import { additionalSafesRtkApi } from '@safe-global/store/gateway/safes'
import { cgwClient } from '@safe-global/store/gateway/cgwClient'
import { PendingSafeStatus, UndeployedSafe } from '@safe-global/utils/features/counterfactual/store/types'
import type { PayMethod } from '@safe-global/utils/features/counterfactual/types'
import { SafeOverview } from '@safe-global/store/gateway/AUTO_GENERATED/safes'
import { Address } from '@/src/types/address'
import type { RootState } from '@/src/store'

const safeAddress = '0x1111111111111111111111111111111111111111' as Address
const ownerAddress = '0x2222222222222222222222222222222222222222'

const undeployedSafe: UndeployedSafe = {
  status: { status: PendingSafeStatus.AWAITING_EXECUTION, type: 'PayLater' as PayMethod },
  props: {
    safeAccountConfig: { owners: [ownerAddress], threshold: 1 },
    safeDeploymentConfig: { saltNonce: '0', safeVersion: '1.4.1' },
  },
}

const buildOverview = (address: string, chainId: string): SafeOverview => ({
  address: { value: address, name: null, logoUri: null },
  chainId,
  threshold: 1,
  owners: [{ value: ownerAddress, name: null, logoUri: null }],
  fiatTotal: '0',
  queued: 0,
  awaitingConfirmation: null,
})

const buildOverviewFulfilledAction = (payload: SafeOverview[]) => ({
  type: `${cgwClient.reducerPath}/executeQuery/fulfilled`,
  payload,
  meta: {
    requestId: 'test-request',
    requestStatus: 'fulfilled' as const,
    arg: {
      type: 'query' as const,
      endpointName: 'safesGetOverviewForMany',
      queryCacheKey: 'safesGetOverviewForMany(test)',
      originalArgs: {},
    },
  },
})

describe('undeployedSafesSlice', () => {
  it('adds an undeployed safe per chain', () => {
    const state = reducer({}, addUndeployedSafe({ address: safeAddress, chainId: '1', undeployedSafe }))
    expect(state[safeAddress]['1']).toEqual(undeployedSafe)
  })

  it('removes a single chain entry and drops the address when empty', () => {
    let state = reducer({}, addUndeployedSafe({ address: safeAddress, chainId: '1', undeployedSafe }))
    state = reducer(state, addUndeployedSafe({ address: safeAddress, chainId: '100', undeployedSafe }))

    state = reducer(state, removeUndeployedSafe({ address: safeAddress, chainId: '1' }))
    expect(state[safeAddress]['1']).toBeUndefined()
    expect(state[safeAddress]['100']).toEqual(undeployedSafe)

    state = reducer(state, removeUndeployedSafe({ address: safeAddress, chainId: '100' }))
    expect(state[safeAddress]).toBeUndefined()
  })

  it('is a no-op when removing an unknown entry', () => {
    const initial = { [safeAddress]: { '1': undeployedSafe } }
    const state = reducer(initial, removeUndeployedSafe({ address: safeAddress, chainId: '5' }))
    expect(state).toEqual(initial)
  })

  it('cleans up when the account is removed from the app', () => {
    const initial = { [safeAddress]: { '1': undeployedSafe } }
    const state = reducer(initial, removeSafe(safeAddress))
    expect(state[safeAddress]).toBeUndefined()
  })

  it('self-heals when CGW starts returning an overview for the safe', () => {
    const action = buildOverviewFulfilledAction([buildOverview(safeAddress, '1')])
    // Guard: the hand-built action must actually satisfy the RTK Query matcher.
    expect(additionalSafesRtkApi.endpoints.safesGetOverviewForMany.matchFulfilled(action)).toBe(true)

    const initial = { [safeAddress]: { '1': undeployedSafe, '100': undeployedSafe } }
    const state = reducer(initial, action)
    expect(state[safeAddress]['1']).toBeUndefined()
    expect(state[safeAddress]['100']).toEqual(undeployedSafe)
  })

  it('ignores overviews for unknown addresses', () => {
    const action = buildOverviewFulfilledAction([buildOverview('0x9999999999999999999999999999999999999999', '1')])
    const initial = { [safeAddress]: { '1': undeployedSafe } }
    const state = reducer(initial, action)
    expect(state).toEqual(initial)
  })

  it('selects an undeployed safe by address and chain', () => {
    const state = { undeployedSafes: { [safeAddress]: { '1': undeployedSafe } } } as unknown as RootState
    expect(selectUndeployedSafe(state, safeAddress, '1')).toEqual(undeployedSafe)
    expect(selectUndeployedSafe(state, safeAddress, '5')).toBeUndefined()
  })
})
