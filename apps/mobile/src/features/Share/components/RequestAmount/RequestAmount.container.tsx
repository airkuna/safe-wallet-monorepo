import React, { useCallback } from 'react'
import Share from 'react-native-share'
import { useCopyAndDispatchToast } from '@/src/hooks/useCopyAndDispatchToast'
import { RequestAmountView } from './RequestAmountView'
import { useRequestAmount } from './useRequestAmount'

export const RequestAmountContainer = () => {
  const { tokenOptions, selectedToken, selectToken, amount, handleAmountChange, eip681Uri, paymentLink } =
    useRequestAmount()
  const copyAndDispatchToast = useCopyAndDispatchToast('Payment link copied.')

  const onShareLink = useCallback(() => {
    Share.open({ title: 'Payment request', message: paymentLink }).catch(() => {
      // The share sheet rejects when dismissed; nothing to handle.
    })
  }, [paymentLink])

  const onCopyLink = useCallback(() => {
    copyAndDispatchToast(paymentLink)
  }, [copyAndDispatchToast, paymentLink])

  return (
    <RequestAmountView
      tokenOptions={tokenOptions}
      selectedToken={selectedToken}
      onSelectToken={selectToken}
      amount={amount}
      onAmountChange={handleAmountChange}
      eip681Uri={eip681Uri}
      onShareLink={onShareLink}
      onCopyLink={onCopyLink}
    />
  )
}
