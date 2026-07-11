import React, { useMemo, useState } from 'react'
import { useNavigation } from 'expo-router'
import { CommonActions } from '@react-navigation/native'
import { useAppSelector } from '@/src/store/hooks'
import { selectAllChains } from '@/src/store/chains'
import { selectActiveSafe } from '@/src/store/activeSafeSlice'
import { useBrand } from '@/src/custom/brand'
import { isIdentityEnabled } from '@/src/custom/identity'
import { useCreateSafe } from './hooks/useCreateSafe'
import { CreateSafeView } from './components/CreateSafeView'

const DEFAULT_ACCOUNT_NAME = 'My account'

export const CreateSafeContainer = () => {
  const navigation = useNavigation()
  const chains = useAppSelector(selectAllChains)
  const activeSafe = useAppSelector(selectActiveSafe)
  const brand = useBrand()
  const { createSafe, status, error } = useCreateSafe()
  const [name, setName] = useState('')

  // Network precedence: brand manifest default → currently active account's
  // chain → first chain served by the (per-brand) gateway.
  const defaultChainId = useMemo(() => {
    const brandDefault = brand.backend?.defaultChainId
    if (brandDefault && chains.some((chain) => chain.chainId === brandDefault)) {
      return brandDefault
    }
    if (activeSafe && chains.some((chain) => chain.chainId === activeSafe.chainId)) {
      return activeSafe.chainId
    }
    return chains[0]?.chainId
  }, [brand, chains, activeSafe])

  const [selectedChainId, setSelectedChainId] = useState<string>()
  const effectiveChainId = selectedChainId ?? defaultChainId
  const selectedChain = chains.find((chain) => chain.chainId === effectiveChainId)

  const handleCreate = async () => {
    if (!selectedChain) {
      return
    }

    const address = await createSafe(name.trim() || DEFAULT_ACCOUNT_NAME, selectedChain)

    if (address) {
      // Identity-enabled brands get an optional "Choose your name" step on
      // top of home; everyone else exits straight to home as before.
      const routes = isIdentityEnabled()
        ? [
            { key: '(tabs)', name: '(tabs)' },
            { name: 'create-safe-username', params: { safeAddress: address, chainId: selectedChain.chainId } },
          ]
        : [{ key: '(tabs)', name: '(tabs)' }]

      navigation.dispatch(CommonActions.reset({ routes }))
    }
  }

  return (
    <CreateSafeView
      name={name}
      onNameChange={setName}
      chains={chains}
      selectedChainId={effectiveChainId}
      onSelectChain={setSelectedChainId}
      onCreate={handleCreate}
      isCreating={status === 'creating'}
      error={error}
    />
  )
}
