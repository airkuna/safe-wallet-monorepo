import React from 'react'
import { fireEvent, render } from '@/src/tests/test-utils'
import { SelectRecipientContainer } from './SelectRecipient.container'
import { shortenAddress } from '@/src/utils/formatters'
import type { RecipientResolution } from '@/src/custom/identity'
import type { SafeInfo } from '@/src/types/address'

const VALID_ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
const RESOLVED_ADDRESS = '0x1f9090aaE28b8a3dCeaDf281B0F12828e676c326'
const TOKEN = '0x6B175474E89094C44Da98b954EedeAC495271d0F'
const SAFE_ADDRESS = '0x1111111111111111111111111111111111111111' as `0x${string}`

const IDLE: RecipientResolution = { status: 'idle', resolved: null }
const RESOLVED: RecipientResolution = {
  status: 'resolved',
  resolved: { address: RESOLVED_ADDRESS, ensName: 'ana.kuna.eth', username: 'ana' },
}

const mockPush = jest.fn()
const mockParams: jest.Mock<Record<string, string>> = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useLocalSearchParams: () => mockParams(),
  usePathname: () => '/send',
}))

const mockShow = jest.fn()
jest.mock('@tamagui/toast', () => ({
  useToastController: () => ({ show: mockShow }),
}))

const mockResolution: jest.Mock<RecipientResolution, [string]> = jest.fn()
jest.mock('@/src/custom/identity', () => ({
  useRecipientResolution: (input: string) => mockResolution(input),
}))

const activeSafe: SafeInfo = { address: SAFE_ADDRESS, chainId: '1' }

const renderContainer = () => render(<SelectRecipientContainer />, { initialStore: { activeSafe } })

describe('SelectRecipientContainer', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockParams.mockReturnValue({})
    mockResolution.mockReturnValue(IDLE)
  })

  describe('bare 0x address (regression)', () => {
    it('continues with the typed address through the unchanged navigation path', () => {
      const { getByTestId } = renderContainer()

      fireEvent.changeText(getByTestId('recipient-input'), VALID_ADDRESS)
      fireEvent.press(getByTestId('continue-button'))

      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/(send)/token',
        params: { recipientAddress: VALID_ADDRESS },
      })
    })

    it('forwards the payment-request prefill params untouched', () => {
      mockParams.mockReturnValue({
        scannedAddress: VALID_ADDRESS,
        scanNonce: '1',
        prefillTokenAddress: TOKEN,
        prefillValueRaw: '1000',
      })
      const { getByTestId } = renderContainer()

      fireEvent.press(getByTestId('continue-button'))

      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/(send)/token',
        params: { recipientAddress: VALID_ADDRESS, prefillTokenAddress: TOKEN, prefillValueRaw: '1000' },
      })
    })
  })

  describe('username resolution states', () => {
    it('shows a lookup hint while resolving and blocks continue', () => {
      mockResolution.mockReturnValue({ status: 'resolving', resolved: null })
      const { getByTestId, getByText } = renderContainer()

      fireEvent.changeText(getByTestId('recipient-input'), '@ana')

      expect(getByTestId('username-hint-resolving')).toBeTruthy()
      expect(getByText('Looking up name…')).toBeTruthy()

      fireEvent.press(getByTestId('continue-button'))
      expect(mockPush).not.toHaveBeenCalled()
    })

    it('shows "Name not found" when the name does not resolve', () => {
      mockResolution.mockReturnValue({ status: 'not-found', resolved: null })
      const { getByTestId, getByText } = renderContainer()

      fireEvent.changeText(getByTestId('recipient-input'), '@nobody')

      expect(getByTestId('username-hint-not-found')).toBeTruthy()
      expect(getByText('Name not found')).toBeTruthy()
    })

    it('shows a neutral hint on lookup errors and keeps manual entry available', () => {
      mockResolution.mockReturnValue({ status: 'error', resolved: null })
      const { getByTestId, getByText } = renderContainer()

      fireEvent.changeText(getByTestId('recipient-input'), '@ana')

      expect(getByText("Couldn't check this name. You can still enter an address.")).toBeTruthy()

      mockResolution.mockReturnValue(IDLE)
      fireEvent.changeText(getByTestId('recipient-input'), VALID_ADDRESS)
      fireEvent.press(getByTestId('continue-button'))
      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({ params: expect.objectContaining({ recipientAddress: VALID_ADDRESS }) }),
      )
    })
  })

  describe('resolved username', () => {
    it('shows the username card with the hex hidden behind a shortened address', () => {
      mockResolution.mockReturnValue(RESOLVED)
      const { getByTestId, getByText, queryByText, queryByTestId } = renderContainer()

      expect(getByTestId('resolved-username-card')).toBeTruthy()
      expect(getByText('@ana')).toBeTruthy()
      expect(getByText('ana.kuna.eth')).toBeTruthy()
      expect(getByText(shortenAddress(RESOLVED_ADDRESS, 4))).toBeTruthy()
      expect(queryByText(RESOLVED_ADDRESS)).toBeNull()
      expect(queryByTestId('recipient-input')).toBeNull()
    })

    it('continues with the resolved address and forwards the username as the recipient name', () => {
      mockResolution.mockReturnValue(RESOLVED)
      const { getByTestId } = renderContainer()

      fireEvent.press(getByTestId('continue-button'))

      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/(send)/token',
        params: { recipientAddress: RESOLVED_ADDRESS, recipientName: '@ana' },
      })
    })

    it('runs recipient validation on the resolved address (self-send warning shows)', () => {
      mockResolution.mockReturnValue({
        status: 'resolved',
        resolved: { address: SAFE_ADDRESS, ensName: 'me.kuna.eth', username: 'me' },
      })
      const { getByText } = renderContainer()

      expect(getByText('Sending to your own Safe')).toBeTruthy()
    })

    it('prefills the add-to-address-book suggestion with the username for unknown addresses', () => {
      mockResolution.mockReturnValue(RESOLVED)
      const { getByTestId } = renderContainer()

      fireEvent.press(getByTestId('add-to-address-book'))

      expect(getByTestId('contact-name-input').props.value).toBe('@ana')
    })

    it('returns to the editable input when the card is cleared', () => {
      const { getByTestId, queryByTestId } = renderContainer()

      mockResolution.mockReturnValue(RESOLVED)
      fireEvent.changeText(getByTestId('recipient-input'), '@ana')
      expect(getByTestId('resolved-username-card')).toBeTruthy()

      mockResolution.mockReturnValue(IDLE)
      fireEvent.press(getByTestId('clear-recipient-button'))

      expect(queryByTestId('resolved-username-card')).toBeNull()
      expect(getByTestId('recipient-input').props.value).toBe('')
    })
  })

  describe('identity disabled (idle resolution)', () => {
    it('renders no username affordances and treats @input as plain typing', () => {
      const { getByTestId, queryByTestId } = renderContainer()

      fireEvent.changeText(getByTestId('recipient-input'), '@ana')

      expect(queryByTestId('resolved-username-card')).toBeNull()
      expect(queryByTestId('username-hint-resolving')).toBeNull()
      expect(queryByTestId('username-hint-not-found')).toBeNull()
      expect(queryByTestId('username-hint-error')).toBeNull()
      expect(getByTestId('recipient-input').props.value).toBe('@ana')

      fireEvent.press(getByTestId('continue-button'))
      expect(mockPush).not.toHaveBeenCalled()
    })
  })
})
