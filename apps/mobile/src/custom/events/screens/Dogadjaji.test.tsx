import React from 'react'
import { fireEvent, render } from '@/src/tests/test-utils'
import { Dogadjaji } from './Dogadjaji'
import { evStrings } from '../strings'

const mockPush = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), dismissTo: jest.fn() }),
}))

const mockRefresh = jest.fn<Promise<boolean>, []>(() => Promise.resolve(true))
jest.mock('../catalog/backendSource', () => ({
  refreshEventCatalog: () => mockRefresh(),
  useEventCatalog: () => [
    // Inline da izbjegnemo hoisting problem jest.mock factoryja.
    {
      slug: 'test-conf',
      naziv: 'Test Conf',
      opisHr: 'Testna konferencija.',
      tip: 'konferencija',
      startIso: '2027-03-10',
      endIso: '2027-03-11',
      venue: { naziv: 'Testni velesajam', grad: 'Zagreb' },
      organizer: { naziv: 'Test Org', email: 'org@test.hr' },
      tiers: [],
    },
    {
      slug: 'najava',
      naziv: 'Najavljeni event',
      opisHr: 'Bez termina.',
      tip: 'kamp',
      venue: { naziv: 'Split', grad: 'Split' },
      organizer: { naziv: 'Org', email: 'o@o.hr' },
      tiers: [],
    },
  ],
}))

describe('Dogadjaji', () => {
  beforeEach(() => jest.clearAllMocks())

  it('lists events with dates and opens the detail', () => {
    const { getByText, getByTestId } = render(<Dogadjaji />)

    expect(getByText(evStrings.hub.title)).toBeTruthy()
    expect(getByText('Test Conf')).toBeTruthy()
    expect(getByText(/10\.–11\.3\.2027\./)).toBeTruthy()

    fireEvent.press(getByTestId('ev-hub-event-test-conf'))
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/events/event', params: { event: 'test-conf' } })
  })

  it('shows "uskoro" for events without a date', () => {
    const { getByText } = render(<Dogadjaji />)
    expect(getByText(new RegExp(evStrings.hub.announced))).toBeTruthy()
  })

  it('opens my tickets and the organizer self-service (tap) / scanner (long-press)', () => {
    const { getByTestId } = render(<Dogadjaji />)

    fireEvent.press(getByTestId('ev-hub-tickets'))
    expect(mockPush).toHaveBeenCalledWith('/events/tickets')

    fireEvent.press(getByTestId('ev-hub-your-event'))
    expect(mockPush).toHaveBeenCalledWith('/events/organizer')

    fireEvent(getByTestId('ev-hub-your-event'), 'longPress')
    expect(mockPush).toHaveBeenCalledWith('/events/scanner')
  })

  it('refreshes the backend catalog via pull-to-refresh', async () => {
    const { getByTestId } = render(<Dogadjaji />)

    const refreshControl = getByTestId('ev-hub-screen').props.refreshControl
    expect(refreshControl).toBeTruthy()
    await refreshControl.props.onRefresh()
    expect(mockRefresh).toHaveBeenCalled()
  })
})
