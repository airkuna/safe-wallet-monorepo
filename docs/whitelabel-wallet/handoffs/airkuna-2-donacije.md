# airKUNA 2 (A2) — donations feature-pack (`src/custom/donations/`)

> Handoff prompt za praznu Claude Code sesiju. Repo: `/Users/ms/git/safe-global/safe-wallet-monorepo`, grana `custom`.
> Prije početka pročitaj [handoffs/README.md](README.md) i **obavezno** [15 — airKUNA wallet](../15-airkuna-wallet.md) §5 (donacijski interfejs — spec i sequence dijagram su SSOT; ne re-izvoditi format iz drugih izvora).

## Cilj

Korisnik airkuna builda može donirati kampanji na domovina.ai: unese slug (ili otvori
link/skenira QR s `https://domovina.ai/c/<slug>/doniraj`), app dohvati kampanju, korisnik upiše
iznos u EUR, plaćanje ide **postojećim Send flowom** (EIP-681 prefill, ista risk validacija), a
donacija se best-effort odmah proknjiži preko `pinka-onchain-confirm` (cron je fallback). Pack je
strukturni blizanac events packa; brandovi bez `features.donations` ostaju netaknuti.

## Kontekst i izvori

- [15 — airKUNA wallet](../15-airkuna-wallet.md) §5: chain 100, EURe `0x420CA0f9B9b604cE0fd9C18EF134C705e5Fa3430`, EIP-681 format, `wei = centi × 1e16`, RPC `active_campaign_for_subject`, edge fns `pinka-onchain-confirm` / `contribution_status`, cron `pinka-onchain-ingest` (~1–2 min). Backend ugovor u `domovina.ai` repou: `lib/pinka_sdk/src/pinka_config.dart` + edge funkcije.
- **Strukturni uzor — events pack** `apps/mobile/src/custom/events/`:
  - `isEventsBrand.ts` → gate obrazac (`getBrand().features?.X === true`);
  - `api/config.ts` → `apiBaseUrl` iz manifesta, trailing-slash strip;
  - `api/client.ts` → tanki REST klijent, graceful null semantika (mrežni pad / 5xx / nekonfiguriran backend → `null`), `AbortSignal.timeout(10_000)`;
  - `api/useTicketSync.ts` → **tx-hash → backend confirm obrazac**: optimistički lokalni zapis + best-effort confirm odmah, retroaktivni sync za zaostale (`syncTicketOrders`); donacije rade isto — **bez novih šavova u ExecuteTx/Send**;
  - `screens/TicketCheckout.tsx` → prefill Send flowa preko `useScannedAddressToSend().sendPaymentRequestToRecipient`;
  - `strings.ts` → HR copy na jednom mjestu.
- EIP-681 alati (reuse, ne pisati novo): `packages/utils/src/utils/eip681.ts` (`generateEip681Uri`, `parseEip681Uri`, `isEip681Uri`).
- Deep link `airkuna://pay?uri=<eip681>` **već radi bez koda**: `src/app/pay.tsx` → `src/features/Send/PayRequestRedirect.tsx` — donacijski EIP-681 s domovina.ai stranice prolazi tim putem. A2 samo dodaje test za donacijski slučaj.
- Scanner obrazac: `src/components/Camera/scannedAddress.ts` (kako se prepoznaju EIP-681 QR-ovi) — EIP-681 QR s donacijske stranice već radi kroz fazu 3.
- Tab šav obrazac: `src/app/(tabs)/_layout.tsx` (`href: isEventsBrand() ? undefined : null`) + route wrapper `src/app/(tabs)/dogadjaji.tsx`.
- Manifest polje `donations.apiBaseUrl` + `features.donations` postoje od A1 ([airkuna-1-brand.md](airkuna-1-brand.md)).

## Preduvjeti

**Ručni:** pinka backend allowlist/CORS ako edge funkcije gate-aju origin (provjeri prvim pozivom; [15] §8) — nije blokada, klijent je graceful. OS-level universal link za `https://domovina.ai/...` (AASA + entitlements) je **izvan opsega** — ručni preduvjet u [15] §8.

