import type { CurrencyConfig } from './types'

/**
 * Valuta-as-config: default namire je Monerium EURe na Gnosis Chainu — isti
 * invariant kao Tržnica (`src/custom/marketplace/catalog/currency.ts`) i FF.
 * Nijedan ekran ne smije hardkodirati simbol/adresu/decimale; prelazak na
 * drugi token = izmjena configa po eventu, ne koda.
 */
export const DEFAULT_CURRENCY: CurrencyConfig = {
  tokenAddress: '0xcB444e90D8198415266c6a2724b7900fb12FC56E',
  chainId: '100',
  symbol: 'EURe',
  decimals: 18,
}
