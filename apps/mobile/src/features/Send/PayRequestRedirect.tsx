import { useEffect } from 'react'
import { View } from 'tamagui'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useToastController } from '@tamagui/toast'
import { parseEip681Uri } from '@safe-global/utils/utils/eip681'
import { useAppSelector } from '@/src/store/hooks'
import { selectActiveSafe } from '@/src/store/activeSafeSlice'
import { useScannedAddressToSend } from './hooks/useScannedAddressToSend'

export const INVALID_PAYMENT_LINK_MESSAGE = 'Invalid payment link'

// Target of the `<scheme>://pay?uri=<EIP-681>` deep link. Pure redirect screen: it parses the
// payment request and hands it to the Send flow via the same path a scanned EIP-681 QR takes, so
// recipient risk validation runs identically. Anything unparseable (or no account to send from)
// lands back on the home screen.
export const PayRequestRedirect = () => {
  const router = useRouter()
  const toast = useToastController()
  const { uri } = useLocalSearchParams<{ uri?: string }>()
  const activeSafe = useAppSelector(selectActiveSafe)
  const { sendPaymentRequestToRecipient } = useScannedAddressToSend()

  useEffect(() => {
    const parsed = uri ? parseEip681Uri(uri) : null

    if (!parsed) {
      toast.show(INVALID_PAYMENT_LINK_MESSAGE, { native: false, duration: 3000 })
      router.replace('/')
      return
    }

    if (!activeSafe) {
      router.replace('/')
      return
    }

    sendPaymentRequestToRecipient(parsed, 'replace')
    // Consume the link exactly once on mount; re-running on state churn would re-navigate.
  }, [])

  return <View flex={1} backgroundColor="$background" testID="pay-request-redirect" />
}
