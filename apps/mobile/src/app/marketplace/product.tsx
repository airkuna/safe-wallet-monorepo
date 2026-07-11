import React from 'react'
import { Stack } from 'expo-router'
import { ProductDetail } from '@/src/custom/marketplace/screens/ProductDetail'

export default function ProductDetailScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: '' }} />
      <ProductDetail />
    </>
  )
}
