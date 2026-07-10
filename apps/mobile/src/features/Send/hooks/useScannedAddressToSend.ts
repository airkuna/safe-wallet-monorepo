import { useCallback } from 'react'
import { useRouter } from 'expo-router'
import { useToastController } from '@tamagui/toast'
import { ZeroAddress } from 'ethers'
import type { Eip681Transfer } from '@safe-global/utils/utils/eip681'
import type { ScannedAddress } from '@/src/components/Camera/scannedAddress'
import { useAppSelector } from '@/src/store/hooks'
import { selectActiveChain } from '@/src/store/chains'

type NavigateMode = 'dismissTo' | 'replace'

// Token/amount prefill carried alongside the scanned recipient. `tokenAddress` uses the zero address
// as the native-coin sentinel (same convention as `isNativeToken`); `valueRaw` is an integer string
// in base units — it is converted to a human amount only once the token's decimals are known.
export type SendPrefill = { tokenAddress?: string; valueRaw?: string }

// Monotonically increasing nonce so each navigation re-triggers the recipient screen's effect even
// when the same address is scanned twice; deterministic, unlike Date.now() which can collide within
// a millisecond. Intentionally a module-level singleton — do NOT move it into a useRef: the scanner
// unmounts on navigation, so a per-instance ref would reset to 0 and break cross-mount uniqueness.
let scanSeq = 0

// Shared address-to-Send logic for both QR scanners: the in-Send scanner (`/(send)/scan-qr`) and the
// header scanner (`/wallet-connect-scan`). Owns the chain-mismatch warning and navigation into the
// Send flow with the recipient prefilled. The camera lifecycle and invalid-address error display
// stay with each scanner since they differ.
export const useScannedAddressToSend = () => {
  const router = useRouter()
  const toast = useToastController()
  const activeChain = useAppSelector(selectActiveChain)

  const warnChainMismatch = useCallback(
    (prefix: string | undefined) => {
      const activeShortName = activeChain?.shortName

      if (!prefix || !activeShortName || prefix === activeShortName) {
        return
      }

      toast.show(`Address is for ${prefix}, but active chain is ${activeShortName}`, { native: false, duration: 3000 })
    },
    [activeChain?.shortName, toast],
  )

  // `dismissTo` pops back to the recipient screen already in the Send stack (the in-Send scanner).
  // `replace` swaps the standalone scanner modal for the Send flow so the back stack matches the
  // home-screen Send button (tabs → recipient).
  const navigateToRecipient = useCallback(
    (address: string, mode: NavigateMode = 'dismissTo', prefill?: SendPrefill) => {
      const target = {
        pathname: '/(send)/recipient' as const,
        params: {
          scannedAddress: address,
          scanNonce: String(++scanSeq),
          ...(prefill?.tokenAddress ? { prefillTokenAddress: prefill.tokenAddress } : {}),
          ...(prefill?.valueRaw ? { prefillValueRaw: prefill.valueRaw } : {}),
        },
      }

      if (mode === 'replace') {
        router.replace(target)
      } else {
        router.dismissTo(target)
      }
    },
    [router],
  )

  // Routes an EIP-681 payment request into the Send flow. The recipient always lands on the
  // recipient screen so the full risk validation (suspicious address, cross-chain contact, self
  // send) runs exactly as for a hand-typed address. Token and amount only prefill when the request
  // targets the active chain — token addresses are chain-specific, so on a mismatch we warn and
  // fall back to an address-only prefill.
  const sendPaymentRequestToRecipient = useCallback(
    (request: Eip681Transfer, mode: NavigateMode = 'dismissTo') => {
      const chainMismatch = request.chainId !== undefined && !!activeChain && request.chainId !== activeChain.chainId

      if (chainMismatch) {
        toast.show(
          `Payment request is for chain id ${request.chainId}, but active chain is ${activeChain?.chainName}`,
          { native: false, duration: 3000 },
        )
      }

      // A bare `ethereum:0x…` URI (no token, no amount) is just an address QR —
      // MetaMask and others render receive QRs this way. Prefilling the native
      // coin here would skip the token-selection step for a token payment.
      const isBareAddress = request.tokenAddress === undefined && request.value === undefined

      const prefill =
        chainMismatch || isBareAddress
          ? undefined
          : { tokenAddress: request.tokenAddress ?? ZeroAddress, valueRaw: request.value }

      navigateToRecipient(request.recipient, mode, prefill)
    },
    [activeChain, toast, navigateToRecipient],
  )

  // Single entry point for scanner results: plain (optionally prefixed) addresses keep the existing
  // short-name warning; EIP-681 payment requests go through the prefill path above.
  const sendScannedToRecipient = useCallback(
    (scanned: ScannedAddress, mode: NavigateMode = 'dismissTo') => {
      if (scanned.paymentRequest) {
        sendPaymentRequestToRecipient(scanned.paymentRequest, mode)
        return
      }

      warnChainMismatch(scanned.prefix)
      navigateToRecipient(scanned.address, mode)
    },
    [sendPaymentRequestToRecipient, warnChainMismatch, navigateToRecipient],
  )

  return { warnChainMismatch, navigateToRecipient, sendPaymentRequestToRecipient, sendScannedToRecipient }
}
