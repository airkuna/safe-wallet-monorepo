import React from 'react'
import { fireEvent, render, waitFor } from '@/src/tests/test-utils'
import { MojDogadjaj } from './MojDogadjaj'
import { evStrings } from '../strings'
import type {
  CreateOrganizerEventInput,
  OrganizerEvent,
  OrganizerOverview,
  OrganizerResult,
  PublishOrganizerEventResponse,
  UpdateOrganizerEventInput,
} from '../api/types'
import type { SafeInfo } from '@/src/types/address'

const SAFE_ADDRESS = '0x1111111111111111111111111111111111111111' as `0x${string}`

const mockReplace = jest.fn()
const mockParams: jest.Mock<Record<string, string | undefined>> = jest.fn(() => ({}))
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => mockParams(),
  useFocusEffect: (callback: () => void) => {
    const { useEffect } = jest.requireActual<typeof import('react')>('react')
    useEffect(callback, [callback])
  },
}))

jest.mock('../api/config', () => ({
  isEventsBackendConfigured: () => true,
}))

let mockToken: string | undefined = 'jwt-org-admina'
jest.mock('../state/useScannerAuth', () => ({
  useScannerToken: () => mockToken,
  setScannerToken: jest.fn(),
}))

const mockOverview = jest.fn<Promise<OrganizerResult<OrganizerOverview>>, [string]>()
const mockCreate = jest.fn<Promise<OrganizerResult<{ id: string }>>, [CreateOrganizerEventInput, string]>()
const mockUpdate = jest.fn<Promise<OrganizerResult<{ updated: boolean }>>, [UpdateOrganizerEventInput, string]>()
const mockPublish = jest.fn<Promise<OrganizerResult<PublishOrganizerEventResponse>>, [string, string, string]>()
jest.mock('../api/client', () => ({
  fetchOrganizerOverview: (token: string) => mockOverview(token),
  createOrganizerEvent: (input: CreateOrganizerEventInput, token: string) => mockCreate(input, token),
  updateOrganizerEvent: (input: UpdateOrganizerEventInput, token: string) => mockUpdate(input, token),
  publishOrganizerEvent: (campaignId: string, target: string, token: string) => mockPublish(campaignId, target, token),
}))

const draftEvent = (overrides?: Partial<OrganizerEvent>): OrganizerEvent => ({
  campaign_id: 'c-draft',
  account_id: 'acc-org',
  slug: 'blocksplit-2027',
  title: 'BlockSplit 2027',
  state: 'draft',
  visibility: 'private',
  destination_address: '0x0000000000000000000000000000000000000000',
  event: {
    event_type: 'kamp',
    venue_name: 'MEDILS',
    venue_city: 'Split',
    starts_at: '2027-07-08T08:00:00Z',
    ends_at: '2027-07-11T20:00:00Z',
    description_hr: 'Unconference camp.',
  },
  tiers: [{ id: 'tier-1', title: 'Stay paket', price_cents: 39900, inventory_total: 40, imenska: true, sort: 0 }],
  ...overrides,
})

const overviewWith = (event: OrganizerEvent): OrganizerOverview => ({
  accounts: [{ id: 'acc-org', name: 'UBIK', is_personal: false, allowlisted: true, has_record: false }],
  events: [event],
})

const activeSafe: SafeInfo = { address: SAFE_ADDRESS, chainId: '100' }
const renderScreen = () => render(<MojDogadjaj />, { initialStore: { activeSafe } })

