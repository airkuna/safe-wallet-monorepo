import { renderHook, act } from '@testing-library/react-native'
import {
  clearEntryLogForTesting,
  findPriorOkScan,
  getLocalEntryCount,
  recordEntryScan,
  tokenFingerprint,
  useEntryLog,
  TOKEN_FINGERPRINT_LENGTH,
  type EntryScanRecord,
} from './useEntryLog'

const record = (overrides: Partial<EntryScanRecord> = {}): EntryScanRecord => ({
  tokenFingerprint: 'abcdefabcdefabcd',
  serial: 'MOM-000001',
  holderName: 'Ana Anić',
  tierTitle: 'Regular',
  result: 'ok',
  atMs: 1_700_000_000_000,
  ...overrides,
})

describe('useEntryLog', () => {
  beforeEach(() => {
    clearEntryLogForTesting()
  })

  it('fingerprints only a prefix of the token (never the full bearer token)', () => {
    const token = 'ab'.repeat(32)
    const fingerprint = tokenFingerprint(token)
    expect(fingerprint).toHaveLength(TOKEN_FINGERPRINT_LENGTH)
    expect(fingerprint.length).toBeLessThan(token.length)
    expect(token.startsWith(fingerprint)).toBe(true)
  })

  it('records scans newest first and survives a re-read (persistence)', () => {
    recordEntryScan(record({ serial: 'MOM-000001', atMs: 1 }))
    recordEntryScan(record({ serial: 'MOM-000002', tokenFingerprint: 'ffffffffffffffff', atMs: 2 }))

    const { result } = renderHook(() => useEntryLog())
    expect(result.current).toHaveLength(2)
    expect(result.current[0].serial).toBe('MOM-000002')
    expect(result.current[1].serial).toBe('MOM-000001')
  })

  it('detects a prior successful scan of the same token (anti-double-entry pre-check)', () => {
    recordEntryScan(record())
    const prior = findPriorOkScan('abcdefabcdefabcd')
    expect(prior?.serial).toBe('MOM-000001')
    expect(prior?.holderName).toBe('Ana Anić')

    expect(findPriorOkScan('0000000000000000')).toBeUndefined()
  })

  it('does not treat rejected/error scans as entries', () => {
    recordEntryScan(record({ result: 'rejected' }))
    recordEntryScan(record({ result: 'error', tokenFingerprint: 'eeeeeeeeeeeeeeee' }))
    expect(findPriorOkScan('abcdefabcdefabcd')).toBeUndefined()
    expect(getLocalEntryCount()).toBe(0)
  })

  it('counts only successful entries', () => {
    recordEntryScan(record({ result: 'ok' }))
    recordEntryScan(record({ result: 'ok', tokenFingerprint: 'ffffffffffffffff', serial: 'MOM-000002' }))
    recordEntryScan(record({ result: 'duplicate' }))
    expect(getLocalEntryCount()).toBe(2)
  })

  it('notifies hook subscribers on new scans', () => {
    const { result } = renderHook(() => useEntryLog())
    expect(result.current).toHaveLength(0)

    act(() => {
      recordEntryScan(record())
    })
    expect(result.current).toHaveLength(1)
  })
})
