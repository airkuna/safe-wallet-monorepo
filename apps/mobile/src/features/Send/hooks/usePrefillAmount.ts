import { useEffect, useRef } from 'react'
import { formatUnits } from 'ethers'

// Seeds the amount input from a payment request exactly once. The request carries the amount as an
// integer string in base units; it can only be turned into a human amount here, where the selected
// token's decimals are known. The user can still edit or clear the value afterwards.
export const usePrefillAmount = ({
  prefillValueRaw,
  decimals,
  isTokenDataReady,
  setAmount,
}: {
  prefillValueRaw?: string
  decimals: number
  isTokenDataReady: boolean
  setAmount: (value: string, maxDecimals: number) => void
}) => {
  const applied = useRef(false)

  useEffect(() => {
    if (applied.current || !prefillValueRaw || !isTokenDataReady) {
      return
    }
    applied.current = true

    let human: string
    try {
      const raw = BigInt(prefillValueRaw)
      if (raw === 0n) {
        return
      }
      human = formatUnits(raw, decimals)
    } catch {
      return
    }

    // formatUnits pads with trailing zeros ("1.0", "1.50") which the input treats as user keystrokes.
    const trimmed = human.includes('.') ? human.replace(/\.?0+$/, '') : human
    setAmount(trimmed, decimals)
  }, [prefillValueRaw, decimals, isTokenDataReady, setAmount])
}
