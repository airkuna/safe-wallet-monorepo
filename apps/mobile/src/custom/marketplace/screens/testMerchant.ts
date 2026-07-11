import type { MerchantConfig } from '../catalog/types'

/** Zajednička test fixture trgovine — testovi ne ovise o stvarnom katalogu. */
export const TEST_MERCHANT_SAFE = '0x2222222222222222222222222222222222222222'

export const testMerchant = (overrides: Partial<MerchantConfig> = {}): MerchantConfig => ({
  slug: 'test-shop',
  name: 'Test Shop',
  tagline: 'Testne košulje',
  brand: { primaryHex: '#B3202C', accentHex: '#1A1A1A' },
  legal: { legalName: 'Test d.o.o.', oib: '12345678901', email: 'shop@test.hr' },
  safeAddress: TEST_MERCHANT_SAFE,
  shipping: { flatEur: '4.00', freeAboveEur: '100' },
  products: [
    {
      id: 'model-a',
      name: 'Model A',
      priceEur: '64.90',
      desc: 'Testna košulja A',
      sizes: ['M', 'L', 'XL'],
      material: '100% pamuk',
    },
    {
      id: 'model-b',
      name: 'Model B',
      priceEur: '59.90',
      desc: 'Testna košulja B',
      sizes: ['S', 'M'],
    },
  ],
  ...overrides,
})