describe('MojDogadjaj', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockToken = 'jwt-org-admina'
    mockOverview.mockResolvedValue({ kind: 'ok', data: overviewWith(draftEvent()) })
    mockCreate.mockResolvedValue({ kind: 'ok', data: { id: 'novi' } })
    mockUpdate.mockResolvedValue({ kind: 'ok', data: { updated: true } })
    mockPublish.mockResolvedValue({
      kind: 'ok',
      data: { campaign_id: 'c-draft', state: 'active', visibility: 'public' },
    })
  })

  describe('create mode', () => {
    beforeEach(() => mockParams.mockReturnValue({ account: 'acc-org' }))

    it('disables save until the required fields and a valid tier exist', async () => {
      const { getByTestId } = renderScreen()

      expect(getByTestId('ev-organizer-save')).toBeDisabled()

      fireEvent.changeText(getByTestId('ev-organizer-field-title'), 'BlockSplit 2027')
      fireEvent.changeText(getByTestId('ev-organizer-field-venue'), 'MEDILS')
      fireEvent.changeText(getByTestId('ev-organizer-field-city'), 'Split')
      await waitFor(() => expect(getByTestId('ev-organizer-save')).toBeEnabled())

      // nevaljan tier onemogućuje spremanje
      fireEvent.press(getByTestId('ev-organizer-add-tier'))
      expect(getByTestId('ev-organizer-save')).toBeDisabled()
      fireEvent.changeText(getByTestId('ev-organizer-tier-title-0'), 'Stay paket')
      fireEvent.changeText(getByTestId('ev-organizer-tier-price-0'), '399,00')
      await waitFor(() => expect(getByTestId('ev-organizer-save')).toBeEnabled())
    })

    it('creates the event with the org account and tiers, then continues in edit mode', async () => {
      const { getByTestId } = renderScreen()

      fireEvent.changeText(getByTestId('ev-organizer-field-title'), 'BlockSplit 2027')
      fireEvent.changeText(getByTestId('ev-organizer-field-venue'), 'MEDILS')
      fireEvent.changeText(getByTestId('ev-organizer-field-city'), 'Split')
      fireEvent.press(getByTestId('ev-organizer-add-tier'))
      fireEvent.changeText(getByTestId('ev-organizer-tier-title-0'), 'Stay paket')
      fireEvent.changeText(getByTestId('ev-organizer-tier-price-0'), '399.00')
      fireEvent.press(getByTestId('ev-organizer-save'))

      await waitFor(() => expect(mockCreate).toHaveBeenCalled())
      const [input, token] = mockCreate.mock.calls[0]
      expect(token).toBe('jwt-org-admina')
      expect(input.account_id).toBe('acc-org')
      expect(input.title).toBe('BlockSplit 2027')
      expect(input.tiers).toEqual([{ title: 'Stay paket', price_cents: 39900, inventory_total: null, imenska: false }])
      expect(input.event_id).toMatch(/^[0-9a-f-]{36}$/)
      // bez upisane adrese destination se NE šalje (draft s placeholderom)
      expect(input.destination_address).toBeUndefined()
      await waitFor(() =>
        expect(mockReplace).toHaveBeenCalledWith({
          pathname: '/events/organizer-event',
          params: { campaign: input.event_id },
        }),
      )
    })
  })

  describe('edit mode (draft)', () => {
    beforeEach(() => mockParams.mockReturnValue({ campaign: 'c-draft' }))

    it('prefills the form from the backend event and hides the zero placeholder address', async () => {
      const { getByTestId } = renderScreen()

      await waitFor(() => expect(getByTestId('ev-organizer-event-screen')).toBeTruthy())
      expect(getByTestId('ev-organizer-field-title').props.value).toBe('BlockSplit 2027')
      expect(getByTestId('ev-organizer-field-start').props.value).toBe('2027-07-08')
      expect(getByTestId('ev-organizer-tier-price-0').props.value).toBe('399.00')
      expect(getByTestId('ev-organizer-field-destination').props.value).toBe('')
    })

    it('publish is disabled without a Safe address and enabled with one (UI mirror of server gating)', async () => {
      const { getByTestId } = renderScreen()
      await waitFor(() => expect(getByTestId('ev-organizer-publish')).toBeTruthy())

      expect(getByTestId('ev-organizer-publish')).toBeDisabled()
      expect(getByTestId('ev-organizer-publish-hint')).toHaveTextContent(evStrings.organizer.publishHintNoSafe)

      fireEvent.press(getByTestId('ev-organizer-use-active-safe'))
      await waitFor(() => expect(getByTestId('ev-organizer-publish')).toBeEnabled())

      fireEvent.press(getByTestId('ev-organizer-publish'))
      await waitFor(() => expect(mockPublish).toHaveBeenCalledWith('c-draft', 'active', 'jwt-org-admina'))
    })

    it('shows the allowlist rejection from the server verbatim', async () => {
      mockPublish.mockResolvedValue({ kind: 'rejected', code: 'organizer_not_allowlisted' })
      const { getByTestId } = renderScreen()
      await waitFor(() => expect(getByTestId('ev-organizer-publish')).toBeTruthy())

      fireEvent.press(getByTestId('ev-organizer-use-active-safe'))
      await waitFor(() => expect(getByTestId('ev-organizer-publish')).toBeEnabled())
      fireEvent.press(getByTestId('ev-organizer-publish'))

      await waitFor(() =>
        expect(getByTestId('ev-organizer-notice')).toHaveTextContent(
          evStrings.organizer.rejected.organizer_not_allowlisted,
        ),
      )
    })

    it('saves edits through update with existing tier ids', async () => {
      const { getByTestId } = renderScreen()
      await waitFor(() => expect(getByTestId('ev-organizer-event-screen')).toBeTruthy())

      fireEvent.changeText(getByTestId('ev-organizer-field-title'), 'BlockSplit 2027 — novo')
      fireEvent.press(getByTestId('ev-organizer-save'))

      await waitFor(() => expect(mockUpdate).toHaveBeenCalled())
      const [input] = mockUpdate.mock.calls[0]
      expect(input.campaign_id).toBe('c-draft')
      expect(input.title).toBe('BlockSplit 2027 — novo')
      expect(input.tiers?.[0]).toMatchObject({ id: 'tier-1', price_cents: 39900, imenska: true })
    })
  })

  describe('edit mode (active)', () => {
    beforeEach(() => {
      mockParams.mockReturnValue({ campaign: 'c-active' })
      mockOverview.mockResolvedValue({
        kind: 'ok',
        data: overviewWith(
          draftEvent({
            campaign_id: 'c-active',
            state: 'active',
            visibility: 'public',
            destination_address: SAFE_ADDRESS,
          }),
        ),
      })
    })

    it('shows the promo deep link + QR and shares it', async () => {
      const { getByTestId } = renderScreen()

      await waitFor(() => expect(getByTestId('ev-organizer-promo-qr')).toBeTruthy())
      expect(getByTestId('ev-organizer-promo-link')).toHaveTextContent(/:\/\/events\/event\?event=blocksplit-2027$/)
      expect(getByTestId('ev-organizer-share')).toBeTruthy()
    })

    it('locks price and imenska of existing tiers and offers closing the sale', async () => {
      const { getByTestId } = renderScreen()
      await waitFor(() => expect(getByTestId('ev-organizer-event-screen')).toBeTruthy())

      expect(getByTestId('ev-organizer-tier-price-0').props.editable).toBe(false)
      expect(getByTestId('ev-organizer-tier-imenska-0').props.disabled).toBe(true)

      fireEvent.press(getByTestId('ev-organizer-close'))
      await waitFor(() => expect(mockPublish).toHaveBeenCalledWith('c-active', 'closed', 'jwt-org-admina'))
    })
  })

  it('shows the token gate without a saved access token', () => {
    mockParams.mockReturnValue({ account: 'acc-org' })
    mockToken = undefined
    const { getByTestId } = renderScreen()
    expect(getByTestId('ev-organizer-event-token-gate')).toBeTruthy()
  })
})
