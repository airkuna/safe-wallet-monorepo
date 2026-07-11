import { useEffect, useState } from 'react'
import { useAppSelector } from '@/src/store/hooks'
import { selectChainById } from '@/src/store/chains'
import { getResolverChainId, isIdentityEnabled } from '../config'
import { isUsernameLike } from '../username'
import { resolveUsername } from '../resolve'
import type { RecipientResolution } from '../types'

const DEBOUNCE_MS = 400

const IDLE: RecipientResolution = { status: 'idle', resolved: null }

/**
 * Debounced username → address resolution for the Send recipient field.
 * Non-username inputs (bare addresses, partial typing) stay `idle`, so the
 * existing validation path runs unchanged.
 */
export const useRecipientResolution = (input: string): RecipientResolution => {
  const resolverChain = useAppSelector((state) => selectChainById(state, getResolverChainId()))
  const [resolution, setResolution] = useState<RecipientResolution>(IDLE)

  useEffect(() => {
    if (!isIdentityEnabled() || !isUsernameLike(input)) {
      setResolution(IDLE)
      return
    }

    setResolution({ status: 'resolving', resolved: null })
    let cancelled = false

    const timer = setTimeout(() => {
      resolveUsername(input, resolverChain)
        .then((resolved) => {
          if (!cancelled) {
            setResolution(resolved ? { status: 'resolved', resolved } : { status: 'not-found', resolved: null })
          }
        })
        .catch(() => {
          if (!cancelled) {
            setResolution({ status: 'error', resolved: null })
          }
        })
    }, DEBOUNCE_MS)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [input, resolverChain])

  return resolution
}
