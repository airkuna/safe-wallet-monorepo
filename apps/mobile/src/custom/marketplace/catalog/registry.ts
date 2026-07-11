import type { MerchantConfig } from './types'

/**
 * Registar trgovaca — MVP je katalog-as-config u binaryju (isti obrazac kao FF
 * `clubs/registry.ts`); prelazak na backend katalog je faza M2
 * (docs/whitelabel-wallet/09-trznica-marketplace.md) i mijenja samo ovaj modul.
 *
 * Crošulja podaci preuzeti s crosulja.hr 2026-07-11 (impressum + katalog);
 * cijene su aktualne akcijske cijene s PDV-om i dostavom (BoxNow) uračunatima.
 * `safeAddress` se upisuje tek kad trgovac deploya svoj Safe — do tada je
 * katalog pregledan, a plaćanje onemogućeno.
 */

const CROSULJA: MerchantConfig = {
  slug: 'crosulja',
  name: 'Crošulja',
  tagline: 'Navijačka elegancija. Business kombinacija.',
  town: 'Velika Gorica',
  story:
    'Simbol geografske, identitetske i povijesne ljepote Hrvatske — CROŠULJA. ' +
    'Muške košulje s uzorkom šahovnice, prva kolekcija od pet modela.',
  brand: { primaryHex: '#C8102E', accentHex: '#1A1A1A' },
  legal: {
    legalName: 'MARCIDEA d.o.o.',
    oib: '73208423335',
    address: 'Ulica Hrvatskog proljeća 63, 10410 Ribnica',
    email: 'info@crosulja.hr',
    phone: '+385 99 8745 847',
    web: 'crosulja.hr',
  },
  shipping: {
    flatEur: '0',
    note: 'PDV i dostava u najbliži BoxNow paketomat uračunati u cijenu (samo RH).',
  },
  products: [
    {
      id: 'croatica',
      name: 'Croatica',
      priceEur: '99.00',
      desc: 'Crveno-bijela šahovnica, slim fit.',
      story: 'Simbol tradicije, borbe, ljubavi prema domovini i trajnog sjećanja na prošlost.',
      sizes: ['S', 'M', 'L', 'XL', '2XL'],
      imageUrl: 'https://crosulja.hr/wp-content/uploads/2026/06/crvena-bijal-kosulja.png',
      productUrl: 'https://crosulja.hr/muski-modeli',
    },
    {
      id: 'plamen',
      name: 'Plamen',
      priceEur: '87.50',
      desc: 'Crvena šahovnica ton na ton, regular fit.',
      story: 'Simbol prošlosti i budućnosti, plamen identiteta, snage i velike želje za slobodom.',
      sizes: ['M', 'L', 'XL', '2XL'],
      imageUrl: 'https://crosulja.hr/wp-content/uploads/2026/06/kosulja-crvene-kockice.jpeg',
      productUrl: 'https://crosulja.hr/muski-modeli',
    },
    {
      id: 'jadran',
      name: 'Jadran',
      priceEur: '87.50',
      desc: 'Plava šahovnica, regular fit.',
      story:
        'Simbol povezanosti s prirodom, korijenima i slobodom, ali i snage koja dolazi iz dubine ' +
        'i mira koji dolazi s površine.',
      sizes: ['S', 'M', 'L', 'XL', '2XL'],
      imageUrl: 'https://crosulja.hr/wp-content/uploads/2026/06/plava-kosulja.png',
      productUrl: 'https://crosulja.hr/muski-modeli',
    },
    {
      id: 'bura',
      name: 'Bura',
      priceEur: '87.50',
      desc: 'Bijelo-siva šahovnica, slim fit.',
      story: 'Simbol mira, snažnog identiteta, hrvatskih kamenih pejsaža i čiste prirode.',
      sizes: ['M', 'L', 'XL', '2XL'],
      imageUrl: 'https://crosulja.hr/wp-content/uploads/2026/06/bijela-kosulja-1.png',
      productUrl: 'https://crosulja.hr/muski-modeli',
    },
    {
      id: 'velebit',
      name: 'Velebit',
      priceEur: '87.50',
      desc: 'Crna šahovnica ton na ton, slim fit.',
      story: 'Simbol izdržljivosti, prirodne snage i divlje ljepote koja definira Velebit i njegov krajolik.',
      sizes: ['M', 'L', 'XL', '2XL'],
      imageUrl: 'https://crosulja.hr/wp-content/uploads/2026/06/kosulja-crne-kockice-muska.jpeg',
      productUrl: 'https://crosulja.hr/muski-modeli',
    },
  ],
}

export const MERCHANTS: MerchantConfig[] = [CROSULJA]

export const MERCHANT_SLUGS = MERCHANTS.map((merchant) => merchant.slug)

export const DEFAULT_MERCHANT_SLUG = CROSULJA.slug

/** Trgovac po slugu; nepoznat slug → prvi u registru (nikad ne ruši UI). */
export const getMerchant = (slug: string | undefined): MerchantConfig =>
  MERCHANTS.find((merchant) => merchant.slug === slug) ?? MERCHANTS[0]

export const getProduct = (merchant: MerchantConfig, productId: string | undefined) =>
  merchant.products.find((product) => product.id === productId)
