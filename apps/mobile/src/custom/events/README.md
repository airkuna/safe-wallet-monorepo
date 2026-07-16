# Događaji feature-pack (E1)

> P2P event-ticketing bez posrednika — organizator prodaje ulaznice izravno u EURe na vlastiti
> Safe. Plan i faze: `docs/whitelabel-wallet/11-dogadjaji-p2p-ticketing.md`; ovaj pack je faza E1.

Overlay pack (host kod, nije submodule), gated brand manifestom `features.events`
(`isEventsBrand`). Strukturni blizanac Tržnice (`src/custom/marketplace/`).

- `catalog/` — event-as-config: `EventConfig`/`TicketTierConfig`, pilot registar (Money Motion
  2027, BlockSplit 2027), valuta-as-config (EURe na Gnosisu). `safeAddress` se **nikad ne
  izmišlja** — bez nje je event pregledan, a kupnja onemogućena. Backend katalog = E2 i mijenja
  samo ovaj modul.
- `logic/ticketOrder.ts` — čista aritmetika (string/cent/BigInt, bez floata), holder validacija
  za imenske ulaznice, referenca, share poruka, HR format datuma. `null` ⇒ CTA disabled.
- `state/useTickets.ts` — lokalna knjiga narudžbi u vlastitom MMKV namespaceu, izvan Reduxa.
  Status `pending` → `paid-unverified`; prava verifikacija uplate i QR ulaznice = E2/E3.
- `screens/` — Dogadjaji (hub), EventDetail (tieri), TicketCheckout (količina + holderi +
  plaćanje kroz postojeći Send flow: EIP-681 prefill preko `useScannedAddressToSend`, risk
  provjera primatelja se ne zaobilazi), MojeUlaznice (share prema organizatoru).

Thin seams u hostu: `app/(tabs)/dogadjaji.tsx` + registracija u `app/(tabs)/_layout.tsx`
(`href: null` bez flaga) + `app/events/{event,checkout,tickets}.tsx` wrapperi.

TODO (E3): PDF/Wallet pass izvoz ulaznica — upgrade path, v. handoff dogadjaji-3.
