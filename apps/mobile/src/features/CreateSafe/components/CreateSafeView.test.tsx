import React from 'react'
import { fireEvent, render } from '@/src/tests/test-utils'
import { CreateSafeView } from './CreateSafeView'
import type { Chain } from '@safe-global/store/gateway/AUTO_GENERATED/chains'

const chains = [
  { chainId: '1', chainName: 'Ethereum', chainLogoUri: null },
  { chainId: '100', chainName: 'Gnosis Chain', chainLogoUri: null },
] as unknown as Chain[]

const defaultProps = {
  name: '',
  onNameChange: jest.fn(),
  chains,
  selectedChainId: '1',
  onSelectChain: jest.fn(),
  onCreate: jest.fn(),
  isCreating: false,
  error: undefined,
}

describe('CreateSafeView', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the form with all networks', () => {
    const { getAllByText, getByTestId } = render(<CreateSafeView {...defaultProps} />)

    // Title and submit button both read "Create account"
    expect(getAllByText('Create account').length).toBeGreaterThanOrEqual(2)
    expect(getByTestId('create-safe-chain-1')).toBeTruthy()
    expect(getByTestId('create-safe-chain-100')).toBeTruthy()
  })

  it('selects a network on press', () => {
    const { getByTestId } = render(<CreateSafeView {...defaultProps} />)

    fireEvent.press(getByTestId('create-safe-chain-100'))
    expect(defaultProps.onSelectChain).toHaveBeenCalledWith('100')
  })

  it('submits via the create button', () => {
    const { getByTestId } = render(<CreateSafeView {...defaultProps} />)

    fireEvent.press(getByTestId('create-safe-submit'))
    expect(defaultProps.onCreate).toHaveBeenCalled()
  })

  it('disables the button while creating', () => {
    const { getByTestId } = render(<CreateSafeView {...defaultProps} isCreating={true} />)

    fireEvent.press(getByTestId('create-safe-submit'))
    expect(defaultProps.onCreate).not.toHaveBeenCalled()
  })

  it('disables the button while networks are loading', () => {
    const { getByTestId, getByText } = render(
      <CreateSafeView {...defaultProps} chains={[]} selectedChainId={undefined} />,
    )

    expect(getByText('Loading networks…')).toBeTruthy()
    fireEvent.press(getByTestId('create-safe-submit'))
    expect(defaultProps.onCreate).not.toHaveBeenCalled()
  })

  it('shows the error alert', () => {
    const { getByText } = render(<CreateSafeView {...defaultProps} error="Something went wrong" />)

    expect(getByText('Something went wrong')).toBeTruthy()
  })
})
