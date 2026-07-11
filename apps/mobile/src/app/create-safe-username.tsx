import React from 'react'
import { Stack } from 'expo-router'
import { UsernameStepContainer } from '@/src/features/CreateSafe'

export default function CreateSafeUsernameScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: '' }} />
      <UsernameStepContainer />
    </>
  )
}
