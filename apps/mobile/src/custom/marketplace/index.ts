export { isMarketplaceBrand } from './isMarketplaceBrand'
export { MERCHANTS, MERCHANT_SLUGS, DEFAULT_MERCHANT_SLUG, getMerchant, getProduct } from './catalog/registry'
export { DEFAULT_CURRENCY } from './catalog/currency'
export type {
  MerchantConfig,
  MerchantBrand,
  MerchantLegal,
  ProductConfig,
  ShippingConfig,
  CurrencyConfig,
} from './catalog/types'
export { mpStrings } from './strings'
export { merchantColors, contrastColor } from './theme/merchantColors'
export { useOrders, addOrder, setOrderStatus } from './state/useOrders'
export type { Order, OrderStatus } from './state/useOrders'
