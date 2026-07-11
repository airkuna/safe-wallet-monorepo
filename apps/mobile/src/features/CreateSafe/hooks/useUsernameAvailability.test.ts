import { act, renderHook } from '@testing-library/react-native'
import { useUsernameAvailability, USERNAME_CHECK_DEBOUNCE_MS } from './useUsernameAvailability'
import { checkAvailability } from '@/src/custom/identity'

jest.mock('@/src/custom/identity', () => ({
  checkAvailability: jest.fn(),
}))

const mockCheckAvailability = checkAvailability as jest.MockedFunction<typeof checkAvailability>

const renderAvailability = (initialName = '') =>
  renderHook((name: string) => useUsernameAvailability(name), { initialProps: initialName })

describe('useUsernameAvailability', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('is idle for an empty input and never calls the service', async () => {
    const { result } = renderAvailability('')

    await act(async () => {
      jest.advanceTimersByTime(USERNAME_CHECK_DEBOUNCE_MS * 2)
    })

    expect(result.current).toBe('idle')
    expect(mockCheckAvailability).not.toHaveBeenCalled()
  })

  it('shows checking immediately and the verdict after the debounce', async () => {
    mockCheckAvailability.mockResolvedValue('available')

    const { result, rerender } = renderAvailability()
    rerender('ana')

    expect(result.current).toBe('checking')

    await act(async () => {
      jest.advanceTimersByTime(USERNAME_CHECK_DEBOUNCE_MS)
    })

    expect(mockCheckAvailability).toHaveBeenCalledWith('ana')
    expect(result.current).toBe('available')
  })

  it('debounces rapid typing into a single request for the last value', async () => {
    mockCheckAvailability.mockResolvedValue('taken')

    const { result, rerender } = renderAvailability()
    rerender('a')
    await act(async () => {
      jest.advanceTimersByTime(USERNAME_CHECK_DEBOUNCE_MS / 2)
    })
    rerender('an')
    await act(async () => {
      jest.advanceTimersByTime(USERNAME_CHECK_DEBOUNCE_MS / 2)
    })
    rerender('ana')
    await act(async () => {
      jest.advanceTimersByTime(USERNAME_CHECK_DEBOUNCE_MS)
    })

    expect(mockCheckAvailability).toHaveBeenCalledTimes(1)
    expect(mockCheckAvailability).toHaveBeenCalledWith('ana')
    expect(result.current).toBe('taken')
  })

  it('returns to idle when the input is cleared', async () => {
    mockCheckAvailability.mockResolvedValue('available')

    const { result, rerender } = renderAvailability()
    rerender('ana')
    await act(async () => {
      jest.advanceTimersByTime(USERNAME_CHECK_DEBOUNCE_MS)
    })
    expect(result.current).toBe('available')

    rerender('')
    expect(result.current).toBe('idle')
  })

  it('ignores a stale verdict after the input changed again', async () => {
    let resolveFirst: (value: 'available') => void = () => undefined
    mockCheckAvailability
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve
          }),
      )
      .mockResolvedValueOnce('taken')

    const { result, rerender } = renderAvailability()
    rerender('ana')
    await act(async () => {
      jest.advanceTimersByTime(USERNAME_CHECK_DEBOUNCE_MS)
    })

    rerender('anab')
    await act(async () => {
      jest.advanceTimersByTime(USERNAME_CHECK_DEBOUNCE_MS)
    })

    await act(async () => {
      resolveFirst('available')
    })

    expect(result.current).toBe('taken')
  })
})
