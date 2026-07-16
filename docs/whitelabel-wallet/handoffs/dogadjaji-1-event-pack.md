# Događaji 1 (E1) — feature-pack `events`: pilot katalog + kupnja ulaznice EURe-om

> Handoff prompt za praznu Claude Code sesiju. Repo: `/Users/ms/git/safe-global/safe-wallet-monorepo`, grana `custom`.
> Prije početka pročitaj [handoffs/README.md](README.md) (pravila za sve faze) i
> [11 — Događaji](../11-dogadjaji-p2p-ticketing.md) (§2 pilot, §3.1 arhitektura, §4 odluke).
> Uzor u kodu: `apps/mobile/src/custom/marketplace/` (Tržnica M1) — ovaj pack je njegov
> strukturni blizanac za evente. Idejni prethodnik: `apps/mobile/src/custom/ff/docs/handoffs/faza-10-dogadjanja.md`.
>
> _EN abstract: build the `events` overlay feature-pack (event catalog as config, ticket
> checkout with named-ticket holders, EURe payment via the existing Send rail, local "My
> tickets" book in MMKV). No backend — that is E2._

## Cilj

Posjetitelj u brandiranom buildu (`features.events`) vidi tab **Događaji**, pregleda pilot
katalog (Money Motion 2027, BlockSplit), odabere tier i količinu, za imenske tiere unese ime i
prezime po ulaznici, plati **točan EURe iznos izravno na organizatorov Safe** kroz postojeći
Send flow, i vidi narudžbu u **Moje ulaznice** (lokalno, MMKV) s onchain referencom i share
fallbackom prema organizatoru. `safe`/`ff` buildovi ostaju netaknuti.

## Kontekst i izvori

- **Payment rail (kopiraj obrazac 1:1)**: `apps/mobile/src/custom/marketplace/screens/Checkout.tsx` —
  `toBaseUnits(total, currency.decimals)` → `Eip681Transfer { recipient: safeAddress, chainId,
tokenAddress, value }` → `useScannedAddressToSend().sendPaymentRequestToRecipient(transfer, 'replace')`.
  Narudžba se sprema u MMKV **prije** predaje Send flowu (referenca preživi prekinuto plaćanje).
- **Novčana aritmetika**: `marketplace/logic/order.ts` (`eurToCents`, `centsToEur`, `formatEur`,
  `toBaseUnits`, `buildOrderReference`, `composeOrderMessage`) — string/cent/BigInt, bez floata,
  `null` ⇒ CTA disabled. Ne dupliciraj slijepo: izvuci zajedničko ili preuzmi obrazac s novim
  imenima u `events/logic/` (odluka u sesiji; zajednički util modul je poželjan ako je čist).
- **MMKV state izvan Reduxa**: `marketplace/state/useOrders.ts` (useSyncExternalStore + vlastiti
  MMKV namespace) — isti obrazac za `events/state/useTickets.ts`.
- **Flag gating**: `marketplace/isMarketplaceBrand.ts` (`getBrand().features?.marketplace === true`).
- **Thin seams**: `apps/mobile/src/app/(tabs)/trznica.tsx` + registracija u
  `apps/mobile/src/app/(tabs)/_layout.tsx` (`href: flag ? undefined : null`) + stack wrapperi u
  `apps/mobile/src/app/marketplace/*.tsx` — isti oblik za `dogadjaji`/`events` rute.
- **Valuta**: `marketplace/catalog/currency.ts` — `DEFAULT_CURRENCY` = EURe
  `0xcB444e90D8198415266c6a2724b7900fb12FC56E`, chainId `100`, 18 decimala; nijedan ekran ne
  hardkodira simbol/adresu/decimale.
- **Pilot podaci (snimka Entrija 2026-07-16)**: v. [11](../11-dogadjaji-p2p-ticketing.md) §2 —
  MoMo 2027: 10.–11.3.2027., Zagrebački velesajam; tieri Super Early Bird 149 € i Student 49 €
  (bez ikakvog fee-a kod nas!); ulaznice imenske i neprenosive. BlockSplit: izdanje 2027 još
  nema termin — unesi kao najavljen event bez tiera (kupnja skrivena).

## Preduvjeti

**Ručni (vlasnik):**

| Preduvjet                                                 | Zašto                                | Status |
| --------------------------------------------------------- | ------------------------------------ | ------ |
| Organizatorov Safe za MoMo/BlockSplit (Gnosis)            | bez adrese kupnja ostaje onemogućena | ⬜     |
| Pilot potvrda Luke Sučića (tieri, cijene, pravni subjekt) | katalog = stvarni podaci             | ⬜     |
| Odluka o brand manifestu koji nosi `features.events`      | gating                               | ⬜     |

**Bez preduvjeta faza je izvršiva do kraja**: katalog se izgradi sa `safeAddress: undefined`
(pregledan, kupnja disabled) + test fixture event s adresom za testove; upis stvarnih adresa je
naknadna config izmjena.

## Opseg

**In:** novi pack `apps/mobile/src/custom/events/` — `index.ts` (barrel), `isEventsBrand.ts`,
`strings.ts` (sav HR copy, sentence case), `catalog/{types,registry,currency}.ts`
(`EventConfig`, `TicketTierConfig`, `OrganizerConfig`; pilot eventi kao podaci),
`logic/ticketOrder.ts` (totali, referenca, holderi, share poruka), `state/useTickets.ts` (MMKV
knjiga narudžbi/ulaznica, status `pending|paid-unverified`), ekrani
`screens/{Dogadjaji,EventDetail,TicketCheckout,MojeUlaznice}.tsx`; thin seams: tab
`(tabs)/dogadjaji.tsx` + `_layout.tsx` registracija + `app/events/*.tsx` stack wrapperi;
kolocirani testovi za svaki modul.

**Out (svjesno):** backend (E2 — narudžba živi samo lokalno), QR ulaznice i skener (E3 — u
"Moje ulaznice" se prikazuje referenca + tx status, ne QR), discovery/kalendar (E4), prenosivost
i preprodaja ulaznica, refund UI, add-onovi (smještaj) — modeliraj tier tako da add-on kasnije
stane (opis + cijena su dovoljni), ali ne gradi UI.

## Model (ugovor za E2+)

`EventConfig`: `slug`, `naziv`, `opisHr`, `opisEn?`, `tip` (`'konferencija'|'koncert'|'meetup'|'kamp'|'ostalo'`),
`startIso`, `endIso?`, `venue { naziv, adresa?, grad }`, `organizer { naziv, email, web?, username? }`,
`safeAddress?` (checksummed; **nikad se ne izmišlja** — bez nje kupnja disabled), `currency?`
(default EURe), `tiers: TicketTierConfig[]`, `coverUrl?`.

`TicketTierConfig`: `id`, `naziv`, `opisHr?`, `priceEur` (**decimal string**, npr. `'149.00'`),
`imenska: boolean` (traži ime/prezime po komadu), `maxPoNarudzbi?`, `saleStartIso?`, `saleEndIso?`,
`napomena?` (npr. "uz predočenje studentske").

`TicketOrder` (MMKV): `id` (= referenca, npr. `MOMO-LX4K2-518` — `buildOrderReference` obrazac),
`eventSlug`, `tierId`, `quantity`, `holders: { fullName, email? }[]` (prazno za neimenske),
`totals`, `payerSafeAddress`, `txHash?`, `status: 'pending' | 'paid-unverified'`, `createdAtMs`.
Status `paid-unverified` = kupac se vratio iz Send flowa (tx potpisana); prava verifikacija = E2.

## Sigurnost / privatnost

- Kupnja isključivo kroz postojeći Send flow (risk validacija primatelja) — nikakav vlastiti
  signing/tx-building u packu.
- Holderi (imena, e-mail) su osobni podaci: samo lokalni MMKV u E1, ne šalju se nikamo osim
  share sheetom koji korisnik sam okine.
- Iznos: isključivo `toBaseUnits` string aritmetika; `null` ⇒ gumb disabled (nikad tihi krivi
  iznos). Kapacitet/inventory se u E1 NE simulira (nema backend istine) — ne prikazuj brojače.

## Koraci

1. `git fetch upstream && git merge upstream/dev` (grana `custom`); pročitaj izvore iz
   "Kontekst" (Checkout.tsx, order.ts, useOrders.ts, faza-10-dogadjanja.md).
2. Skeleton packa + `isEventsBrand` + registracija taba (thin seams), pa katalog s tipovima i
   pilot podacima.
3. `logic/ticketOrder.ts` s testovima (totali za N komada, referenca, holder validacija:
   imenska ⇒ svih N imena popunjeno).
4. Ekrani redom Dogadjaji → EventDetail → TicketCheckout (payment rail + MMKV zapis prije Send
   flowa) → MojeUlaznice; testovi uz svaki (MMKV stateful fake obrazac iz
   `useOrders.test.ts`).
5. `node scripts/verify.mjs --changed --workspace=mobile`; provjeri da `safe` build (bez flaga)
   nema tab; commit `feat(mobile): events feature-pack — P2P ticketing pilot (E1)`.

## Kriteriji prihvaćanja

1. Build s `features.events` prikazuje tab Događaji s pilot katalogom; build bez flaga nema ni
   tab ni rute (href null obrazac).
2. Kupnja imenskog tiera traži točno `quantity` imena; gumb za plaćanje je disabled dok su
   podaci nepotpuni, dok event nema `safeAddress`, ili dok je `toBaseUnits` `null`.
3. Plaćanje predaje Send flowu točan iznos u base-units na organizatorov Safe; narudžba je u
   MMKV-u prije navigacije; nakon povratka status je `paid-unverified` s tx hashom (best
   effort).
4. Moje ulaznice prikazuje narudžbe s referencom, holderima i share porukom organizatoru
   (referenca + stavke + payer Safe).
5. Kolocirani testovi za catalog/logic/state/ekrane; `node scripts/verify.mjs --changed
--workspace=mobile` zelen; `safe`/`ff` buildovi netaknuti.
6. Ažuriran status E1 u [handoffs/README.md](README.md) i [11](../11-dogadjaji-p2p-ticketing.md) §5.

## Zapisnik izvršenja

(popunjava agent koji izvrši fazu)
