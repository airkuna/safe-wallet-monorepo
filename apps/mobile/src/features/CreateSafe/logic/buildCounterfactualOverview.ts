import type { SafeOverview } from '@safe-global/store/gateway/AUTO_GENERATED/safes'

/**
 * Builds the `SafeOverview` entry for a counterfactual (not yet deployed) Safe
 * so it renders in the account switcher exactly like an imported one. CGW does
 * not know the address yet, so the overview is synthesized locally; the safes
 * slice refreshes it automatically once the Safe is deployed and indexed.
 */
export const buildCounterfactualOverview = ({
  address,
  chainId,
  owners,
  threshold,
}: {
  address: string
  chainId: string
  owners: string[]
  threshold: number
}): SafeOverview => ({
  address: { value: address, name: null, logoUri: null },
  chainId,
  threshold,
  owners: owners.map((owner) => ({ value: owner, name: null, logoUri: null })),
  fiatTotal: '0',
  queued: 0,
  awaitingConfirmation: null,
})
