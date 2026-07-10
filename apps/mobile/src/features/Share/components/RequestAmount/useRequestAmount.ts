import { useCallback, useMemo, useState } from 'react'
import { useAppSelector } from '@/src/store/hooks'
import { useDefinedActiveSafe } from '@/src/store/hooks/activeSafe'
import { selectChainById } from '@/src/store/chains'
import { useTokenBalances } from '@/src/features/Assets/components/Tokens/useTokenBalances'
import { useAmountInput } from '@/src/features/Send/hooks/useAmountInput'
import { generateEip681Uri } from '@safe-global/utils/utils/eip681'
import { safeParseUnits } from '@safe-global/utils/utils/formatters'
import { buildPaymentLink } from '@/src/custom/paymentLinks'

export type RequestTokenOption = {
  /** Stable identity for selection; the native coin uses 'native' since its address is synthetic */
  key: string
  symbol: string
  decimals: number
  /** Absent for the native coin (EIP-681 encodes native transfers without a token address) */
  tokenAddress?: string
  logoUri?: string | null
}

// State for the "Request amount" receive step: token choice, amount input, and the derived
// EIP-681 URI + shareable deep link. The native coin comes from the chain config rather than the
// balances endpoint so the screen keeps working for counterfactual (undeployed) accounts, where
// CGW balance lookups 404.
export const useRequestAmount = () => {
  const activeSafe = useDefinedActiveSafe()
  const chain = useAppSelector((state) => selectChainById(state, activeSafe.chainId))
  const { visibleItems } = useTokenBalances()

  const tokenOptions: RequestTokenOption[] = useMemo(() => {
    const native: RequestTokenOption = {
      key: 'native',
      symbol: chain?.nativeCurrency?.symbol ?? 'ETH',
      decimals: chain?.nativeCurrency?.decimals ?? 18,
      logoUri: chain?.nativeCurrency?.logoUri,
    }
    const erc20s = (visibleItems ?? [])
      .filter((item) => item.tokenInfo.type !== 'NATIVE_TOKEN')
      .map((item) => ({
        key: item.tokenInfo.address,
        symbol: item.tokenInfo.symbol,
        decimals: item.tokenInfo.decimals != null ? Number(item.tokenInfo.decimals) : 18,
        tokenAddress: item.tokenInfo.address,
        logoUri: item.tokenInfo.logoUri,
      }))
    return [native, ...erc20s]
  }, [chain, visibleItems])

  const [selectedKey, setSelectedKey] = useState('native')
  const selectedToken = tokenOptions.find((option) => option.key === selectedKey) ?? tokenOptions[0]

  const { rawInput: amount, setRawInput } = useAmountInput()

  const handleAmountChange = useCallback(
    (text: string) => setRawInput(text, selectedToken.decimals),
    [setRawInput, selectedToken.decimals],
  )

  // Switching to a token with fewer decimals truncates the typed amount to what
  // the token supports; otherwise the displayed amount and the encoded URI
  // would silently disagree (safeParseUnits rejects excess decimals).
  const selectToken = useCallback(
    (key: string) => {
      setSelectedKey(key)
      const next = tokenOptions.find((option) => option.key === key)
      if (!next || !amount) {
        return
      }
      const dotIndex = amount.indexOf('.')
      if (dotIndex === -1 || amount.length - dotIndex - 1 <= next.decimals) {
        return
      }
      const truncated = next.decimals === 0 ? amount.slice(0, dotIndex) : amount.slice(0, dotIndex + 1 + next.decimals)
      setRawInput(truncated, next.decimals)
    },
    [tokenOptions, amount, setRawInput],
  )

  const valueRaw = useMemo(() => {
    if (!amount) {
      return undefined
    }
    const parsed = safeParseUnits(amount, selectedToken.decimals)
    return parsed !== undefined && parsed > 0n ? parsed.toString() : undefined
  }, [amount, selectedToken.decimals])

  const eip681Uri = useMemo(
    () =>
      generateEip681Uri({
        recipient: activeSafe.address,
        chainId: activeSafe.chainId,
        tokenAddress: selectedToken.tokenAddress,
        value: valueRaw,
      }),
    [activeSafe.address, activeSafe.chainId, selectedToken.tokenAddress, valueRaw],
  )

  const paymentLink = useMemo(() => buildPaymentLink(eip681Uri), [eip681Uri])

  return {
    tokenOptions,
    selectedToken,
    selectToken,
    amount,
    handleAmountChange,
    eip681Uri,
    paymentLink,
  }
}
