import React from 'react'
import { TouchableOpacity } from 'react-native'
import { ScrollView, Text, View, XStack, YStack } from 'tamagui'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { SafeFontIcon } from '@/src/components/SafeFontIcon'
import { MERCHANTS } from '../catalog/registry'
import { mpStrings } from '../strings'
import { MerchantMark } from '../components/MerchantMark'

/** Tržnica hub: popis trgovaca + ulaz u vlastite narudžbe. */
export const Trznica = () => {
  const router = useRouter()
  const { top } = useSafeAreaInsets()

  return (
    <ScrollView flex={1} backgroundColor="$backgroundPaper" testID="mp-hub-screen">
      <YStack paddingTop={top + 12} paddingHorizontal="$4" paddingBottom="$4" gap="$2">
        <Text fontSize="$8" fontWeight="700">
          {mpStrings.hub.title}
        </Text>
        <Text fontSize="$3" color="$colorSecondary">
          {mpStrings.hub.subtitle}
        </Text>
      </YStack>

      <YStack paddingHorizontal="$4" gap="$3" paddingBottom="$10">
        {MERCHANTS.map((merchant) => (
          <TouchableOpacity
            key={merchant.slug}
            onPress={() => router.push({ pathname: '/marketplace/store', params: { merchant: merchant.slug } })}
            testID={`mp-hub-merchant-${merchant.slug}`}
          >
            <XStack backgroundColor="$background" borderRadius="$4" padding="$4" alignItems="center" gap="$3">
              <MerchantMark merchant={merchant} />
              <YStack flex={1} gap="$1">
                <Text fontSize="$5" fontWeight="600">
                  {merchant.name}
                </Text>
                {merchant.tagline !== undefined && (
                  <Text fontSize="$3" color="$colorSecondary">
                    {merchant.tagline}
                  </Text>
                )}
              </YStack>
              <SafeFontIcon name="chevron-right" size={16} color="$colorSecondary" />
            </XStack>
          </TouchableOpacity>
        ))}

        <TouchableOpacity onPress={() => router.push('/marketplace/orders')} testID="mp-hub-orders">
          <XStack backgroundColor="$background" borderRadius="$4" padding="$4" alignItems="center" gap="$3">
            <View
              width={40}
              height={40}
              borderRadius={20}
              alignItems="center"
              justifyContent="center"
              backgroundColor="$backgroundSecondary"
            >
              <SafeFontIcon name="document" size={20} color="$color" />
            </View>
            <Text flex={1} fontSize="$4" fontWeight="600">
              {mpStrings.hub.myOrders}
            </Text>
            <SafeFontIcon name="chevron-right" size={16} color="$colorSecondary" />
          </XStack>
        </TouchableOpacity>

        <XStack
          backgroundColor="$backgroundSecondary"
          borderRadius="$4"
          padding="$4"
          alignItems="center"
          gap="$3"
          testID="mp-hub-your-store"
        >
          <SafeFontIcon name="plus" size={20} color="$colorSecondary" />
          <YStack flex={1} gap="$1">
            <Text fontSize="$4" fontWeight="600" color="$colorSecondary">
              {mpStrings.hub.yourStoreHere}
            </Text>
            <Text fontSize="$3" color="$colorSecondary">
              {mpStrings.hub.yourStoreHereDesc}
            </Text>
          </YStack>
        </XStack>
      </YStack>
    </ScrollView>
  )
}
