import { useEffect, useState } from 'react'
import { formatUnits } from 'ethers'
import type { Chain } from '@safe-global/store/gateway/AUTO_GENERATED/chains'
import { createWeb3ReadOnly } from '@/src/services/web3'
import { POLLING_INTERVAL } from '@/src/config/constants'

/**
 * Reads the native-token balance of an address straight from the RPC. CGW
 * endpoints 404 for counterfactual Safes, so this is the only way to show that
 * a not-yet-deployed account has already received funds.
 */
export const useNativeBalance = (chain?: Chain, address?: string): string | undefined => {
  const [balance, setBalance] = useState<string>()

  useEffect(() => {
    if (!chain || !address) {
      setBalance(undefined)
      return
    }

    let cancelled = false
    const provider = createWeb3ReadOnly(chain)

    if (!provider) {
      return
    }

    const fetchBalance = () => {
      provider
        .getBalance(address)
        .then((value) => {
          if (!cancelled) {
            setBalance(`${formatUnits(value, chain.nativeCurrency.decimals)} ${chain.nativeCurrency.symbol}`)
          }
        })
        .catch(() => {
          // Keep the last known value; the banner works without a balance.
        })
    }

    fetchBalance()
    const interval = setInterval(fetchBalance, POLLING_INTERVAL)

    return () => {
      cancelled = true
      clearInterval(interval)
      provider.destroy()
    }
  }, [chain, address])

  return balance
}
