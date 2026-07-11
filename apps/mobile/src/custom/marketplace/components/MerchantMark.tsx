import React from 'react'
import { Image } from 'react-native'
import { Text, View } from 'tamagui'
import type { MerchantConfig } from '../catalog/types'
import { merchantColors } from '../theme/merchantColors'

/**
 * Logo trgovca s CDN-a; bez URL-a → krug s inicijalom u brand boji (isti
 * fallback obrazac kao FF `ClubCrest`).
 */
export const MerchantMark = ({ merchant, size = 48 }: { merchant: MerchantConfig; size?: number }) => {
  const colors = merchantColors(merchant.brand)

  if (merchant.logoUrl !== undefined) {
    return (
      <Image
        source={{ uri: merchant.logoUrl }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        testID={`mp-mark-image-${merchant.slug}`}
      />
    )
  }

  return (
    <View
      width={size}
      height={size}
      borderRadius={size / 2}
      alignItems="center"
      justifyContent="center"
      backgroundColor={colors.primary}
      testID={`mp-mark-initial-${merchant.slug}`}
    >
      <Text fontSize={size / 2.5} fontWeight="700" color={colors.onPrimary}>
        {merchant.name.slice(0, 1).toUpperCase()}
      </Text>
    </View>
  )
}
