# Događaji feature-pack (E1 + E2 klijent)

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
- `screens/` — Dogadjaji (hub; backend katalog uz config fallback), EventDetail (tieri),
  TicketCheckout (količina + holderi + backend narudžba pa plaćanje kroz postojeći Send flow:
  EIP-681 prefill preko `useScannedAddressToSend`, risk provjera primatelja se ne zaobilazi),
  MojeUlaznice (sync + izdane ulaznice; share prema organizatoru za lokalne narudžbe).

Thin seams u hostu: `app/(tabs)/dogadjaji.tsx` + registracija u `app/(tabs)/_layout.tsx`
(`href: null` bez flaga) + `app/events/{event,checkout,tickets}.tsx` wrapperi.

TODO (E3): PDF/Wallet pass izvoz ulaznica — upgrade path, v. handoff dogadjaji-3.
