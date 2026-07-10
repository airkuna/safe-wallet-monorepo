import React from 'react'
import { Stack } from 'expo-router'
import { ComingSoon } from '@/src/custom/ff/screens/ComingSoon'
import { ffStrings } from '@/src/custom/ff'

export default function ComingSoonScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: ffStrings.comingSoon.title }} />
      <ComingSoon />
    </>
  )
}
