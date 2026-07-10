import type { CoreTypes } from '@walletconnect/types'
import { getBrand, getPrimaryScheme } from '@/src/custom/brand'

const brand = getBrand()
const primaryScheme = getPrimaryScheme()

// Brand builds advertise their own name and deep-link scheme so dApps display
// the right wallet and redirect back into the right app; the stock `safe`
// brand resolves to the exact upstream values. `url`/`icons` stay on the Safe
// web presence until brands can ship their own (needs a manifest field).
export const SAFE_WALLET_METADATA: CoreTypes.Metadata = {
  name: brand.name,
  description: 'Safe multi-signature wallet',
  url: 'https://app.safe.global',
  icons: ['https://app.safe.global/favicons/favicon.ico'],
  // Returns the user to the dApp after approving a deep-linked session; keep `native` in sync with app.config.ts scheme.
  redirect: {
    native: `${primaryScheme}://`,
    // The universal link belongs to the Safe web app; advertising it from a
    // brand build would bounce users to Safe's site instead of the brand app.
    ...(brand.id === 'safe' ? { universal: 'https://app.safe.global' } : {}),
  },
}
