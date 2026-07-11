import { DEFAULT_MERCHANT_SLUG, getMerchant, getProduct, MERCHANTS, MERCHANT_SLUGS } from './registry'
import { eurToCents } from '../logic/order'

/** Invariant testovi kataloga — svaki novi trgovac/proizvod mora ih proći. */
describe('marketplace registry', () => {
  it('has unique merchant slugs and unique product ids per merchant', () => {
    expect(new Set(MERCHANT_SLUGS).size).toBe(MERCHANTS.length)

    for (const merchant of MERCHANTS) {
      const ids = merchant.products.map((product) => product.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })

  it('every product has a parsable price, at least one size and a description', () => {
    for (const merchant of MERCHANTS) {
      expect(merchant.products.length).toBeGreaterThan(0)
      for (const product of merchant.products) {
        expect(eurToCents(product.priceEur)).not.toBeNull()
        expect(eurToCents(product.priceEur)).toBeGreaterThan(0)
        expect(product.sizes.length).toBeGreaterThan(0)
        expect(product.desc.length).toBeGreaterThan(0)
      }
    }
  })

  it('every merchant shipping config is parsable', () => {
    for (const merchant of MERCHANTS) {
      if (merchant.shipping) {
        expect(eurToCents(merchant.shipping.flatEur)).not.toBeNull()
        if (merchant.shipping.freeAboveEur !== undefined) {
          expect(eurToCents(merchant.shipping.freeAboveEur)).not.toBeNull()
        }
      }
    }
  })

  it('resolves merchants by slug with a safe fallback', () => {
    expect(getMerchant('crosulja').name).toBe('Crošulja')
    expect(getMerchant('nepostojeci').slug).toBe(DEFAULT_MERCHANT_SLUG)
    expect(getMerchant(undefined).slug).toBe(DEFAULT_MERCHANT_SLUG)
  })

  it('resolves products within a merchant', () => {
    const crosulja = getMerchant('crosulja')
    expect(getProduct(crosulja, 'croatica')?.priceEur).toBe('99.00')
    expect(getProduct(crosulja, 'nepostojeci')).toBeUndefined()
  })

  it('does not invent onchain addresses — payment stays disabled until a real Safe is registered', () => {
    for (const merchant of MERCHANTS) {
      if (merchant.safeAddress !== undefined) {
        expect(merchant.safeAddress).toMatch(/^0x[0-9a-fA-F]{40}$/)
      }
    }
  })
})
