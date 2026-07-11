import React from 'react'
import { fireEvent, render } from '@/src/tests/test-utils'
import { ProductDetail } from './ProductDetail'
import { testMerchant } from './testMerchant'
import type { MerchantConfig } from '../catalog/types'

const mockPush = jest.fn()
const mockParams: jest.Mock<Record<string, string | undefined>> = jest.fn(() => ({}))
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), dismissTo: jest.fn() }),
  useLocalSearchParams: () => mockParams(),
}))

const mockMerchant = testMerchant()
jest.mock('../catalog/registry', () => ({
  getMerchant: () => mockMerchant,
  getProduct: (merchant: MerchantConfig, productId: string | undefined) =>
    merchant.products.find((product) => product.id === productId),
}))

describe('ProductDetail', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockParams.mockReturnValue({ merchant: 'test-shop', product: 'model-a' })
  })

  it('renders name, price and description', () => {
    const { getByText } = render(<ProductDetail />)

    expect(getByText('Model A')).toBeTruthy()
    expect(getByText(/64,90 EUR/)).toBeTruthy()
    expect(getByText('Testna košulja A')).toBeTruthy()
  })

  it('does not order until a size is selected', () => {
    const { getByTestId } = render(<ProductDetail />)

    fireEvent.press(getByTestId('mp-product-order'))
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('clamps quantity between 1 and 9', () => {
    const { getByTestId } = render(<ProductDetail />)

    fireEvent.press(getByTestId('mp-product-qty-minus'))
    expect(getByTestId('mp-product-qty')).toHaveTextContent('1')

    fireEvent.press(getByTestId('mp-product-qty-plus'))
    fireEvent.press(getByTestId('mp-product-qty-plus'))
    expect(getByTestId('mp-product-qty')).toHaveTextContent('3')
  })

  it('routes to checkout with merchant, product, size and quantity', () => {
    const { getByTestId } = render(<ProductDetail />)

    fireEvent.press(getByTestId('mp-product-size-L'))
    fireEvent.press(getByTestId('mp-product-qty-plus'))
    fireEvent.press(getByTestId('mp-product-order'))

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/marketplace/checkout',
      params: { merchant: 'test-shop', product: 'model-a', size: 'L', qty: '2' },
    })
  })

  it('renders nothing for an unknown product', () => {
    mockParams.mockReturnValue({ merchant: 'test-shop', product: 'nepostojeci' })

    const { queryByTestId } = render(<ProductDetail />)
    expect(queryByTestId('mp-product-screen')).toBeNull()
  })
})
