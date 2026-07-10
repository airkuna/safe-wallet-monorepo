import React from 'react'
import { Stack } from 'expo-router'
import { Doniraj } from '@/src/custom/ff/screens/Doniraj'
import { ffStrings } from '@/src/custom/ff'

export default function DonirajScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: ffStrings.donate.title }} />
      <Doniraj />
    </>
  )
}
