import { getBrand } from '@/src/custom/brand'
import type { IdentityConfig } from './types'

/** Identity config from the brand manifest; absent → the whole feature is off. */
export const getIdentityConfig = (): IdentityConfig | undefined => getBrand().identity

export const isIdentityEnabled = (): boolean => getIdentityConfig() !== undefined

/** Chain the ENS registry lives on (resolution side). Defaults to mainnet. */
export const getResolverChainId = (): string => getIdentityConfig()?.resolverChainId ?? '1'