**Automatski:** A1 mergean (schema polje + manifest); faza 3 (EIP-681 pipeline); events pack kao uzor.

## Opseg

**In:**

- Novi pack `apps/mobile/src/custom/donations/` (struktura ispod).
- Doniraj tab (uvjetno na `features.donations`) + route wrapperi.
- In-app prepoznavanje `https://domovina.ai/c/<slug>/doniraj` URL-a: u Doniraj unosu (paste) i u scanneru (QR s tim URL-om → Doniraj screen s prefillanim slugom).
- Best-effort confirm + retroaktivni sync (useTicketSync obrazac).
- Testovi za sve navedeno.

**Out (svjesno):**

- OS universal link (AASA) — ručni preduvjet.
- Zero-fee UX u Send confirmu → A3.
- Povijest donacija s backenda (server-side lista) — MVP čuva samo lokalni zapis; `contribution_status` služi za potvrdu knjiženja.
- Bilo kakvo diranje `pinka` backenda — ugovor je fiksan, konzumira se read-only + confirm POST.

## Točne datoteke i šavovi

Novi pack (sve novo, kolocirani testovi uz svaku datoteku):

| Datoteka                                       | Sadržaj                                                                                                                                                                                             |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/custom/donations/isDonationsBrand.ts`     | gate: `getBrand().features?.donations === true` (uzor `isEventsBrand.ts`)                                                                                                                           |
| `src/custom/donations/api/config.ts`           | `getDonationsApiBaseUrl()` iz `getBrand().donations?.apiBaseUrl` (uzor events `api/config.ts`)                                                                                                      |
| `src/custom/donations/api/pinkaClient.ts`      | `fetchActiveCampaign(slug)` (RPC `active_campaign_for_subject`), `confirmContribution(campaignId, txHash)` (`pinka-onchain-confirm`), `fetchContributionStatus(...)` — graceful null semantika      |
| `src/custom/donations/api/types.ts`            | backend tipovi (kampanja, confirm response, status)                                                                                                                                                 |
| `src/custom/donations/logic/donationAmount.ts` | centi ↔ wei BigInt aritmetika (`centi × 10n ** 16n`) + sastavljanje `Eip681Transfer` (EURe adresa + chain 100 iz [15] §5 kao konstante packa, valuta-as-config komentar) preko `generateEip681Uri` |
| `src/custom/donations/logic/donationLink.ts`   | parse `https://domovina.ai/c/<slug>/doniraj` → slug (i tolerantno: s/bez trailing segmenata)                                                                                                        |
| `src/custom/donations/state/useDonations.ts`   | MMKV lokalni zapis donacija (uzor `state/useTickets.ts`): slug, campaignId, iznos, txHash?, confirmed?                                                                                              |
| `src/custom/donations/api/useDonationSync.ts`  | `recordDonation` (lokalni zapis + best-effort confirm) + `syncDonations` retroaktivni confirm (uzor `useTicketSync.ts`)                                                                             |
| `src/custom/donations/screens/Doniraj.tsx`     | slug unos / prefill iz linka → kampanja (naziv, destination) → iznos → `sendPaymentRequestToRecipient` (uzor `TicketCheckout.tsx`)                                                                  |
| `src/custom/donations/strings.ts`              | HR copy, sentence case, bez emojija                                                                                                                                                                 |
| `src/custom/donations/index.ts`                | javni exporti packa                                                                                                                                                                                 |

Šavovi (~1 linija po šavu, upstream datoteke):

