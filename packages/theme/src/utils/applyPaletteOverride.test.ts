import { applyPaletteOverride } from './applyPaletteOverride'
import lightPalette from '../palettes/light'

describe('applyPaletteOverride', () => {
  it('returns the same palette reference when no override is given', () => {
    expect(applyPaletteOverride(lightPalette)).toBe(lightPalette)
    expect(applyPaletteOverride(lightPalette, {})).toBe(lightPalette)
  })

  it('applies dot-path overrides to a copy', () => {
    const result = applyPaletteOverride(lightPalette, {
      'primary.main': '#0A84FF',
      'text.primary': '#101010',
    })

    expect(result.primary.main).toBe('#0A84FF')
    expect(result.text.primary).toBe('#101010')
    // untouched leaves survive
    expect(result.secondary.main).toBe(lightPalette.secondary.main)
  })

  it('never mutates the input palette', () => {
    const before = JSON.stringify(lightPalette)
    applyPaletteOverride(lightPalette, { 'primary.main': '#0A84FF' })

    expect(JSON.stringify(lightPalette)).toBe(before)
  })

  it('ignores unknown paths instead of throwing', () => {
    const result = applyPaletteOverride(lightPalette, {
      'nope.nothere': '#FF0000',
      'primary.unknownLeaf': '#FF0000',
      primary: '#FF0000', // points at a group, not a color leaf
      'primary.main.too.deep': '#FF0000',
    })

    expect(result).toEqual(lightPalette)
  })
})
