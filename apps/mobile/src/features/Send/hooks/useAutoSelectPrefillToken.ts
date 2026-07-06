import { useEffect, useRef } from 'react'
import { useToastController } from '@tamagui/toast'
import type { Balance } from '@safe-global/store/gateway/AUTO_GENERATED/balances'
import { sameAddress } from '@safe-global/utils/utils/addresses'
import { isNativeToken } from '../services/tokenTransferParams'

export const PREFILL_TOKEN_UNAVAILABLE_MESSAGE = 'Requested token is not available on this account'

// Auto-advances the token step when a payment request named a token the user actually holds, and
// warns once when they don't (the user then picks a token by hand). Consumes the prefill at most
// once per mount so backing out of the amount step doesn't bounce the user forward again.
export const useAutoSelectPrefillToken = ({
  prefillTokenAddress,
  items,
  isLoading,
  onSelect,
}: {
  prefillTokenAddress?: string
  items: Balance[] | undefined
  isLoading: boolean
  onSelect: (tokenAddress: string) => void
}) => {
  const consumed = useRef(false)
  const toast = useToastController()

  useEffect(() => {
    if (consumed.current || !prefillTokenAddress || isLoading) {
      return
    }
    consumed.current = true

    const match = (items ?? []).find((item) =>
      isNativeToken(prefillTokenAddress)
        ? item.tokenInfo.type === 'NATIVE_TOKEN'
        : sameAddress(item.tokenInfo.address, prefillTokenAddress),
    )

    if (match) {
      onSelect(match.tokenInfo.address)
    } else {
      toast.show(PREFILL_TOKEN_UNAVAILABLE_MESSAGE, { native: false, duration: 3000 })
    }
  }, [prefillTokenAddress, items, isLoading, onSelect, toast])
}
