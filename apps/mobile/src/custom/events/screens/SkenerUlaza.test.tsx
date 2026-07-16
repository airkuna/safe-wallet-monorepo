import React from 'react'
import { act, fireEvent, render, waitFor } from '@/src/tests/test-utils'
import { SkenerUlaza } from './SkenerUlaza'
import { evStrings } from '../strings'
import type { CheckinResult } from '../api/types'
import { buildTicketQrPayload } from '../logic/qrPayload'
import { clearEntryLogForTesting } from '../state/useEntryLog'
import { clearScannerToken, setScannerToken } from '../state/useScannerAuth'

const TOKEN = 'ab'.repeat(32)
const PAYLOAD = buildTicketQrPayload(TOKEN) as string

type ScanHandler = (codes: { value?: string }[]) => void
let latestOnScan: ScanHandler | null = null

jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => void | (() => void)) => {
    const { useEffect } = jest.requireActual<typeof import('react')>('react')
    useEffect(callback, [callback])
  },
}))

jest.mock('@/src/components/Camera', () => {
  const ReactActual = jest.requireActual<typeof import('react')>('react')
  const { View: RNView, Text: RNText, Pressable } = jest.requireActual<typeof import('react-native')>('react-native')
  return {
    QrCamera: (props: {
      onScan: ScanHandler
      footer: React.ReactNode
      heading?: React.ReactNode
      centerOverlay?: React.ReactNode
    }) => {
      latestOnScan = props.onScan
      return ReactActual.createElement(
        RNView,
        { testID: 'ev-fake-camera' },
        typeof props.heading === 'string' ? ReactActual.createElement(RNText, null, props.heading) : props.heading,
        props.centerOverlay ?? null,
        props.footer,
      )
    },
    ScanErrorOverlay: (props: { message: string; onTryAgain: () => void; testID?: string }) =>
      ReactActual.createElement(
        RNView,
        null,
        ReactActual.createElement(RNText, { testID: 'ev-scan-error-message' }, props.message),
        ReactActual.createElement(Pressable, { testID: props.testID, onPress: props.onTryAgain }),
      ),
    useCameraPermissionFlow: () => ({
      permission: 'granted',
      requestPermission: jest.fn(),
      openSettings: jest.fn(),
    }),
  }
})

let mockConfigured = true
jest.mock('../api/config', () => ({
  isEventsBackendConfigured: () => mockConfigured,
}))

const mockCheckin = jest.fn<Promise<CheckinResult>, [string, string]>()
jest.mock('../api/client', () => ({
  checkinTicket: (qrToken: string, authToken: string) => mockCheckin(qrToken, authToken),
}))

// Namjerno se NE mocka resolveScannedAddress: skener ga uopće ne importa —
// format se odbija u parseTicketQrPayload, payment choke-point ostaje netaknut.

const scan = (value: string) => {
  expect(latestOnScan).not.toBeNull()
  act(() => {
    latestOnScan?.([{ value }])
  })
}

