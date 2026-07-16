import React from 'react'
import { Stack } from 'expo-router'
import { MojDogadjaji } from '@/src/custom/events/screens/MojDogadjaji'
import { evStrings } from '@/src/custom/events'

export default function MojDogadjajiScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: evStrings.organizer.title }} />
      <MojDogadjaji />
    </>
  )
}
