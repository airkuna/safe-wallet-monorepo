import React from 'react'
import Clipboard from '@react-native-clipboard/clipboard'
import { fireEvent, render } from '@/src/tests/test-utils'
import { ResolvedUsernameCard } from './ResolvedUsernameCard'
import { shortenAddress } from '@/src/utils/formatters'

const RESOLVED = {
  address: '0x1f9090aaE28b8a3dCeaDf281B0F12828e676c326',
  ensName: 'ana.kuna.eth',
  username: 'ana',
}

jest.mock('expo-router', () => ({
  usePathname: () => '/send',
}))

const mockShow = jest.fn()
jest.mock('@tamagui/toast', () => ({
  useToastController: () => ({ show: mockShow }),
}))

describe('ResolvedUsernameCard', () => {
  const onClear = jest.fn()

  const renderCard = () =>
    render(<ResolvedUsernameCard resolved={RESOLVED} validationState="unknown" onClear={onClear} />)

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('shows the username, full ENS name and a shortened address only', () => {
    const { getByText, queryByText } = renderCard()

    expect(getByText('@ana')).toBeTruthy()
    expect(getByText('ana.kuna.eth')).toBeTruthy()
    expect(getByText(shortenAddress(RESOLVED.address, 4))).toBeTruthy()
    expect(queryByText(RESOLVED.address)).toBeNull()
  })

  it('shows the validation label for the resolved address', () => {
    const { getByText } = renderCard()

    expect(getByText('Unknown recipient')).toBeTruthy()
  })

  it('reveals the full address on explicit tap and copies it on a second tap', () => {
    const { getByTestId, getByText } = renderCard()

    fireEvent.press(getByTestId('resolved-address-toggle'))
    expect(getByText(RESOLVED.address)).toBeTruthy()
    expect(Clipboard.setString).not.toHaveBeenCalled()

    fireEvent.press(getByTestId('resolved-address-toggle'))
    expect(Clipboard.setString).toHaveBeenCalledWith(RESOLVED.address)
  })

  it('calls onClear from the clear affordance', () => {
    const { getByTestId } = renderCard()

    fireEvent.press(getByTestId('clear-recipient-button'))

    expect(onClear).toHaveBeenCalled()
  })
})
