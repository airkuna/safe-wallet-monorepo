/**
 * Backend tipovi pinka donacijskog interfejsa — ugovor je fiksan (domovina-api:
 * `active_campaign_for_subject` RPC, `pinka-onchain-confirm` edge fn,
 * `contribution_status` RPC); konzumira se read-only + confirm POST.
 */

/** Red kampanje iz `active_campaign_for_subject` RPC-a (stats flat, top-level). */
export type PinkaCampaignRow = {
  id: string
  slug: string
  /** donation | crowdfund | tokenization | tickets | realestate */
  type: string
  title: string
  description: string | null
  /** Cilj u centima; null = open-ended donacija. */
  goal_cents: number | null
  min_contribution_cents: number
  currency: string
  cover_image_url: string | null
  /** active | funded (RPC vraća samo javne aktivne kampanje). */
  state: string
  /** Per-campaign Gnosis Safe; null → kampanja ne prima on-chain uplate. */
  destination_address: string | null
  chain: string
  youtube_channel_id: string | null
  total_raised_cents: number
  contribution_count: number
  contributor_count: number
}

/**
 * Rezultat dohvaćanja kampanje: `not_found` je autoritativan odgovor backenda
 * (subjekt nema aktivnu kampanju), `unreachable` je mrežni pad / 5xx /
 * nekonfiguriran backend (graceful null semantika).
 */
export type CampaignResult =
  | { kind: 'ok'; campaign: PinkaCampaignRow }
  | { kind: 'not_found' }
  | { kind: 'unreachable' }

/**
 * Odgovor `pinka-onchain-confirm` edge fn. `mined: false` = tx još nije
 * uključen u blok (retry kasnije); `credited` = broj kreditiranih EURe
 * transfera iz receipta (idempotentno s cron indexerom).
 */
export type OnchainConfirmResponse = {
  ok: boolean
  mined?: boolean
  reverted?: boolean
  block?: number | null
  credited?: number
  results?: { log: number; status: string; contribution_id?: string; cents?: number; error?: string }[]
}

/** Red iz `contribution_status` RPC-a (guest polling knjiženja). */
export type ContributionStatusRow = {
  state: string
  paid_at: string | null
}
