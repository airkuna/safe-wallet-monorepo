# Događaji feature-pack (E1 + E2 klijent + E3 QR/check-in)

> P2P event-ticketing bez posrednika — organizator prodaje ulaznice izravno u EURe na vlastiti
> Safe. Plan i faze: `docs/whitelabel-wallet/11-dogadjaji-p2p-ticketing.md`; ovaj pack pokriva
> E1 i app-stranu E2 (backend = domovina-api).

Overlay pack (host kod, nije submodule), gated brand manifestom `features.events`
(`isEventsBrand`). Strukturni blizanac Tržnice (`src/custom/marketplace/`).

- `catalog/` — event-as-config: `EventConfig`/`TicketTierConfig`, pilot registar (Money Motion
  2027, BlockSplit 2027), valuta-as-config (EURe na Gnosisu). `safeAddress` se **nikad ne
  izmišlja** — bez nje je event pregledan, a kupnja onemogućena. `backendSource.ts` (E2) povlači
  `events-feed` s domovina-api i merge-a ga u registry (backend pobjeđuje po slugu, config
  eventi ostaju kao fallback); bez `events.apiBaseUrl` u brand manifestu sve ostaje config-only.
- `api/` (E2) — REST klijent za domovina-api events funkcije (`events-order`, `events-confirm`,
  `events-tickets`, `events-feed`) + `useTicketSync`: narudžba s rezervacijom PRIJE plaćanja
  (backend nedostupan ⇒ točno E1 fallback; eksplicitno odbijanje, npr. rasprodano, blokira
  plaćanje), retroaktivni confirm tx hasha i dohvat izdanih ulaznica (QR token stiže jednokratno
  i čuva se lokalno). Backend nikad ne drži ključeve ni sredstva.
- `logic/ticketOrder.ts` — čista aritmetika (string/cent/BigInt, bez floata), holder validacija
  za imenske ulaznice, referenca, share poruka, HR format datuma. `null` ⇒ CTA disabled.
- `state/useTickets.ts` — lokalna knjiga narudžbi u vlastitom MMKV namespaceu, izvan Reduxa.
  Status `pending` → `paid-unverified` → `issued` (backend ulaznice sa serialom/holderom).
- `logic/qrPayload.ts` (E3) — QR format ulaznice `dgdj1:<64-hex token>`; parser glasno odbija
  sve ostalo. **Tvrdo pravilo**: ticket QR nikad ne ide kroz `resolveScannedAddress` (payment
  choke-point) i obrnuto — payment skener vraća `null` za `dgdj1:` payloade (test u
  `qrPayload.test.ts`), pa formati ostaju međusobno gluhi bez ijedne izmjene upstream Send flowa.
- `state/useEntryLog.ts` + `state/useScannerAuth.ts` (E3) — MMKV log skenova na organizatorovom
  uređaju (brojač ulazaka, lokalni anti-double-entry pre-check, audit; sprema se samo fingerprint
  tokena) + pristupni token skenera (GoTrue JWT org admina; transport, NE autorizacija).
- `screens/` — Dogadjaji (hub; backend katalog uz config fallback), EventDetail (tieri),
  TicketCheckout (količina + holderi + backend narudžba pa plaćanje kroz postojeći Send flow:
  EIP-681 prefill preko `useScannedAddressToSend`, risk provjera primatelja se ne zaobilazi),
  MojeUlaznice (sync + izdane ulaznice; QR po komadu za izdane, share prema organizatoru za
  lokalne narudžbe), UlaznicaQr (E3: QR render, crno-na-bijelom neovisno o temi), SkenerUlaza
  (E3: organizatorov skener — reuse host `QrCamera`, vlastiti parser, **online-only** redeem
  kroz `events-checkin`; autorizacija isključivo server-side u `redeem_ticket` RPC-u).

Thin seams u hostu: `app/(tabs)/dogadjaji.tsx` + registracija u `app/(tabs)/_layout.tsx`
(`href: null` bez flaga) + `app/events/{event,checkout,tickets,ticket,scanner}.tsx` wrapperi.
Ulaz u skener: long-press na "Tvoj događaj ovdje" karticu huba (organizator se klijentski ne
može dokazati, pa je ulaz namjerno samo diskretan — pravo skeniranja provjerava server).

TODO (post-E3): PDF/Apple-Google Wallet pass izvoz ulaznica; offline check-in (potpisani
Ed25519 voucher + odgođeni redeem — upgrade path u Zapisniku E3); self-service skener osoblje (E4).
