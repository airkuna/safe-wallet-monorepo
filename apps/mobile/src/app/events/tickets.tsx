import React from 'react'
import { Stack } from 'expo-router'
import { MojeUlaznice } from '@/src/custom/events/screens/MojeUlaznice'
import { evStrings } from '@/src/custom/events'

export default function MojeUlazniceScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: evStrings.tickets.title }} />
      <MojeUlaznice />
    </>
  )
}
