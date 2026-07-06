import React from 'react'
import { render } from '@/src/tests/test-utils'
import { tokens } from '@/src/theme/tokens'
import { Loader } from './Loader'

// react-native-svg serializes colors as ARGB payload numbers
const toSvgPayload = (hex: string) => (0xff000000 + parseInt(hex.slice(1), 16)) >>> 0

describe('Loader', () => {
  it('defaults to the brand color token (static.textBrand)', () => {
    const tree = JSON.stringify(render(<Loader />).toJSON())

    expect(tree).toContain(String(toSvgPayload(tokens.color.staticTextBrandLight.val)))
  })

  it('still accepts an explicit color', () => {
    const tree = JSON.stringify(render(<Loader color="#FF0000" />).toJSON())

    expect(tree).toContain(String(toSvgPayload('#FF0000')))
  })
})
