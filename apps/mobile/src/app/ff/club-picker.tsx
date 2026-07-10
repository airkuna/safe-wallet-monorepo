import React from 'react'
import { Stack } from 'expo-router'
import { ClubPicker } from '@/src/custom/ff/screens/ClubPicker'
import { ffStrings } from '@/src/custom/ff'

export default function ClubPickerScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: ffStrings.picker.title, presentation: 'modal' }} />
      <ClubPicker />
    </>
  )
}
