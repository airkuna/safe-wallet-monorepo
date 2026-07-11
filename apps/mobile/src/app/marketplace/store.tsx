import React from 'react'
import { Stack } from 'expo-router'
import { MerchantStore } from '@/src/custom/marketplace/screens/MerchantStore'

export default function MerchantStoreScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: '' }} />
      <MerchantStore />
    </>
  )
}
