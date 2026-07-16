import React from 'react'
import { Stack } from 'expo-router'
import { MojDogadjaj } from '@/src/custom/events/screens/MojDogadjaj'

export default function MojDogadjajScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: '' }} />
      <MojDogadjaj />
    </>
  )
}