describe('SkenerUlaza', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    latestOnScan = null
    mockConfigured = true
    clearEntryLogForTesting()
    clearScannerToken()
  })

  it('is unavailable without a configured events backend (online-only MVP)', () => {
    mockConfigured = false
    const { getByTestId } = render(<SkenerUlaza />)
    expect(getByTestId('ev-scanner-unavailable')).toBeTruthy()
  })

  it('gates the camera behind the organizer access token', () => {
    const { getByTestId, queryByTestId } = render(<SkenerUlaza />)
    expect(getByTestId('ev-scanner-token-gate')).toBeTruthy()
    expect(queryByTestId('ev-fake-camera')).toBeNull()

    fireEvent.changeText(getByTestId('ev-scanner-token-input'), ' jwt-org-admina ')
    fireEvent.press(getByTestId('ev-scanner-token-save'))

    expect(getByTestId('ev-fake-camera')).toBeTruthy()
  })

  it('rejects payment/address QR formats without ever calling the check-in API', () => {
    setScannerToken('jwt-org-admina')
    const { getByTestId } = render(<SkenerUlaza />)

    scan('gno:0x1111111111111111111111111111111111111111')

    expect(getByTestId('ev-scan-error-message')).toHaveTextContent(evStrings.scanner.invalidFormat)
    expect(mockCheckin).not.toHaveBeenCalled()

    // Try again vraća skeniranje
    fireEvent.press(getByTestId('ev-scanner-try-again'))
    expect(getByTestId('ev-fake-camera')).toBeTruthy()
  })

  it('shows the big OK result with holder, tier and entry counter on first scan', async () => {
    setScannerToken('jwt-org-admina')
    mockCheckin.mockResolvedValue({
      kind: 'ok',
      response: {
        status: 'checked_in',
        serial: 'MOM-000001',
        holder_name: 'Ana Anić',
        tier_title: 'Regular',
        checked_in_at: '2027-03-10T09:00:00Z',
        checked_in_count: 7,
      },
    })
    const { getByTestId } = render(<SkenerUlaza />)

    scan(PAYLOAD)

    await waitFor(() => expect(getByTestId('ev-scanner-result')).toBeTruthy())
    expect(mockCheckin).toHaveBeenCalledWith(TOKEN, 'jwt-org-admina')
    expect(getByTestId('ev-scanner-result-icon')).toHaveTextContent('✅')
    expect(getByTestId('ev-scanner-result-title')).toHaveTextContent(evStrings.scanner.resultOk)
    expect(getByTestId('ev-scanner-result-holder')).toHaveTextContent('Ana Anić')
    expect(getByTestId('ev-scanner-result-tier')).toHaveTextContent('Regular')
    expect(getByTestId('ev-scanner-entry-count')).toHaveTextContent(`${evStrings.scanner.entryCounter}: 7`)
  })

  it('blocks the second scan of the same token locally (anti-double-entry pre-check)', async () => {
    setScannerToken('jwt-org-admina')
    mockCheckin.mockResolvedValue({
      kind: 'ok',
      response: { status: 'checked_in', serial: 'MOM-000001', holder_name: 'Ana Anić', checked_in_count: 1 },
    })
    const { getByTestId } = render(<SkenerUlaza />)

    scan(PAYLOAD)
    await waitFor(() => expect(getByTestId('ev-scanner-result')).toBeTruthy())
    fireEvent.press(getByTestId('ev-scanner-next'))

    scan(PAYLOAD)
    await waitFor(() => expect(getByTestId('ev-scanner-result')).toBeTruthy())

    // backend pozvan samo jednom — duplikat je uhvaćen lokalno
    expect(mockCheckin).toHaveBeenCalledTimes(1)
    expect(getByTestId('ev-scanner-result-icon')).toHaveTextContent('⛔')
    expect(getByTestId('ev-scanner-result-title')).toHaveTextContent(evStrings.scanner.resultDuplicate)
    expect(getByTestId('ev-scanner-result-first-entry')).toBeTruthy()
  })

  it('surfaces the server already_checked_in verdict with first-entry details', async () => {
    setScannerToken('jwt-org-admina')
    mockCheckin.mockResolvedValue({
      kind: 'ok',
      response: {
        status: 'already_checked_in',
        serial: 'MOM-000001',
        holder_name: 'Ana Anić',
        checked_in_at: '2027-03-10T09:00:00Z',
        checked_in_by_email: 'admin@momo.test',
        checked_in_count: 12,
      },
    })
    const { getByTestId, getByText } = render(<SkenerUlaza />)

    scan(PAYLOAD)
    await waitFor(() => expect(getByTestId('ev-scanner-result')).toBeTruthy())

    expect(getByTestId('ev-scanner-result-icon')).toHaveTextContent('⛔')
    expect(getByTestId('ev-scanner-result-first-entry')).toBeTruthy()
    expect(getByText(`${evStrings.scanner.scannedBy}: admin@momo.test`)).toBeTruthy()
  })

  it('shows the authoritative rejection for a non-admin token', async () => {
    setScannerToken('jwt-ne-admina')
    mockCheckin.mockResolvedValue({ kind: 'rejected', code: 'not_authorized' })
    const { getByTestId } = render(<SkenerUlaza />)

    scan(PAYLOAD)
    await waitFor(() => expect(getByTestId('ev-scanner-result')).toBeTruthy())

    expect(getByTestId('ev-scanner-result-icon')).toHaveTextContent('⛔')
    expect(getByTestId('ev-scanner-result-message')).toHaveTextContent(evStrings.scanner.rejected.not_authorized)
  })

  it('never honours a scan without server confirmation (offline)', async () => {
    setScannerToken('jwt-org-admina')
    mockCheckin.mockResolvedValue({ kind: 'unreachable' })
    const { getByTestId } = render(<SkenerUlaza />)

    scan(PAYLOAD)
    await waitFor(() => expect(getByTestId('ev-scanner-result')).toBeTruthy())

    expect(getByTestId('ev-scanner-result-icon')).toHaveTextContent('⛔')
    expect(getByTestId('ev-scanner-result-message')).toHaveTextContent(evStrings.scanner.offline)
    // offline sken NIJE ušao u brojač
    expect(getByTestId('ev-scanner-entry-count')).toHaveTextContent(`${evStrings.scanner.entryCounter}: 0`)
  })
})
