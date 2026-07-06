import {
  generateTamaguiColorTokens,
  generateTamaguiTokens,
  generateTamaguiThemes,
  generateTamaguiFontSizes,
} from './tamagui'

describe('generateTamaguiColorTokens', () => {
  it('should return flattened color tokens with Light and Dark suffixes', () => {
    const tokens = generateTamaguiColorTokens()

    // Check for light mode colors
    expect(tokens).toHaveProperty('textPrimaryLight')
    expect(tokens).toHaveProperty('backgroundMainLight')

    // Check for dark mode colors
    expect(tokens).toHaveProperty('textPrimaryDark')
    expect(tokens).toHaveProperty('backgroundMainDark')
  })

  it('should have correct light mode values', () => {
    const tokens = generateTamaguiColorTokens()

    expect(tokens.textPrimaryLight).toBe('#121312')
    expect(tokens.primaryMainLight).toBe('#121312')
  })

  it('should have correct dark mode values', () => {
    const tokens = generateTamaguiColorTokens()

    expect(tokens.textPrimaryDark).toBe('#FFFFFF')
    expect(tokens.primaryMainDark).toBe('#12FF80')
  })
})

describe('generateTamaguiTokens', () => {
  it('should return complete token structure', () => {
    const tokens = generateTamaguiTokens()

    expect(tokens).toHaveProperty('color')
    expect(tokens).toHaveProperty('space')
    expect(tokens).toHaveProperty('size')
    expect(tokens).toHaveProperty('radius')
  })

  it('should include default values (true keys)', () => {
    const tokens = generateTamaguiTokens()

    expect(tokens.space.true).toBeDefined()
    expect(tokens.size.true).toBeDefined()
    expect(tokens.radius.true).toBeDefined()
  })

  it('should have mobile spacing values', () => {
    const tokens = generateTamaguiTokens()

    expect(tokens.space.$1).toBe(4)
    expect(tokens.space.$2).toBe(8)
    expect(tokens.space.$4).toBe(16)
  })
})

describe('generateTamaguiThemes', () => {
  it('should return light and dark theme objects', () => {
    const themes = generateTamaguiThemes()

    expect(themes).toHaveProperty('light')
    expect(themes).toHaveProperty('dark')
  })

  it('should have flattened color tokens in themes', () => {
    const themes = generateTamaguiThemes()

    expect(themes.light).toHaveProperty('textPrimaryLight')
    expect(themes.dark).toHaveProperty('textPrimaryDark')
  })
})

describe('palette overrides', () => {
  it('is byte-identical without an override (backcompat)', () => {
    expect(generateTamaguiColorTokens(undefined)).toEqual(generateTamaguiColorTokens())
    expect(generateTamaguiColorTokens({})).toEqual(generateTamaguiColorTokens())
    expect(generateTamaguiThemes({})).toEqual(generateTamaguiThemes())
  })

  it('applies per-mode overrides to color tokens', () => {
    const tokens = generateTamaguiColorTokens({
      light: { 'primary.main': '#0A84FF' },
      dark: { 'primary.main': '#FF9F0A' },
    })

    expect(tokens.primaryMainLight).toBe('#0A84FF')
    expect(tokens.primaryMainDark).toBe('#FF9F0A')
    // untouched tokens keep stock values
    expect(tokens.textPrimaryLight).toBe('#121312')
    expect(tokens.textPrimaryDark).toBe('#FFFFFF')
  })

  it('applies per-mode overrides to themes', () => {
    const themes = generateTamaguiThemes({ dark: { 'text.primary': '#EEEEEE' } })

    expect(themes.dark.textPrimaryDark).toBe('#EEEEEE')
    expect(themes.light.textPrimaryLight).toBe('#121312')
  })

  it('ignores unknown override keys', () => {
    expect(generateTamaguiColorTokens({ light: { 'not.a.key': '#FF0000' } })).toEqual(generateTamaguiColorTokens())
  })
})

describe('generateTamaguiFontSizes', () => {
  it('should return font size scale', () => {
    const fontSizes = generateTamaguiFontSizes()

    expect(fontSizes[1]).toBe(11)
    expect(fontSizes[4]).toBe(14)
    expect(fontSizes[5]).toBe(16)
  })

  it('should include default value (true key)', () => {
    const fontSizes = generateTamaguiFontSizes()

    expect(fontSizes.true).toBe(14)
  })

  it('should include size variants', () => {
    const fontSizes = generateTamaguiFontSizes()

    expect(fontSizes.$sm).toBe(14)
    expect(fontSizes.$md).toBe(14)
    expect(fontSizes.$xl).toBe(14)
  })
})
