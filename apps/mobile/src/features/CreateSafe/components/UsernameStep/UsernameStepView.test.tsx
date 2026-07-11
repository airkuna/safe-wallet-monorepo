import React from 'react'
import { fireEvent, render } from '@/src/tests/test-utils'
import { UsernameStepView } from './UsernameStepView'
import type { UsernameAvailability } from '../../hooks/useUsernameAvailability'

const defaultProps = {
  username: '',
  onUsernameChange: jest.fn(),
  availability: 'idle' as UsernameAvailability,
  fullEnsName: undefined as string | undefined,
  onConfirm: jest.fn(),
  onSkip: jest.fn(),
  isRegistering: false,
  error: undefined as string | undefined,
}

describe('UsernameStepView', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the step with a skip affordance', () => {
    const { getByText, getByTestId } = render(<UsernameStepView {...defaultProps} />)

    expect(getByText('Choose your name')).toBeTruthy()
    expect(getByText('Skip for now')).toBeTruthy()
    expect(getByTestId('create-safe-username-input')).toBeTruthy()
  })

  it('forwards lowercase input changes', () => {
    const { getByTestId } = render(<UsernameStepView {...defaultProps} />)

    fireEvent.changeText(getByTestId('create-safe-username-input'), 'ana')
    expect(defaultProps.onUsernameChange).toHaveBeenCalledWith('ana')
  })

  it('shows the available state with the full name and enables confirm', () => {
    const { getByText, getByTestId } = render(
      <UsernameStepView {...defaultProps} username="ana" availability="available" fullEnsName="ana.kuna.eth" />,
    )

    expect(getByText('ana.kuna.eth is available')).toBeTruthy()
    fireEvent.press(getByTestId('create-safe-username-submit'))
    expect(defaultProps.onConfirm).toHaveBeenCalled()
  })

  it.each([
    ['checking', 'Checking availability…'],
    ['taken', 'This name is already taken'],
    ['invalid', 'Use 3–32 characters: lowercase letters, numbers and hyphens'],
    ['reserved', 'This name is reserved'],
    ['unavailable-service', 'The name service is unreachable right now. You can register a name later.'],
  ] as [UsernameAvailability, string][])('renders the %s state hint and blocks confirm', (availability, hint) => {
    const { getByText, getByTestId } = render(
      <UsernameStepView {...defaultProps} username="ana" availability={availability} />,
    )

    expect(getByText(hint)).toBeTruthy()
    fireEvent.press(getByTestId('create-safe-username-submit'))
    expect(defaultProps.onConfirm).not.toHaveBeenCalled()
  })

  it('always allows skipping', () => {
    const { getByTestId } = render(<UsernameStepView {...defaultProps} username="ana" availability="taken" />)

    fireEvent.press(getByTestId('create-safe-username-skip'))
    expect(defaultProps.onSkip).toHaveBeenCalled()
  })

  it('shows the registration error and allows retrying', () => {
    const { getByText, getByTestId } = render(
      <UsernameStepView
        {...defaultProps}
        username="ana"
        availability="available"
        fullEnsName="ana.kuna.eth"
        error="Username is already taken"
      />,
    )

    expect(getByText('Username is already taken')).toBeTruthy()
    fireEvent.press(getByTestId('create-safe-username-submit'))
    expect(defaultProps.onConfirm).toHaveBeenCalled()
  })

  it('blocks confirm and skip while registering', () => {
    const { getByTestId } = render(
      <UsernameStepView
        {...defaultProps}
        username="ana"
        availability="available"
        fullEnsName="ana.kuna.eth"
        isRegistering={true}
      />,
    )

    fireEvent.press(getByTestId('create-safe-username-submit'))
    fireEvent.press(getByTestId('create-safe-username-skip'))
    expect(defaultProps.onConfirm).not.toHaveBeenCalled()
    expect(defaultProps.onSkip).not.toHaveBeenCalled()
  })
})
