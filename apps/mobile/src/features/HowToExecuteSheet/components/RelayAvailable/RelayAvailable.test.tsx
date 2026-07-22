import React from 'react'
import { render } from '@/src/tests/test-utils'
import { RelayAvailable } from './RelayAvailable'
import { ExecutionMethod } from '@/src/features/HowToExecuteSheet/types'
import { getRelayCopy, zfStrings } from '@/src/custom/zerofee'

jest.mock('@/src/custom/zerofee', () => ({
  ...jest.requireActual('@/src/custom/zerofee'),
  getRelayCopy: jest.fn(),
}))

const mockGetRelayCopy = getRelayCopy as jest.MockedFunction<typeof getRelayCopy>

const baseProps = {
  isLoadingRelays: false,
  relaysRemaining: { remaining: 3, limit: 5 },
  executionMethod: ExecutionMethod.WITH_RELAY,
}

describe('RelayAvailable', () => {
  it('keeps the upstream copy on non-zero-fee brands', () => {
    mockGetRelayCopy.mockReturnValue(null)
    const { getByText } = render(<RelayAvailable {...baseProps} />)

    expect(getByText('Sponsored by Safe')).toBeTruthy()
    expect(getByText('We pay transactions fees for you')).toBeTruthy()
    expect(getByText('3 left / day')).toBeTruthy()
  })

  it('shows the HR "Bez naknade" copy on zero-fee brands', () => {
    mockGetRelayCopy.mockReturnValue(zfStrings.relay)
    const { getByText, queryByText } = render(<RelayAvailable {...baseProps} />)

    expect(getByText('Bez naknade')).toBeTruthy()
    expect(getByText('Mrežnu naknadu plaćamo umjesto tebe')).toBeTruthy()
    expect(getByText('još 3 danas')).toBeTruthy()
    expect(queryByText('Sponsored by Safe')).toBeNull()
  })
})
