import React from 'react'
import { act, createTestStore, fireEvent, renderWithStore } from '@/src/tests/test-utils'
import { CommonActions } from '@react-navigation/native'
import { UsernameStepContainer } from './UsernameStep.container'
import { checkAvailability, registerUsername, identityKey } from '@/src/custom/identity'
import { USERNAME_CHECK_DEBOUNCE_MS } from '../../hooks/useUsernameAvailability'

const SAFE_ADDRESS = '0x3333333333333333333333333333333333333333'
const CHAIN_ID = '100'

const mockNavigationDispatch = jest.fn()
const mockParams: jest.Mock<{ safeAddress?: string; chainId?: string }> = jest.fn()

jest.mock('expo-router', () => ({
  useNavigation: () => ({ dispatch: mockNavigationDispatch }),
  useLocalSearchParams: () => mockParams(),
}))

const mockIsIdentityEnabled = jest.fn(() => true)

jest.mock('@/src/custom/identity', () => {
  const slice = jest.requireActual('@/src/custom/identity/store/identitySlice')
  const username = jest.requireActual('@/src/custom/identity/username')
  return {
    isIdentityEnabled: () => mockIsIdentityEnabled(),
    checkAvailability: jest.fn(),
    registerUsername: jest.fn(),
    normalizeUsername: username.normalizeUsername,
    toFullEnsName: (name: string) => `${name}.kuna.eth`,
    setOwnUsername: slice.setOwnUsername,
    identityKey: slice.identityKey,
  }
})

const mockCheckAvailability = checkAvailability as jest.MockedFunction<typeof checkAvailability>
const mockRegisterUsername = registerUsername as jest.MockedFunction<typeof registerUsername>

const HOME_RESET = CommonActions.reset({ routes: [{ key: '(tabs)', name: '(tabs)' }] })

const renderStep = () => {
  const store = createTestStore()
  return { store, ...renderWithStore(<UsernameStepContainer />, store) }
}

type RenderedStep = ReturnType<typeof renderStep>

const typeUsername = async ({ getByTestId }: RenderedStep, value: string) => {
  fireEvent.changeText(getByTestId('create-safe-username-input'), value)
  await act(async () => {
    jest.advanceTimersByTime(USERNAME_CHECK_DEBOUNCE_MS)
  })
}

describe('UsernameStepContainer', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    mockIsIdentityEnabled.mockReturnValue(true)
    mockParams.mockReturnValue({ safeAddress: SAFE_ADDRESS, chainId: CHAIN_ID })
    mockCheckAvailability.mockResolvedValue('available')
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('registers the name, stores it for the created Safe and navigates home', async () => {
    mockRegisterUsername.mockResolvedValue({ ensName: 'ana.kuna.eth' })
    const rendered = renderStep()
    const { store, getByTestId } = rendered

    await typeUsername(rendered, 'Ana')

    await act(async () => {
      fireEvent.press(getByTestId('create-safe-username-submit'))
    })

    expect(mockRegisterUsername).toHaveBeenCalledWith('ana', SAFE_ADDRESS)
    expect(store.getState().identity.ownUsernames[identityKey(CHAIN_ID, SAFE_ADDRESS)]).toBe('ana')
    expect(mockNavigationDispatch).toHaveBeenCalledWith(HOME_RESET)
  })

  it('skips without registering and navigates home', async () => {
    const { store, getByTestId } = renderStep()

    fireEvent.press(getByTestId('create-safe-username-skip'))

    expect(mockRegisterUsername).not.toHaveBeenCalled()
    expect(store.getState().identity.ownUsernames).toEqual({})
    expect(mockNavigationDispatch).toHaveBeenCalledWith(HOME_RESET)
  })

  it('shows the failure, then allows a retry that succeeds', async () => {
    mockRegisterUsername
      .mockRejectedValueOnce(new Error('Username is already taken'))
      .mockResolvedValueOnce({ ensName: 'ana.kuna.eth' })
    const rendered = renderStep()
    const { store, getByTestId, getByText } = rendered

    await typeUsername(rendered, 'ana')

    await act(async () => {
      fireEvent.press(getByTestId('create-safe-username-submit'))
    })

    expect(getByText('Username is already taken')).toBeTruthy()
    expect(store.getState().identity.ownUsernames).toEqual({})
    expect(mockNavigationDispatch).not.toHaveBeenCalled()

    await act(async () => {
      fireEvent.press(getByTestId('create-safe-username-submit'))
    })

    expect(store.getState().identity.ownUsernames[identityKey(CHAIN_ID, SAFE_ADDRESS)]).toBe('ana')
    expect(mockNavigationDispatch).toHaveBeenCalledWith(HOME_RESET)
  })

  it('still allows skipping after a failure', async () => {
    mockRegisterUsername.mockRejectedValue(new Error('Registration failed (500)'))
    const rendered = renderStep()
    const { store, getByTestId, getByText } = rendered

    await typeUsername(rendered, 'ana')

    await act(async () => {
      fireEvent.press(getByTestId('create-safe-username-submit'))
    })

    expect(getByText('Registration failed (500)')).toBeTruthy()

    fireEvent.press(getByTestId('create-safe-username-skip'))

    expect(store.getState().identity.ownUsernames).toEqual({})
    expect(mockNavigationDispatch).toHaveBeenCalledWith(HOME_RESET)
  })

  it('renders nothing and goes home when identity is disabled for the brand', () => {
    mockIsIdentityEnabled.mockReturnValue(false)
    const { queryByTestId } = renderStep()

    expect(queryByTestId('create-safe-username-screen')).toBeNull()
    expect(mockNavigationDispatch).toHaveBeenCalledWith(HOME_RESET)
  })

  it('goes home when opened without a created Safe context', () => {
    mockParams.mockReturnValue({})
    const { queryByTestId } = renderStep()

    expect(queryByTestId('create-safe-username-screen')).toBeNull()
    expect(mockNavigationDispatch).toHaveBeenCalledWith(HOME_RESET)
  })
})
