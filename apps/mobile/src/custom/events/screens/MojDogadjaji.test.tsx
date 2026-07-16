import React from 'react'
import { fireEvent, render, waitFor } from '@/src/tests/test-utils'
import { MojDogadjaji } from './MojDogadjaji'
import { evStrings } from '../strings'
import type { OrganizerOverview, OrganizerResult } from '../api/types'

const mockPush = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  useFocusEffect: (callback: () => void) => {
    const { useEffect } = jest.requireActual<typeof import('react')>('react')
    useEffect(callback, [callback])
  },
}))

let mockConfigured = true
jest.mock('../api/config', () => ({
  isEventsBackendConfigured: () => mockConfigured,
}))

let mockToken: string | undefined = 'jwt-org-admina'
const mockSetToken = jest.fn()
jest.mock('../state/useScannerAuth', () => ({
  useScannerToken: () => mockToken,
  setScannerToken: (token: string) => mockSetToken(token),
}))

const mockOverview = jest.fn<Promise<OrganizerResult<OrganizerOverview>>, [string]>()
jest.mock('../api/client', () => ({
  fetchOrganizerOverview: (token: string) => mockOverview(token),
}))

const overview = (): OrganizerOverview => ({
  accounts: [
    { id: 'acc-personal', name: 'Luka (osobni)', is_personal: true, allowlisted: false, has_record: false },
    { id: 'acc-org', name: 'Money Motion', is_personal: false, allowlisted: true, has_record: true },
  ],
  events: [
    {
      campaign_id: 'c-draft',
      account_id: 'acc-org',
      slug: 'momo-2027',
      title: 'Money Motion 2027',
      state: 'draft',
      visibility: 'private',
      destination_address: null,
      event: { venue_name: 'Velesajam', venue_city: 'Zagreb', starts_at: '2027-03-10T08:00:00Z' },
      tiers: [],
    },
    {
      campaign_id: 'c-active',
      account_id: 'acc-org',
      slug: 'blocksplit-2027',
      title: 'BlockSplit 2027',
      state: 'active',
      visibility: 'public',
      destination_address: '0x1111111111111111111111111111111111111111',
      event: { venue_name: 'MEDILS', venue_city: 'Split' },
      tiers: [],
    },
  ],
})

describe('MojDogadjaji', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockConfigured = true
    mockToken = 'jwt-org-admina'
    mockOverview.mockResolvedValue({ kind: 'ok', data: overview() })
  })

  it('shows the token gate without a saved access token', () => {
    mockToken = undefined
    const { getByTestId } = render(<MojDogadjaji />)
    expect(getByTestId('ev-organizer-token-gate')).toBeTruthy()
    expect(mockOverview).not.toHaveBeenCalled()
  })

  it('is unavailable without a configured backend', () => {
    mockConfigured = false
    const { getByTestId } = render(<MojDogadjaji />)
    expect(getByTestId('ev-organizer-unavailable')).toBeTruthy()
  })

  it('lists accounts with allowlist/DAC7 status and events with state badges', async () => {
    const { getByText, getByTestId } = render(<MojDogadjaji />)

    await waitFor(() => expect(getByTestId('ev-organizer-account-acc-org')).toBeTruthy())
    expect(mockOverview).toHaveBeenCalledWith('jwt-org-admina')
    expect(getByText(evStrings.organizer.allowlisted)).toBeTruthy()
    expect(getByText(evStrings.organizer.notAllowlisted)).toBeTruthy()
    expect(getByTestId('ev-organizer-state-c-draft')).toHaveTextContent(evStrings.organizer.state.draft)
    expect(getByTestId('ev-organizer-state-c-active')).toHaveTextContent(evStrings.organizer.state.active)
  })

  it('opens an event for editing and creates a new one on the org account', async () => {
    const { getByTestId } = render(<MojDogadjaji />)
    await waitFor(() => expect(getByTestId('ev-organizer-event-c-draft')).toBeTruthy())

    fireEvent.press(getByTestId('ev-organizer-event-c-draft'))
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/events/organizer-event',
      params: { campaign: 'c-draft' },
    })

    fireEvent.press(getByTestId('ev-organizer-new-event'))
    // novi event ide na org (ne-osobni) account
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/events/organizer-event',
      params: { account: 'acc-org' },
    })

    fireEvent.press(getByTestId('ev-organizer-scanner'))
    expect(mockPush).toHaveBeenCalledWith('/events/scanner')
  })

  it('shows an authoritative rejection with a change-token action', async () => {
    mockOverview.mockResolvedValue({ kind: 'rejected', code: 'not_authenticated' })
    const { getByTestId, getByText } = render(<MojDogadjaji />)

    await waitFor(() => expect(getByTestId('ev-organizer-rejected')).toBeTruthy())
    expect(getByText(evStrings.organizer.rejected.not_authenticated)).toBeTruthy()

    fireEvent.press(getByTestId('ev-organizer-change-token'))
    expect(getByTestId('ev-organizer-token-gate')).toBeTruthy()
  })

  it('offers a retry when the backend is unreachable', async () => {
    mockOverview.mockResolvedValueOnce({ kind: 'unreachable' })
    const { getByTestId } = render(<MojDogadjaji />)

    await waitFor(() => expect(getByTestId('ev-organizer-unreachable')).toBeTruthy())
    mockOverview.mockResolvedValueOnce({ kind: 'ok', data: overview() })
    fireEvent.press(getByTestId('ev-organizer-retry'))
    await waitFor(() => expect(getByTestId('ev-organizer-event-c-draft')).toBeTruthy())
  })
})
