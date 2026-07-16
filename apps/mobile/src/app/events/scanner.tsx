import React from 'react'
import { Stack } from 'expo-router'
import { SkenerUlaza } from '@/src/custom/events/screens/SkenerUlaza'
import { evStrings } from '@/src/custom/events'

export default function SkenerUlazaScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false, title: evStrings.scanner.title }} />
      <SkenerUlaza />
    </>
  )
}
