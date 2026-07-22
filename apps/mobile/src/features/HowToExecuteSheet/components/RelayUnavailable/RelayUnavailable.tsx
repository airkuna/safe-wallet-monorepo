import React from 'react'
import { View, Text } from 'tamagui'
import { getRelayCopy } from '@/src/custom/zerofee'

export const RelayUnavailable = () => {
  const copy = getRelayCopy()

  return (
    <View justifyContent="space-between" alignItems="center">
      <Text color="$colorSecondary" fontSize="$4">
        {copy ? (
          copy.unavailable
        ) : (
          <>
            You reached a limit with free transactions. Usually it resets within <Text fontSize="$4">1 day.</Text>
          </>
        )}
      </Text>
    </View>
  )
}
