import { isDonationsBrand } from '../isDonationsBrand'

/**
 * Prepoznaje donacijski link `https://domovina.ai/c/<slug>/doniraj` (paste u
 * Doniraj unosu, QR u skeneru) i vraća slug subjekta. Tolerantno: scheme i
 * `www.` su opcionalni, trailing segmenti (`/doniraj`, `/support`, query,
 * fragment) prolaze, `/c/<slug>` bez sufiksa također.
 */
export const parseDonationLink = (raw: string): string | null => {
  const match = /^(?:https?:\/\/)?(?:www\.)?domovina\.ai\/c\/([^/?#\s]+)(?:[/?#].*)?$/i.exec(raw.trim())
  if (!match) {
    return null
  }
  try {
    const slug = decodeURIComponent(match[1])
    return slug.length > 0 ? slug : null
  } catch {
    return null
  }
}

/**
 * Skenerski šav: donacijski URL → slug, ali SAMO za brandove s
 * `features.donations` — ostali brandovi zadržavaju postojeće ponašanje
 * skenera (URL = nevaljan kod).
 */
export const resolveDonationScan = (raw: string): string | null => (isDonationsBrand() ? parseDonationLink(raw) : null)
