import React from 'react'
import { Image, TouchableOpacity } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ScrollView, Text, XStack, YStack } from 'tamagui'
import { Alert } from '@/src/components/Alert'
import { getMerchant } from '../catalog/registry'
import { merchantColors } from '../theme/merchantColors'
import { formatEur } from '../logic/order'
import { mpStrings } from '../strings'
import { MerchantMark } from '../components/MerchantMark'

/** Trgovina jednog trgovca: priča, zakonski podaci i katalog modela. */
export const MerchantStore = () => {
  const router = useRouter()
  const { merchant: merchantParam } = useLocalSearchParams<{ merchant?: string }>()
  const merchant = getMerchant(merchantParam)
  const colors = merchantColors(merchant.brand)

  const legalMeta = [
    merchant.legal?.legalName,
    merchant.legal?.oib !== undefined ? `${mpStrings.store.oib} ${merchant.legal.oib}` : undefined,
    merchant.legal?.address,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <ScrollView flex={1} backgroundColor="$backgroundPaper" testID="mp-store-screen">
      <YStack backgroundColor={colors.primary} padding="$4" gap="$3">
        <XStack alignItems="center" gap="$3">
          <MerchantMark merchant={merchant} size={56} />
          <YStack flex={1} gap="$1">
            <Text fontSize="$6" fontWeight="700" color={colors.onPrimary}>
              {merchant.name}
            </Text>
            {merchant.tagline !== undefined && (
              <Text fontSize="$3" color={colors.onPrimary} opacity={0.8}>
                {merchant.tagline}
              </Text>
            )}
          </YStack>
        </XStack>
      </YStack>

      <YStack padding="$4" gap="$3" paddingBottom="$10">
        {merchant.safeAddress === undefined && (
          <Alert type="info" message={mpStrings.store.notOnchain} displayIcon testID="mp-store-not-onchain" />
        )}

        {merchant.story !== undefined && (
          <Text fontSize="$3" color="$colorSecondary">
            {merchant.story}
          </Text>
        )}

        <Text fontSize="$5" fontWeight="600">
          {mpStrings.store.products}
        </Text>

        {merchant.products.map((product) => (
          <TouchableOpacity
            key={product.id}
            onPress={() =>
              router.push({
                pathname: '/marketplace/product',
                params: { merchant: merchant.slug, product: product.id },
              })
            }
            testID={`mp-store-product-${product.id}`}
          >
            <YStack backgroundColor="$background" borderRadius="$4" overflow="hidden">
              {product.imageUrl !== undefined && (
                <Image
                  source={{ uri: product.imageUrl }}
                  style={{ width: '100%', height: 200 }}
                  resizeMode="cover"
                  testID={`mp-store-product-image-${product.id}`}
                />
              )}
              <YStack padding="$4" gap="$1">
                <Text fontSize="$4" fontWeight="600">
                  {product.name}
                </Text>
                <Text fontSize="$3" color="$colorSecondary" numberOfLines={2}>
                  {product.desc}
                </Text>
                <Text fontSize="$4" fontWeight="700" color={colors.primary}>
                  {formatEur(product.priceEur)} EUR
                </Text>
              </YStack>
            </YStack>
          </TouchableOpacity>
        ))}

        {legalMeta !== '' && (
          <YStack gap="$1" paddingTop="$2">
            <Text fontSize="$3" fontWeight="600" color="$colorSecondary">
              {mpStrings.store.aboutSeller}
            </Text>
            <Text fontSize="$2" color="$colorSecondary" testID="mp-store-legal">
              {legalMeta}
            </Text>
            {merchant.legal?.web !== undefined && (
              <Text fontSize="$2" color="$colorSecondary">
                {mpStrings.store.web}: {merchant.legal.web}
              </Text>
            )}
          </YStack>
        )}
      </YStack>
    </ScrollView>
  )
}
