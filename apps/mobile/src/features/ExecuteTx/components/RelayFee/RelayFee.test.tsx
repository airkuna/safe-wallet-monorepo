import React from 'react'
import { render } from '@/src/tests/test-utils'
import { RelayFee } from './RelayFee'
import { getRelayCopy, zfStrings } from '@/src/custom/zerofee'

jest.mock('@/src/custom/zerofee', () => ({
  ...jest.requireActual('@/src/custom/zerofee'),
  getRelayCopy: jest.fn(),
}))

// MaskedView/LinearGradient internals are irrelevant here — render the label directly.
jest.mock('@/src/components/GradientText', () => ({
  GradientText: ({ children }: { children: React.ReactNode }) => children,
}))

const mockGetRelayCopy = getRelayCopy as jest.MockedFunction<typeof getRelayCopy>

const baseProps = {
  isLoadingRelays: false,
  relaysRemaining: { remaining: 2, limit: 5 },
}

describe('RelayFee', () => {
  it('keeps the upstream "Free" label on non-zero-fee brands', () => {
    mockGetRelayCopy.mockReturnValue(null)
    const { getByText } = render(<RelayFee {...baseProps} />)

    expect(getByText('Free')).toBeTruthy()
    expect(getByText('2 left / day')).toBeTruthy()
  })

  it('shows the HR "Bez naknade" label on zero-fee brands', () => {
    mockGetRelayCopy.mockReturnValue(zfStrings.relay)
    const { getByText, queryByText } = render(<RelayFee {...baseProps} />)

    expect(getByText('Bez naknade')).toBeTruthy()
    expect(getByText('još 2 danas')).toBeTruthy()
    expect(queryByText('Free')).toBeNull()
  })
})
