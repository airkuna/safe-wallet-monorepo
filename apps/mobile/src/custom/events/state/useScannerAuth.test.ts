import { renderHook, act } from '@testing-library/react-native'
import { clearScannerToken, getScannerToken, setScannerToken, useScannerToken } from './useScannerAuth'

describe('useScannerAuth', () => {
  beforeEach(() => {
    clearScannerToken()
  })

  it('stores and trims the scanner token', () => {
    setScannerToken('  jwt-org-admina  ')
    expect(getScannerToken()).toBe('jwt-org-admina')
  })

  it('treats an empty value as clearing the token', () => {
    setScannerToken('jwt')
    setScannerToken('   ')
    expect(getScannerToken()).toBeUndefined()
  })

  it('exposes the token reactively', () => {
    const { result } = renderHook(() => useScannerToken())
    expect(result.current).toBeUndefined()

    act(() => {
      setScannerToken('jwt')
    })
    expect(result.current).toBe('jwt')

    act(() => {
      clearScannerToken()
    })
    expect(result.current).toBeUndefined()
  })
})
