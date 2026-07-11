import React from 'react'
import { Stack } from 'expo-router'
import { MojeNarudzbe } from '@/src/custom/marketplace/screens/MojeNarudzbe'
import { mpStrings } from '@/src/custom/marketplace'

export default function MojeNarudzbeScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: mpStrings.orders.title }} />
      <MojeNarudzbe />
    </>
  )
}
