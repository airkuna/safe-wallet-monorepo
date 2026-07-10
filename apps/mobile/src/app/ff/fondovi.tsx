import React from 'react'
import { Stack } from 'expo-router'
import { Fondovi } from '@/src/custom/ff/screens/Fondovi'
import { ffStrings } from '@/src/custom/ff'

export default function FondoviScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: ffStrings.funds.title }} />
      <Fondovi />
    </>
  )
}
