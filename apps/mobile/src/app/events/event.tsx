import React from 'react'
import { Stack } from 'expo-router'
import { EventDetail } from '@/src/custom/events/screens/EventDetail'

export default function EventDetailScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: '' }} />
      <EventDetail />
    </>
  )
}
