import React from 'react'
import { render } from '@/src/tests/test-utils'
import { tokens } from '@/src/theme/tokens'
import EmptyToken from './EmptyToken'
import EmptyNft from './EmptyNFT'

// react-native-svg serializes fills as ARGB payload numbers
const toSvgPayload = (hex: string) => (0xff000000 + parseInt(hex.slice(1), 16)) >>> 0

describe('NoFunds illustrations', () => {
  it('draws EmptyToken ink from the static palette tokens (brand-overridable)', () => {
    const tree = JSON.stringify(render(<EmptyToken />).toJSON())

    expect(tree).toContain(String(toSvgPayload(tokens.color.staticMainLight.val)))
    expect(tree).toContain(String(toSvgPayload(tokens.color.staticTextSecondaryLight.val)))
  })

  it('draws EmptyNft ink from the static palette tokens (brand-overridable)', () => {
    const tree = JSON.stringify(render(<EmptyNft />).toJSON())

    expect(tree).toContain(String(toSvgPayload(tokens.color.staticTextSecondaryLight.val)))
  })
})
