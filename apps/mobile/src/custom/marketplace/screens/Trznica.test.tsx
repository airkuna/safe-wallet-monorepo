import React from 'react'
import { fireEvent, render } from '@/src/tests/test-utils'
import { Trznica } from './Trznica'
import { mpStrings } from '../strings'

const mockPush = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), dismissTo: jest.fn() }),
}))

jest.mock('../catalog/registry', () => ({
  MERCHANTS: [
    // Inline da izbjegnemo hoisting problem jest.mock factoryja.
    {
      slug: 'test-shop',
      name: 'Test Shop',
      tagline: 'Testne košulje',
      brand: { primaryHex: '#B3202C', accentHex: '#1A1A1A' },
      products: [],
    },
  ],
}))

describe('Trznica', () => {
  beforeEach(() => jest.clearAllMocks())

  it('lists merchants and opens a store', () => {
    const { getByText, getByTestId } = render(<Trznica />)

    expect(getByText(mpStrings.hub.title)).toBeTruthy()
    expect(getByText('Test Shop')).toBeTruthy()

    fireEvent.press(getByTestId('mp-hub-merchant-test-shop'))
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/marketplace/store', params: { merchant: 'test-shop' } })
  })

  it('opens my orders and shows the future-merchant slot', () => {
    const { getByTestId } = render(<Trznica />)

    fireEvent.press(getByTestId('mp-hub-orders'))
    expect(mockPush).toHaveBeenCalledWith('/marketplace/orders')

    expect(getByTestId('mp-hub-your-store')).toBeTruthy()
  })
})
