import { useEffect, useRef, useState } from 'react'
import { checkAvailability, type AvailabilityResult } from '@/src/custom/identity'

export type UsernameAvailability = 'idle' | 'checking' | AvailabilityResult

export const USERNAME_CHECK_DEBOUNCE_MS = 400

/**
 * Debounced live availability check for the optional post-create username
 * step: `idle` while the input is empty, `checking` between a keystroke and
 * the proxy verdict, then one of the `AvailabilityResult` states.
 */
export const useUsernameAvailability = (input: string): UsernameAvailability => {
  const [availability, setAvailability] = useState<UsernameAvailability>('idle')
  const requestRef = useRef(0)

  useEffect(() => {
    const requestId = ++requestRef.current

    if (!input.trim()) {
      setAvailability('idle')
      return
    }

    setAvailability('checking')
    const timer = setTimeout(() => {
      checkAvailability(input).then((result) => {
        if (requestRef.current === requestId) {
          setAvailability(result)
        }
      })
    }, USERNAME_CHECK_DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [input])

  return availability
}
