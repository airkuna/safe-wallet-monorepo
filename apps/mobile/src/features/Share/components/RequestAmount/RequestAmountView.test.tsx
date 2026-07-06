import React from 'react'
import { fireEvent, render } from '@/src/tests/test-utils'
import { RequestAmountView } from './RequestAmountView'
import type { RequestTokenOption } from './useRequestAmount'

jest.mock('@tamagui/toast', () => ({
  ToastViewport: () => null,
}))

const NATIVE: RequestTokenOption = { key: 'native', symbol: 'ETH', decimals: 18 }
const USDC: RequestTokenOption = {
  key: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  symbol: 'USDC',
  decimals: 6,
  tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
}

const defaultProps = {
  tokenOptions: [NATIVE, USDC],
  selectedToken: NATIVE,
  onSelectToken: jest.fn(),
  amount: '',
  onAmountChange: jest.fn(),
  eip681Uri: 'ethereum:0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@1',
  onShareLink: jest.fn(),
  onCopyLink: jest.fn(),
}

describe('RequestAmountView', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the token options and the QR container', () => {
    const { getByTestId, getAllByText } = render(<RequestAmountView {...defaultProps} />)

    expect(getByTestId('request-amount-qr')).toBeTruthy()
    expect(getAllByText('ETH').length).toBeGreaterThan(0)
    expect(getByTestId(`request-token-${USDC.key}`)).toBeTruthy()
  })

  it('propagates amount input changes', () => {
    const { getByTestId } = render(<RequestAmountView {...defaultProps} />)

    fireEvent.changeText(getByTestId('request-amount-input'), '20')

    expect(defaultProps.onAmountChange).toHaveBeenCalledWith('20')
  })

  it('selects a token on chip press', () => {
    const { getByTestId } = render(<RequestAmountView {...defaultProps} />)

    fireEvent.press(getByTestId(`request-token-${USDC.key}`))

    expect(defaultProps.onSelectToken).toHaveBeenCalledWith(USDC.key)
  })

  it('fires the share and copy handlers', () => {
    const { getByTestId } = render(<RequestAmountView {...defaultProps} />)

    fireEvent.press(getByTestId('request-share-link'))
    fireEvent.press(getByTestId('request-copy-link'))

    expect(defaultProps.onShareLink).toHaveBeenCalled()
    expect(defaultProps.onCopyLink).toHaveBeenCalled()
  })
})
