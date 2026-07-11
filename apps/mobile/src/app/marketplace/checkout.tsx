import React from 'react'
import { Stack } from 'expo-router'
import { Checkout } from '@/src/custom/marketplace/screens/Checkout'
import { mpStrings } from '@/src/custom/marketplace'

export default function CheckoutScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: mpStrings.checkout.title }} />
      <Checkout />
    </>
  )
}
