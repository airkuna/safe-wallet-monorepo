/**
 * Guard za A3 "default na relay": upstream `executionMethodSlice` već starta
 * na WITH_RELAY (upstream #6493) i nije persistan preko launcha, pa je relay
 * predodabrani put svaki put kad je dostupan — `getExecutionMethod` tada vraća
 * relay, a inače pošteno pada na signer put. Ako upstream promijeni default,
 * ovaj test pukne i zero-fee UX odluka se mora revidirati.
 */
import reducer from '@/src/store/executionMethodSlice'
import { persistBlacklist } from '@/src/store'
import { ExecutionMethod } from '@/src/features/HowToExecuteSheet/types'
import { getExecutionMethod } from '@/src/features/ExecuteTx/components/ReviewAndExecute/helpers'
import type { Chain } from '@safe-global/store/gateway/AUTO_GENERATED/chains'

const chainWithRelay = { features: ['RELAYING'] } as unknown as Chain
const chainWithoutRelay = { features: [] } as unknown as Chain

describe('zero-fee default execution path', () => {
  it('starts every session with relay as the requested method', () => {
    expect(reducer(undefined, { type: '@@INIT' })).toBe(ExecutionMethod.WITH_RELAY)
  })

  it('does not persist the execution method across app launches', () => {
    expect(persistBlacklist).toContain('executionMethod')
  })

  it('resolves the session default to relay when relay is available', () => {
    const sessionDefault = reducer(undefined, { type: '@@INIT' })
    expect(getExecutionMethod(sessionDefault, true, chainWithRelay)).toBe(ExecutionMethod.WITH_RELAY)
  })

  it('falls back to the signer path when the quota is exhausted', () => {
    const sessionDefault = reducer(undefined, { type: '@@INIT' })
    expect(getExecutionMethod(sessionDefault, false, chainWithRelay)).toBe(ExecutionMethod.WITH_PK)
  })

  it('falls back to the signer path when the chain has no RELAYING feature', () => {
    const sessionDefault = reducer(undefined, { type: '@@INIT' })
    expect(getExecutionMethod(sessionDefault, true, chainWithoutRelay)).toBe(ExecutionMethod.WITH_PK)
  })
})
