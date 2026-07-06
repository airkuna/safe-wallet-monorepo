import { createTokens } from 'tamagui'
import { zIndex } from '@tamagui/themes'
import { generateTamaguiColorTokens, generateTamaguiFontSizes } from '@safe-global/theme/generators/tamagui'
import { radius } from '@safe-global/theme/tokens/radius'
import { spacingMobile } from '@safe-global/theme/tokens/spacing'
import { getBrand } from '@/src/custom/brand'

// Generate color tokens from unified palettes, recolored by the active brand
// (no-op for the default `safe` brand)
const colors = generateTamaguiColorTokens(getBrand().theme)

// Re-export radius for use in other files
export { radius }

// Re-export font sizes
export const fontSizes = generateTamaguiFontSizes()

// Create and export tokens
export const tokens = createTokens({
  color: colors,
  space: {
    ...spacingMobile,
    true: spacingMobile.$2, // Default spacing (8px)
  },
  size: {
    ...spacingMobile,
    true: spacingMobile.$2, // Default size (8px)
    $xl: 14,
    $md: 14,
    $sm: 14,
  },
  zIndex,
  radius: {
    ...radius,
    true: radius[4], // Default radius (9px)
  },
})