| Datoteka                                  | Šav                                                                                                                                                                                          |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/(tabs)/_layout.tsx`              | novi `Tabs.Screen name="doniraj"` s `href: isDonationsBrand() ? undefined : null` (obrazac `dogadjaji` taba; ikona: postojeći `TabBarIcon` set — npr. `heart` ako postoji, inače najbliža)   |
| `src/app/(tabs)/doniraj.tsx`              | **novo** — route wrapper koji renderira `Doniraj` screen                                                                                                                                     |
| `src/components/Camera/scannedAddress.ts` | prepoznavanje domovina.ai donacijskog URL-a → navigacija na Doniraj (samo ako postojeća struktura to traži ovdje; alternativno handler u scan callbacku — odaberi minimalni šav i zabilježi) |

Napomena: postojeća FF ruta `src/app/ff/doniraj.tsx` je **drugi namespace** (`/ff/doniraj` vs tab `/doniraj`) — nema kolizije; zabilježi u Zapisnik da je provjereno.

## Koraci

1. **Recon:** pročitaj events pack u cijelosti (struktura + testovi), `eip681.ts`, `PayRequestRedirect.tsx`, `scannedAddress.ts`, `(tabs)/_layout.tsx`. Regression checklist: `safe`/`domovina` buildovi bez `features.donations` ne smiju mountati ništa novo.
2. **Logic sloj prvo** (`donationAmount.ts`, `donationLink.ts`) + testovi: centi × 1e16 kao BigInt (rubni slučajevi: 0, 1 cent, veliki iznosi, nema float aritmetike), EIP-681 output identičan formatu iz [15] §5; link parse (validni/nevalidni URL-ovi).
3. **API sloj** (`config.ts`, `types.ts`, `pinkaClient.ts`) + MSW testovi (uzor `client.test.ts` u events packu): sretan put, 5xx → null, timeout → null, nekonfiguriran backend → null.
4. **State + sync** (`useDonations.ts`, `useDonationSync.ts`) + testovi: `recordDonation` zove confirm best-effort (pad confirma NE ruši zapis — cron je fallback, [15] §5); `syncDonations` retroaktivno confirmira zapise s txHash bez potvrde.
5. **Screen + šavovi** (`Doniraj.tsx`, tab, route) + smoke testovi (uzor `Dogadjaji.test.tsx`/`TicketCheckout.test.tsx`). **Typed-routes gotcha**: nove rute → regeneriraj `.expo/types` (pokreni type-check kroz verify; v. FF PLAN.md §7 ako zapne).
6. **Deep link test:** test da `pay?uri=` put s donacijskim EIP-681 (EURe@100) prolazi `parseEip681Uri` → Send prefill (postojeći `PayRequestRedirect` testovi kao uzor — samo dodaj donacijski case, ne diraj implementaciju).
7. **Predaja:** A2 ✅ u airKUNA tablici u `handoffs/README.md`, Zapisnik (odstupanja, CORS nalaz iz prvog poziva ako je rađen), commit `feat(mobile): donations feature-pack (airkuna)`, push na `origin custom`.

## Kriteriji prihvaćanja

- [ ] `BRAND_ID=airkuna` (web preview `WEB_PREVIEW=1` ili simulator): Doniraj tab vidljiv; unos sluga → kampanja → iznos → Send flow s prefillanim EURe transferom na destination adresu.
- [ ] `BRAND_ID=safe`: nula novih površina (tab skriven, nikakav donations kod se ne mounta).
- [ ] Iznos aritmetika: BigInt, `wei = centi × 1e16`, testirano na rubnim slučajevima.
- [ ] Confirm je best-effort: pad backenda ne blokira niti ruši donaciju (graceful null), retroaktivni sync pokriva zaostale.
- [ ] Paste/scan `https://domovina.ai/c/<slug>/doniraj` vodi na Doniraj s prefillanim slugom.
- [ ] Svi novi moduli imaju kolocirane testove; `node scripts/verify.mjs --changed --workspace=mobile` čist (diff dira `packages/utils`? → dodatno `yarn workspace @safe-global/utils type-check && yarn workspace @safe-global/utils test` + `yarn workspace @safe-global/web type-check`).

## Zapisnik izvršenja

_(prazno — popunjava agent koji izvrši fazu)_
