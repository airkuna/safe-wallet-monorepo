import React from 'react'
import { Stack } from 'expo-router'
import { TicketCheckout } from '@/src/custom/events/screens/TicketCheckout'
import { evStrings } from '@/src/custom/events'

export default function TicketCheckoutScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: evStrings.checkout.title }} />
      <TicketCheckout />
    </>
  )
}
