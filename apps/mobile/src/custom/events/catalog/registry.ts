import type { EventConfig, TicketTierConfig } from './types'

/**
 * Registar evenata — MVP je katalog-as-config u binaryju (isti obrazac kao
 * Tržnica `catalog/registry.ts`); prelazak na backend katalog je faza E2
 * (docs/whitelabel-wallet/11-dogadjaji-p2p-ticketing.md) i mijenja samo ovaj
 * modul.
 *
 * Pilot podaci preuzeti s Entrio stranica 2026-07-16 (cijene BEZ Entrio
 * booking fee-a — P2P model naknadu svodi na nulu). `safeAddress` se upisuje
 * tek kad organizator deploya svoj Safe — do tada je event pregledan, a
 * kupnja onemogućena.
 */

const MONEY_MOTION_2027: EventConfig = {
  slug: 'money-motion-2027',
  naziv: 'Money Motion 2027',
  opisHr:
    'Peto izdanje vodeće FinTech konferencije Srednje i Istočne Europe. Nakon izdanja 2026. s ' +
    'više od 3000 sudionika, preko 170 govornika i pet pozornica — bankarstvo, payment ' +
    'industrija, kripto, retail, AI i blockchain na jednom mjestu.',
  opisEn:
    'The 5th edition of the leading FinTech conference in Central and Eastern Europe. After a ' +
    '2026 edition with 3,000+ attendees, 170+ speakers and five stages — banking, payments, ' +
    'crypto, retail, AI and blockchain in one place.',
  tip: 'konferencija',
  startIso: '2027-03-10',
  endIso: '2027-03-11',
  venue: { naziv: 'Zagrebački velesajam', grad: 'Zagreb' },
  organizer: { naziv: 'Money Motion', email: 'tickets@money-motion.eu', web: 'money-motion.eu' },
  tiers: [
    {
      id: 'super-early-bird',
      naziv: 'Super Early Bird',
      opisHr: 'Ulaznica vrijedi za sve dane konferencije.',
      priceEur: '149.00',
      imenska: true,
      napomena:
        'Ulaznica glasi na ime i prezime i nije prenosiva; na registracijskom pultu se mijenja za akreditaciju.',
    },
    {
      id: 'student',
      naziv: 'Studentska',
      opisHr: 'Ulaznica vrijedi za sve dane konferencije.',
      priceEur: '49.00',
      imenska: true,
      napomena: 'Na ulazu je obavezno predočenje potvrde o studentskom statusu; u protivnom ulaznica ne vrijedi.',
    },
  ],
}

const BLOCKSPLIT_2027: EventConfig = {
  slug: 'blocksplit-2027',
  naziv: 'BlockSplit Unconference 2027',
  opisHr:
    'Trodnevni unconference summer camp u Splitu — manji, promišljeniji format u kojem program ' +
    'rade sami sudionici: sessioni, radionice i radne grupe nastaju na licu mjesta, a večeri ' +
    'pripadaju Splitu.',
  opisEn:
    'A 3-day unconference summer camp in Split — a smaller, more intentional format where the ' +
    'agenda is made by participants on-site; evenings belong to Split.',
  tip: 'kamp',
  venue: { naziv: 'Split', grad: 'Split' },
  organizer: { naziv: 'UBIK', email: 'blocksplit@ubik.hr', web: 'blocksplit.net' },
  // Izdanje 2027 još nema potvrđen termin ni tiere — event je najavljen.
  tiers: [],
}

export const EVENTS: EventConfig[] = [MONEY_MOTION_2027, BLOCKSPLIT_2027]

export const EVENT_SLUGS = EVENTS.map((event) => event.slug)

/** Event po slugu; nepoznat slug → prvi u registru (nikad ne ruši UI). */
export const getEvent = (slug: string | undefined): EventConfig =>
  EVENTS.find((event) => event.slug === slug) ?? EVENTS[0]

export const getTier = (event: EventConfig, tierId: string | undefined): TicketTierConfig | undefined =>
  event.tiers.find((tier) => tier.id === tierId)

/**
 * Prodajni prozor tiera (usporedba ISO datuma leksikografski — YYYY-MM-DD).
 * `todayIso` je injektabilan radi determinističkih testova.
 */
export const isTierOnSale = (tier: TicketTierConfig, todayIso: string): boolean => {
  if (tier.saleStartIso !== undefined && todayIso < tier.saleStartIso) {
    return false
  }
  if (tier.saleEndIso !== undefined && todayIso > tier.saleEndIso) {
    return false
  }
  return true
}
