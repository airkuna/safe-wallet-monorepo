import React, { useState } from 'react'
import { Image, TouchableOpacity } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ScrollView, Text, View, XStack, YStack } from 'tamagui'
import { SafeButton } from '@/src/components/SafeButton'
import { getMerchant, getProduct } from '../catalog/registry'
import { merchantColors } from '../theme/merchantColors'
import { formatEur } from '../logic/order'
import { mpStrings } from '../strings'

const MAX_QTY = 9

/** Detalj modela: veličina + količina → checkout. */
export const ProductDetail = () => {
  const router = useRouter()
  const params = useLocalSearchParams<{ merchant?: string; product?: string }>()
  const merchant = getMerchant(params.merchant)
  const product = getProduct(merchant, params.product)
  const colors = merchantColors(merchant.brand)

  const [size, setSize] = useState<string | undefined>(undefined)
  const [qty, setQty] = useState(1)

  if (product === undefined) {
    return null
  }

  const canOrder = size !== undefined

  const onOrder = () => {
    if (size === undefined) {
      return
    }
    router.push({
      pathname: '/marketplace/checkout',
      params: { merchant: merchant.slug, product: product.id, size, qty: String(qty) },
    })
  }

  return (
    <ScrollView flex={1} backgroundColor="$backgroundPaper" testID="mp-product-screen">
      {product.imageUrl !== undefined && (
        <Image
          source={{ uri: product.imageUrl }}
          style={{ width: '100%', height: 320 }}
          resizeMode="cover"
          testID="mp-product-image"
        />
      )}

      <YStack padding="$4" gap="$4" paddingBottom="$10">
        <YStack gap="$1">
          <Text fontSize="$6" fontWeight="700">
            {product.name}
          </Text>
          <Text fontSize="$5" fontWeight="700" color={colors.primary}>
            {formatEur(product.priceEur)} EUR{' '}
            <Text fontSize="$3" color="$colorSecondary" fontWeight="400">
              {mpStrings.product.priceEach}
            </Text>
          </Text>
        </YStack>

        <Text fontSize="$3" color="$colorSecondary">
          {product.desc}
        </Text>

        {product.story !== undefined && (
          <Text fontSize="$3" color="$colorSecondary" fontStyle="italic">
            {product.story}
          </Text>
        )}

        {product.material !== undefined && (
          <Text fontSize="$3" color="$colorSecondary">
            {mpStrings.product.material}: {product.material}
          </Text>
        )}

        <YStack gap="$2">
          <Text color="$colorSecondary">{mpStrings.product.size}</Text>
          <XStack gap="$2" flexWrap="wrap">
            {product.sizes.map((option) => {
              const isSelected = option === size
              return (
                <TouchableOpacity key={option} onPress={() => setSize(option)} testID={`mp-product-size-${option}`}>
                  <View
                    borderRadius="$10"
                    paddingHorizontal="$4"
                    paddingVertical="$2"
                    backgroundColor={isSelected ? colors.primary : '$backgroundSecondary'}
                  >
                    <Text fontWeight="600" color={isSelected ? colors.onPrimary : '$color'}>
                      {option}
                    </Text>
                  </View>
                </TouchableOpacity>
              )
            })}
          </XStack>
        </YStack>

        <YStack gap="$2">
          <Text color="$colorSecondary">{mpStrings.product.quantity}</Text>
          <XStack alignItems="center" gap="$4">
            <TouchableOpacity
              onPress={() => setQty((current) => Math.max(1, current - 1))}
              testID="mp-product-qty-minus"
            >
              <View
                width={40}
                height={40}
                borderRadius={20}
                alignItems="center"
                justifyContent="center"
                backgroundColor="$backgroundSecondary"
              >
                <Text fontSize="$6">−</Text>
              </View>
            </TouchableOpacity>
            <Text fontSize="$5" fontWeight="600" testID="mp-product-qty">
              {qty}
            </Text>
            <TouchableOpacity
              onPress={() => setQty((current) => Math.min(MAX_QTY, current + 1))}
              testID="mp-product-qty-plus"
            >
              <View
                width={40}
                height={40}
                borderRadius={20}
                alignItems="center"
                justifyContent="center"
                backgroundColor="$backgroundSecondary"
              >
                <Text fontSize="$6">+</Text>
              </View>
            </TouchableOpacity>
          </XStack>
        </YStack>

        <SafeButton
          disabled={!canOrder}
          onPress={canOrder ? onOrder : undefined}
          backgroundColor={canOrder ? colors.primary : undefined}
          textColor={canOrder ? colors.onPrimary : undefined}
          testID="mp-product-order"
        >
          {mpStrings.product.order}
        </SafeButton>
      </YStack>
    </ScrollView>
  )
}
