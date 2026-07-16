import React from 'react'
import { Stack } from 'expo-router'
import { UlaznicaQr } from '@/src/custom/events/screens/UlaznicaQr'
import { evStrings } from '@/src/custom/events'

export default function UlaznicaQrScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: evStrings.qr.title }} />
      <UlaznicaQr />
    </>
  )
}
