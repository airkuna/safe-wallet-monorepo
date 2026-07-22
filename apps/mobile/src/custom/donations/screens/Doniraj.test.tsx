import React from 'react'
import { fireEvent, render, waitFor } from '@/src/tests/test-utils'
import { Doniraj } from './Doniraj'
import { donStrings } from '../strings'
import { DONATION_CURRENCY } from '../logic/donationAmount'
import type { CampaignResult, PinkaCampaignRow } from '../api/types'
import type { DonationRecord } from '../state/useDonations'
import type { SafeInfo } from '@/src/types/address'

const SAFE_ADDRESS = '0x1111111111111111111111111111111111111111' as `0x${string}`
const CAMPAIGN_SAFE = '0x2222222222222222222222222222222222222222'

const mockReplace = jest.fn()
const mockParams: jest.Mock<Record<string, string | undefined>> = jest.fn(() => ({}))
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, dismissTo: jest.fn(), push: jest.fn() }),
  useLocalSearchParams: () => mockParams(),
}))

jest.mock('@tamagui/toast', () => ({
  useToastController: () => ({ show: jest.fn() }),
}))

const campaignRow = (overrides: Partial<PinkaCampaignRow> = {}): PinkaCampaignRow => ({
  id: 'c1',
  slug: 'moj-kanal-podrska',
  type: 'donation',
  title: 'Podrška kanalu',
  description: 'Opis kampanje.',
  goal_cents: 100000,
  min_contribution_cents: 500,
  currency: 'eur',
  cover_image_url: null,
  state: 'active',
  destination_address: CAMPAIGN_SAFE,
  chain: 'gnosis',
  youtube_channel_id: null,
  total_raised_cents: 12500,
  contribution_count: 3,
  contributor_count: 2,
  ...overrides,
})

const mockFetchCampaign = jest.fn<Promise<CampaignResult>, [string]>()
jest.mock('../api/pinkaClient', () => ({
  fetchActiveCampaign: (slug: string) => mockFetchCampaign(slug),
}))

jest.mock('../api/config', () => ({
  isDonationsBackendConfigured: () => true,
}))

const mockRecordDonation = jest.fn<Promise<unknown>, [unknown]>(() => Promise.resolve({}))
jest.mock('../api/useDonationSync', () => ({
  recordDonation: (input: unknown) => mockRecordDonation(input),
  useDonationSync: () => ({ syncing: false, refresh: jest.fn() }),
}))

let mockRecords: DonationRecord[] = []
jest.mock('../state/useDonations', () => ({
  useDonationRecords: () => mockRecords,
}))

const activeSafe: SafeInfo = { address: SAFE_ADDRESS, chainId: '100' }

const renderWithSafe = (safe: SafeInfo | null) => render(<Doniraj />, { initialStore: { activeSafe: safe } })

