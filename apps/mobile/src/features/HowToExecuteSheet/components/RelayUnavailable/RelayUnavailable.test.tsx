import React from 'react'
import { render } from '@/src/tests/test-utils'
import { RelayUnavailable } from './RelayUnavailable'
import { getRelayCopy, zfStrings } from '@/src/custom/zerofee'

jest.mock('@/src/custom/zerofee', () => ({
  ...jest.requireActual('@/src/custom/zerofee'),
  getRelayCopy: jest.fn(),
}))

const mockGetRelayCopy = getRelayCopy as jest.MockedFunction<typeof getRelayCopy>

describe('RelayUnavailable', () => {
  it('keeps the upstream copy on non-zero-fee brands', () => {
    mockGetRelayCopy.mockReturnValue(null)
    const { getByText } = render(<RelayUnavailable />)

    expect(getByText(/You reached a limit with free transactions/)).toBeTruthy()
  })

  it('shows the honest HR fallback (no "0%" claim) on zero-fee brands', () => {
    mockGetRelayCopy.mockReturnValue(zfStrings.relay)
    const { getByText, queryByText } = render(<RelayUnavailable />)

    expect(getByText(/Dnevna kvota besplatnih transakcija je iskorištena/)).toBeTruthy()
    expect(getByText(/mrežnu naknadu plaća tvoj potpisni ključ/)).toBeTruthy()
    expect(queryByText(/%/)).toBeNull()
    expect(queryByText(/You reached a limit/)).toBeNull()
  })
})
