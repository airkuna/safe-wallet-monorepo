import { DONATIONS_ANON_KEY, PINKA_SCHEMA, getDonationsApiBaseUrl, getDonationsRestBaseUrl } from './config'
import type { CampaignResult, ContributionStatusRow, OnchainConfirmResponse, PinkaCampaignRow } from './types'

/**
 * Tanki klijent za pinka donacijski backend (domovina-api). Semantika
 * povratnih vrijednosti je "graceful": mrežni pad / 5xx / nekonfiguriran
 * backend vraća `null` (odnosno `unreachable`) — donacija NIKAD ne ovisi o
 * backendu; confirm je best-effort instant kredit, cron `pinka-onchain-ingest`
 * je fallback koji kreditira u ~1–2 min ([15] §5).
 */

const REQUEST_TIMEOUT_MS = 10_000

/** PostgREST RPC poziv (schema `pinka_finance`, javni anon key). */
const rpcFetch = async (fn: string, body: Record<string, unknown>): Promise<Response | null> => {
  const base = getDonationsRestBaseUrl()
  if (base === undefined) {
    return null
  }
  try {
    return await fetch(`${base}/rpc/${fn}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        apikey: DONATIONS_ANON_KEY,
        authorization: `Bearer ${DONATIONS_ANON_KEY}`,
        'content-profile': PINKA_SCHEMA,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch {
    return null
  }
}

/**
 * Slug iz donacijskog URL-a → kandidati za `subject_ref`. Web ruta
 * `/c/<slug>/doniraj` mapira slug u interni channel id zamjenom `-` → `_`
 * (app_router.dart); šaljemo oba kandidata jer RPC matcha `any`.
 */
export const slugToSubjectRefs = (slug: string): string[] => {
  const trimmed = slug.trim()
  return [...new Set([trimmed.replace(/-/g, '_'), trimmed])].filter((ref) => ref.length > 0)
}

/**
 * Aktivna kampanja za slug subjekta (`active_campaign_for_subject`, subjekt
 * tipa `podcast_channel` — isto kao web donacijska stranica).
 */
export const fetchActiveCampaign = async (slug: string): Promise<CampaignResult> => {
  const refs = slugToSubjectRefs(slug)
  if (refs.length === 0) {
    return { kind: 'not_found' }
  }
  const response = await rpcFetch('active_campaign_for_subject', {
    p_subject_type: 'podcast_channel',
    p_subject_refs: refs,
  })
  if (response === null || !response.ok) {
    return { kind: 'unreachable' }
  }
  try {
    const body: unknown = await response.json()
    if (!Array.isArray(body)) {
      return { kind: 'unreachable' }
    }
    const row = body[0] as PinkaCampaignRow | undefined
    return row === undefined ? { kind: 'not_found' } : { kind: 'ok', campaign: row }
  } catch {
    return { kind: 'unreachable' }
  }
}

/**
 * Instant kredit donacije: backend verificira receipt na Gnosis RPC-u i
 * idempotentno kreditira EURe transfere na campaign Safe. `null` = nedostupan
 * (cron fallback pokriva knjiženje).
 */
export const confirmContribution = async (
  campaignId: string,
  txHash: string,
): Promise<OnchainConfirmResponse | null> => {
  const base = getDonationsApiBaseUrl()
  if (base === undefined) {
    return null
  }
  try {
    const response = await fetch(`${base}/pinka-onchain-confirm`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ campaign_id: campaignId, tx_hash: txHash }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    if (!response.ok) {
      return null
    }
    return (await response.json()) as OnchainConfirmResponse
  } catch {
    return null
  }
}

/** Stanje doprinosa (`contribution_status` RPC); `null` = nedostupan/nepoznat. */
export const fetchContributionStatus = async (contributionId: string): Promise<ContributionStatusRow | null> => {
  const response = await rpcFetch('contribution_status', { p_contribution_id: contributionId })
  if (response === null || !response.ok) {
    return null
  }
  try {
    const body: unknown = await response.json()
    if (!Array.isArray(body)) {
      return null
    }
    return (body[0] as ContributionStatusRow | undefined) ?? null
  } catch {
    return null
  }
}
