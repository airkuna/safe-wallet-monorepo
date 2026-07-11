import React from 'react'
import { fireEvent, render } from '@/src/tests/test-utils'
import { MerchantStore } from './MerchantStore'
import { mpStrings } from '../strings'
import { testMerchant } from './testMerchant'
import type { MerchantConfig } from '../catalog/types'

const mockPush = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), dismissTo: jest.fn() }),
  useLocalSearchParams: () => ({ merchant: 'test-shop' }),
}))

let mockMerchant: MerchantConfig = testMerchant()
jest.mock('../catalog/registry', () => ({
  getMerchant: () => mockMerchant,
}))

describe('MerchantStore', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockMerchant = testMerchant()
  })

  it('renders merchant identity, products and legal info', () => {
    const { getByText, getByTestId, queryByTestId } = render(<MerchantStore />)

    expect(getByText('Test Shop')).toBeTruthy()
    expect(getByText('Model A')).toBeTruthy()
    expect(getByText('Model B')).toBeTruthy()
    expect(getByTestId('mp-store-legal')).toHaveTextContent(/Test d\.o\.o\./)
    expect(getByTestId('mp-store-legal')).toHaveTextContent(/12345678901/)
    expect(queryByTestId('mp-store-not-onchain')).toBeNull()
  })

  it('warns when the store cannot accept in-app payments yet', () => {
    mockMerchant = testMerchant({ safeAddress: undefined })

    const { getByText } = render(<MerchantStore />)
    expect(getByText(mpStrings.store.notOnchain)).toBeTruthy()
  })

  it('opens the product detail on tap', () => {
    const { getByTestId } = render(<MerchantStore />)

    fireEvent.press(getByTestId('mp-store-product-model-a'))

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/marketplace/product',
      params: { merchant: 'test-shop', product: 'model-a' },
    })
  })
})
