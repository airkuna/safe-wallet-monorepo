import React from 'react'
import { fireEvent, render } from '@/src/tests/test-utils'
import { AddToAddressBookModal } from './AddToAddressBookModal'
import type { SafeInfo } from '@/src/types/address'

const ADDRESS = '0x1f9090aaE28b8a3dCeaDf281B0F12828e676c326'
const SAFE_ADDRESS = '0x1111111111111111111111111111111111111111' as `0x${string}`

const activeSafe: SafeInfo = { address: SAFE_ADDRESS, chainId: '1' }

const renderModal = (props: { visible?: boolean; suggestedName?: string } = {}) =>
  render(
    <AddToAddressBookModal
      visible={props.visible ?? true}
      address={ADDRESS}
      suggestedName={props.suggestedName}
      onClose={jest.fn()}
      onSaved={jest.fn()}
    />,
    { initialStore: { activeSafe } },
  )

describe('AddToAddressBookModal', () => {
  it('starts with an empty name when no suggestion is passed (unchanged default)', () => {
    const { getByTestId } = renderModal()

    expect(getByTestId('contact-name-input').props.value).toBe('')
  })

  it('prefills the name with the suggested contact name', () => {
    const { getByTestId } = renderModal({ suggestedName: '@ana' })

    expect(getByTestId('contact-name-input').props.value).toBe('@ana')
  })

  it('keeps the suggestion editable', () => {
    const { getByTestId } = renderModal({ suggestedName: '@ana' })

    fireEvent.changeText(getByTestId('contact-name-input'), 'Ana K')

    expect(getByTestId('contact-name-input').props.value).toBe('Ana K')
  })
})
