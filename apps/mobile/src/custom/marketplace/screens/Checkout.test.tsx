import React from 'react'
import { fireEvent, render } from '@/src/tests/test-utils'
import { Checkout } from './Checkout'
import { mpStrings } from '../strings'
import { testMerchant, TEST_MERCHANT_SAFE } from './testMerchant'
import type { MerchantConfig } from '../catalog/types'
import type { SafeInfo } from '@/src/types/address'

const SAFE_ADDRESS = '0x1111111111111111111111111111111111111111' as `0x${string}`

let mockMerchant: MerchantConfig = testMerchant()

const mockReplace = jest.fn()
const mockParams: jest.Mock<Record<string, string | undefined>> = jest.fn(() => ({}))
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, dismissTo: jest.fn(), push: jest.fn() }),
  useLocalSearchParams: () => mockParams(),
}))

jest.mock('@tamagui/toast', () => ({
  useToastController: () => ({ show: jest.fn() }),
}))

jest.mock('../catalog/registry', () => ({
  getMerchant: () => mockMerchant,
  getProduct: (merchant: MerchantConfig, productId: string | undefined) =>
    merchant.products.find((product) => product.id === productId),
}))

const mockAddOrder = jest.fn()
jest.mock('../state/useOrders', () => ({
  addOrder: (order: unknown) => mockAddOrder(order),
}))

const activeSafe: SafeInfo = { address: SAFE_ADDRESS, chainId: '100' }

const checkoutParams = { merchant: 'test-shop', product: 'model-a', size: 'L', qty: '2' }

const fillBuyer = (getByTestId: (id: string) => unknown) => {
  fireEvent.changeText(getByTestId('mp-checkout-name') as never, 'Ivan Horvat')
  fireEvent.changeText(getByTestId('mp-checkout-street') as never, 'Ilica 1')
  fireEvent.changeText(getByTestId('mp-checkout-city') as never, '10000 Zagreb')
  fireEvent.changeText(getByTestId('mp-checkout-email') as never, 'ivan@example.com')
}

const renderWithSafe = (safe: SafeInfo | null) => render(<Checkout />, { initialStore: { activeSafe: safe } })

describe('Checkout', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockMerchant = testMerchant()
    mockParams.mockReturnValue(checkoutParams)
  })

  it('shows totals with free shipping above the threshold', () => {
    const { getByTestId } = renderWithSafe(activeSafe)

    // 2 × 64.90 = 129.80 ≥ 100 → free shipping
    expect(getByTestId('mp-checkout-total')).toHaveTextContent('129,80 EUR')
    expect(getByTestId('mp-checkout-shipping')).toHaveTextContent(mpStrings.checkout.shippingFree)
  })

  it('charges flat shipping below the threshold', () => {
    mockParams.mockReturnValue({ ...checkoutParams, qty: '1' })

    const { getByTestId } = renderWithSafe(activeSafe)

    expect(getByTestId('mp-checkout-shipping')).toHaveTextContent('4,00 EUR')
    expect(getByTestId('mp-checkout-total')).toHaveTextContent('68,90 EUR')
  })

  it('blocks payment without an active safe', () => {
    const { getByTestId, getByText } = renderWithSafe(null)

    expect(getByText(mpStrings.checkout.noActiveAccount)).toBeTruthy()
    fillBuyer(getByTestId)
    fireEvent.press(getByTestId('mp-checkout-pay'))

    expect(mockAddOrder).not.toHaveBeenCalled()
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('blocks payment when the store has no safe address', () => {
    mockMerchant = testMerchant({ safeAddress: undefined })

    const { getByTestId, getByText } = renderWithSafe(activeSafe)

    expect(getByText(mpStrings.checkout.storeInactive)).toBeTruthy()
    fillBuyer(getByTestId)
    fireEvent.press(getByTestId('mp-checkout-pay'))

    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('blocks payment until the buyer info is complete', () => {
    const { getByTestId } = renderWithSafe(activeSafe)

    fireEvent.press(getByTestId('mp-checkout-pay'))
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('saves the order locally and hands the total to the Send flow as an EIP-681 prefill', () => {
    const { getByTestId } = renderWithSafe(activeSafe)

    fillBuyer(getByTestId)
    fireEvent.press(getByTestId('mp-checkout-pay'))

    expect(mockAddOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        merchantSlug: 'test-shop',
        items: [{ productId: 'model-a', name: 'Model A', size: 'L', qty: 2, priceEur: '64.90' }],
        totals: { itemsEur: '129.80', shippingEur: '0.00', totalEur: '129.80' },
        payerSafeAddress: SAFE_ADDRESS,
        status: 'pending',
      }),
    )

    expect(mockReplace).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: '/(send)/recipient',
        params: expect.objectContaining({
          scannedAddress: TEST_MERCHANT_SAFE,
          // Default currency: EURe with 18 decimals on Gnosis.
          prefillTokenAddress: '0xcB444e90D8198415266c6a2724b7900fb12FC56E',
          prefillValueRaw: '129800000000000000000',
        }),
      }),
    )
  })
})