describe('Doniraj', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockParams.mockReturnValue({})
    mockRecords = []
    mockFetchCampaign.mockResolvedValue({ kind: 'ok', campaign: campaignRow() })
  })

  it('finds the campaign by slug and shows its details', async () => {
    const { getByTestId, findByTestId } = renderWithSafe(activeSafe)

    fireEvent.changeText(getByTestId('don-slug-input'), 'moj-kanal')
    fireEvent.press(getByTestId('don-find'))

    expect(await findByTestId('don-campaign-title')).toHaveTextContent('Podrška kanalu')
    expect(getByTestId('don-campaign-raised')).toHaveTextContent('125,00 EUR')
    expect(mockFetchCampaign).toHaveBeenCalledWith('moj-kanal')
  })

  it('extracts the slug from a pasted donation link', async () => {
    const { getByTestId, findByTestId } = renderWithSafe(activeSafe)

    fireEvent.changeText(getByTestId('don-slug-input'), 'https://domovina.ai/c/moj-kanal/doniraj')
    fireEvent.press(getByTestId('don-find'))

    await findByTestId('don-campaign')
    expect(mockFetchCampaign).toHaveBeenCalledWith('moj-kanal')
  })

  it('prefills and fetches from the slug route param (scanner / deep link)', async () => {
    mockParams.mockReturnValue({ slug: 'skenirani-kanal' })

    const { findByTestId } = renderWithSafe(activeSafe)

    await findByTestId('don-campaign')
    expect(mockFetchCampaign).toHaveBeenCalledWith('skenirani-kanal')
  })

  it('shows the authoritative not-found message', async () => {
    mockFetchCampaign.mockResolvedValue({ kind: 'not_found' })
    const { getByTestId, findByTestId } = renderWithSafe(activeSafe)

    fireEvent.changeText(getByTestId('don-slug-input'), 'bez-kampanje')
    fireEvent.press(getByTestId('don-find'))

    expect(await findByTestId('don-not-found')).toBeTruthy()
  })

  it('shows the unreachable message on a network failure', async () => {
    mockFetchCampaign.mockResolvedValue({ kind: 'unreachable' })
    const { getByTestId, findByTestId } = renderWithSafe(activeSafe)

    fireEvent.changeText(getByTestId('don-slug-input'), 'moj-kanal')
    fireEvent.press(getByTestId('don-find'))

    expect(await findByTestId('don-unreachable')).toBeTruthy()
  })

  it('records the donation and hands the EURe transfer to the Send flow', async () => {
    const { getByTestId, findByTestId } = renderWithSafe(activeSafe)

    fireEvent.changeText(getByTestId('don-slug-input'), 'moj-kanal')
    fireEvent.press(getByTestId('don-find'))
    await findByTestId('don-campaign')

    fireEvent.changeText(getByTestId('don-amount-input'), '25')
    fireEvent.press(getByTestId('don-donate'))

    await waitFor(() => expect(mockRecordDonation).toHaveBeenCalled())
    expect(mockRecordDonation).toHaveBeenCalledWith({
      slug: 'moj-kanal',
      campaignId: 'c1',
      campaignTitle: 'Podrška kanalu',
      destinationAddress: CAMPAIGN_SAFE,
      amountCents: 2500,
    })

    expect(mockReplace).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: '/(send)/recipient',
        params: expect.objectContaining({
          scannedAddress: CAMPAIGN_SAFE,
          prefillTokenAddress: DONATION_CURRENCY.tokenAddress,
          // 25 EUR = 2500 centi × 1e16 wei
          prefillValueRaw: '25000000000000000000',
        }),
      }),
    )
  })

  it('blocks amounts below the campaign minimum', async () => {
    const { getByTestId, findByTestId } = renderWithSafe(activeSafe)

    fireEvent.changeText(getByTestId('don-slug-input'), 'moj-kanal')
    fireEvent.press(getByTestId('don-find'))
    await findByTestId('don-campaign')

    fireEvent.changeText(getByTestId('don-amount-input'), '1')
    expect(await findByTestId('don-below-min')).toHaveTextContent(/5,00 EUR/)

    fireEvent.press(getByTestId('don-donate'))
    expect(mockRecordDonation).not.toHaveBeenCalled()
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('blocks donating without an active safe', async () => {
    const { getByTestId, findByTestId, getByText } = renderWithSafe(null)

    fireEvent.changeText(getByTestId('don-slug-input'), 'moj-kanal')
    fireEvent.press(getByTestId('don-find'))
    await findByTestId('don-campaign')

    expect(getByText(donStrings.screen.noActiveAccount)).toBeTruthy()
    fireEvent.changeText(getByTestId('don-amount-input'), '25')
    fireEvent.press(getByTestId('don-donate'))

    expect(mockRecordDonation).not.toHaveBeenCalled()
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('explains when the campaign has no onchain destination', async () => {
    mockFetchCampaign.mockResolvedValue({ kind: 'ok', campaign: campaignRow({ destination_address: null }) })
    const { getByTestId, findByTestId, queryByTestId } = renderWithSafe(activeSafe)

    fireEvent.changeText(getByTestId('don-slug-input'), 'moj-kanal')
    fireEvent.press(getByTestId('don-find'))

    expect(await findByTestId('don-no-onchain')).toBeTruthy()
    expect(queryByTestId('don-amount-input')).toBeNull()
  })

  it('lists local donations with their status', () => {
    mockRecords = [
      {
        id: 'don-1',
        slug: 'moj-kanal',
        campaignId: 'c1',
        campaignTitle: 'Podrška kanalu',
        destinationAddress: CAMPAIGN_SAFE,
        amountCents: 2500,
        txHash: `0x${'ab'.repeat(32)}`,
        confirmed: true,
        createdAtMs: 1,
      },
      {
        id: 'don-2',
        slug: 'moj-kanal',
        campaignId: 'c1',
        campaignTitle: 'Podrška kanalu',
        destinationAddress: CAMPAIGN_SAFE,
        amountCents: 1000,
        createdAtMs: 2,
      },
    ]

    const { getByTestId, getByText } = renderWithSafe(activeSafe)

    expect(getByText(donStrings.history.title)).toBeTruthy()
    expect(getByTestId('don-record-don-1')).toHaveTextContent(new RegExp(donStrings.history.status.confirmed))
    expect(getByTestId('don-record-don-2')).toHaveTextContent(new RegExp(donStrings.history.status.initiated))
  })
})
