import { useEffect, useState } from 'react'
import type { Chain } from '@safe-global/store/gateway/AUTO_GENERATED/chains'
import type { Balances } from '@safe-global/store/gateway/AUTO_GENERATED/balances'
import { TokenType } from '@safe-global/store/gateway/types'
import useAsync, { type AsyncResult } from '@safe-global/utils/hooks/useAsync'
import { ZERO_ADDRESS } from '@safe-global/utils/utils/constants'
import { createWeb3ReadOnly } from '@/src/services/web3'
import { POLLING_INTERVAL } from '@/src/config/constants'

/**
 * CGW endpoints 404 for counterfactual Safes, so the native balance is read
 * straight from the RPC and shaped like a CGW Balances payload. Fiat values
 * are unknown without CGW and reported as zero, mirroring the web app.
 */
export const useCounterfactualBalances = (chain?: Chain, safeAddress?: string): AsyncResult<Balances> => {
  const [pollCount, setPollCount] = useState(0)

  useEffect(() => {
    if (!chain || !safeAddress) {
      return
    }
    const interval = setInterval(() => setPollCount((count) => count + 1), POLLING_INTERVAL)
    return () => clearInterval(interval)
  }, [chain, safeAddress])

  return useAsync<Balances | undefined>(
    async () => {
      if (!chain || !safeAddress) {
        return undefined
      }
      const provider = createWeb3ReadOnly(chain)
      if (!provider) {
        return undefined
      }
      try {
        const balance = await provider.getBalance(safeAddress)
        return {
          fiatTotal: '0',
          items: [
            {
              tokenInfo: {
                type: TokenType.NATIVE_TOKEN,
                address: ZERO_ADDRESS,
                ...chain.nativeCurrency,
              },
              balance: balance.toString(),
              fiatBalance: '0',
              fiatConversion: '0',
            },
          ],
        }
      } finally {
        provider.destroy()
      }
    },
    [chain, safeAddress, pollCount],
    // Keep the last balance while a poll refresh is in flight to avoid flicker.
    false,
  )
}
