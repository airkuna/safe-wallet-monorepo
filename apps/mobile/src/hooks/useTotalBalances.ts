import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { selectActiveSafe } from '@/src/store/activeSafeSlice'
import { useAppSelector } from '@/src/store/hooks'
import { RootState } from '@/src/store'
import { selectCurrency, selectTokenList, TOKEN_LISTS } from '@/src/store/settingsSlice'
import { selectActiveChain } from '@/src/store/chains'
import { useHasFeature } from '@/src/hooks/useHasFeature'
import { FEATURES, hasFeature } from '@safe-global/utils/utils/chains'
import { POLLING_INTERVAL, POSITIONS_POLLING_INTERVAL } from '@/src/config/constants'
import useTotalBalances, { type TotalBalancesResult } from '@safe-global/utils/hooks/useTotalBalances'
import { selectIsUndeployedSafe } from '@/src/features/CreateSafe/store/undeployedSafesSlice'
import { useCounterfactualBalances } from '@/src/features/CreateSafe/hooks/useCounterfactualBalances'

export type { PortfolioBalances } from '@safe-global/utils/hooks/portfolioBalances'

const useTokenListSetting = (): boolean | undefined => {
  const chain = useAppSelector(selectActiveChain)
  const tokenList = useAppSelector(selectTokenList)

  return useMemo(() => {
    if (tokenList === TOKEN_LISTS.ALL) {
      return false
    }
    return chain ? hasFeature(chain, FEATURES.DEFAULT_TOKENLIST) : undefined
  }, [chain, tokenList])
}

const useMobileTotalBalances = (): TotalBalancesResult => {
  const activeSafe = useSelector(selectActiveSafe)
  const currency = useAppSelector(selectCurrency)
  const tokenList = useAppSelector(selectTokenList)
  const trusted = useTokenListSetting()
  const hasPortfolioFeature = useHasFeature(FEATURES.PORTFOLIO_ENDPOINT) ?? false
  const isAllTokensSelected = tokenList === TOKEN_LISTS.ALL
  const isUndeployed = useAppSelector((state: RootState) =>
    activeSafe ? selectIsUndeployedSafe(state, activeSafe.address, activeSafe.chainId) : false,
  )
  const activeChain = useAppSelector(selectActiveChain)
  const counterfactualResult = useCounterfactualBalances(
    isUndeployed ? (activeChain ?? undefined) : undefined,
    isUndeployed ? activeSafe?.address : undefined,
  )

  return useTotalBalances({
    safeAddress: activeSafe?.address ?? '',
    chainId: activeSafe?.chainId ?? '',
    currency,
    trusted,
    // CGW has not indexed a counterfactual Safe: force the tx-service-only path
    // (skipped when not deployed) so the RPC-backed counterfactual result is used.
    hasPortfolioFeature: hasPortfolioFeature && !isUndeployed,
    isAllTokensSelected: isAllTokensSelected && !isUndeployed,
    isDeployed: !isUndeployed,
    counterfactualResult: isUndeployed ? counterfactualResult : undefined,
    portfolioPollingInterval: POSITIONS_POLLING_INTERVAL,
    txServicePollingInterval: POLLING_INTERVAL,
    skip: !activeSafe,
  })
}

export default useMobileTotalBalances
