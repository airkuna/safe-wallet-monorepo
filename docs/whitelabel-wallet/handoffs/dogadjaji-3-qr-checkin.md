# Događaji 3 (E3) — QR ulaznice, skener ulaza, check-in

> Handoff prompt za praznu Claude Code sesiju. Repoi: `/Users/ms/git/safe-global/safe-wallet-monorepo`
> (grana `custom`, mobile strana) + `/Users/ms/git/domovinatv/domovina-api` (redeem RPC + funkcija).
> Prije početka pročitaj [11 — Događaji](../11-dogadjaji-p2p-ticketing.md) (§3.4, §4, §8),
> [dogadjaji-2-backend.md](dogadjaji-2-backend.md) (model `tickets`, QR token) i
> `apps/mobile/src/custom/ff/docs/handoffs/faza-10-dogadjanja.md` (etapa 10b — pravila skenera).
> Preduvjet u repoima: E1 + E2 mergeani (`custom/events/` pack + backend `tickets` tablica postoje).
>
> _EN abstract: render per-unit ticket QRs in "My tickets", build a separate organizer scanner
> mode (never through the payment scanner), an idempotent `redeem_ticket` RPC gated to
> organizer-account admins, anti-double-entry, and an explicit online/offline decision._

## Cilj

Kupac u "Moje ulaznice" ima QR po komadu (imenske: s imenom holdera); organizator (član org
accounta) u appu otvori **Skener ulaza**, skenira QR i u <2 s vidi ✅ s imenom holdera i tierom
(za akreditaciju/studentsku provjeru) ili ⛔ s vremenom i uređajem prvog ulaska. Dvostruki ulaz
je nemoguć; MoMo scenarij "ulaznica se mijenja za akreditaciju na pultu" je pokriven.

## Kontekst i izvori

- **Tvrdo pravilo iz faza-10 (10b)**: QR ulaznice **ne smije ići kroz `resolveScannedAddress`**
  (payment choke-point u Send flowu). Skener ulaza je zaseban ekran/mod s vlastitim parserom;
  payment skener ignorira ticket QR format i obrnuto (prefiksiraj payload, npr. `dgdj1:`).
- Backend model iz E2: `tickets` (qr_token_hash unique, state `issued|checked_in|void`,
  `checked_in_at/by`), org role check `has_role_on_account`.
- Kamera/skener infrastruktura već postoji u hostu (QR scan za adrese) — pronađi i reuse
  komponentu kamere, ne i payment parsing.
- Offline razmatranje ([11] §8): opaque token traži mrežu na ulazu. Ako se odluči offline
  podrška: potpisani voucher (server Ed25519 potpis nad `{ticket_id, event, holder, serial}`,
  javni ključ u app configu) → skener verificira lokalno + lokalni MMKV entry-log kao
  anti-double-entry na JEDNOM uređaju, uz sync redeema kad se mreža vrati. **Odluku (samo
  online vs online+offline) donesi u sesiji na temelju jednostavnosti — online-only je
  prihvatljiv MVP**, offline je dokumentirani upgrade path.

## Preduvjeti

**Ručni (vlasnik):**

| Preduvjet                                                  | Zašto                          | Status |
| ---------------------------------------------------------- | ------------------------------ | ------ |
| Organizatorov account ima admin membere (uređaji na ulazu) | tko smije skenirati            | ⬜     |
| Pilot dogovor o proceduri na pultu (MoMo akreditacije)     | UX skenera odgovara stvarnosti | ⬜     |

Bez preduvjeta: izvršivo do kraja s test org accountom i MSW/lokalnim stackom.

## Opseg

**In (domovina-api):** `redeem_ticket(qr_token)` security-definer RPC — hash lookup,
`issued → checked_in` atomarno (idempotentno: drugi poziv vraća prvi rezultat s
`already_checked_in`), gated na org admin pozivatelja; `void_ticket`; edge funkcija
`events-checkin` (JWT user client → RPC); po odluci: potpisani voucher pri izdavanju.

**In (monorepo):** `events/screens/UlaznicaQr.tsx` (QR render po komadu, brightness-friendly,
holder ime), `events/screens/SkenerUlaza.tsx` (vidljiv samo org adminima aktivnog eventa; veliki
✅/⛔ + ime + tier + brojač ulazaka), `events/logic/qrPayload.ts` (format `dgdj1:<token>`,
parser + testovi), `events/state/useEntryLog.ts` (MMKV log skeniranja za offline toleranciju i
brojač), api klijent za checkin; kolocirani testovi.

**Out (svjesno):** multi-uređaj offline sinkronizacija (online-only ili single-device offline je
MVP), PDF/Apple-Google Wallet passovi (upgrade path — zapiši TODO u pack README), self-service
dodavanje skener-osoblja (E4), NFT ulaznice (Tier 2+ receipts plana).

## Sigurnost / privatnost

- Redeem autorizacija isključivo server-side (org admin role) — klijentski flag nije dovoljan.
- QR sadrži samo opaque token (nikad holder podatke u plaintextu — ime dolazi iz backenda na
  ✅ odgovoru; kod potpisanog vouchera ime smije biti u payloadu jer ga nosi sam holder).
- Idempotencija redeema na razini SQL-a (state transition u jednoj naredbi), ne aplikacije.
- Skener log (tko/kad) je audit podatak org accounta; RLS na org.

## Kriteriji prihvaćanja

1. Kupljena imenska ulaznica ima QR s imenom u Moje ulaznice; screenshot-ana/preposlana slika
   QR-a i dalje radi točno jednom (token, ne slika, je istina).
2. Org admin skenira QR: prvi put ✅ s imenom+tierom, drugi put ⛔ s `checked_in_at`; ne-admin
   korisnik nema pristup skeneru ni RPC-u (RLS/grant test).
3. Ticket QR skeniran u payment skeneru ne radi ništa opasno (odbijen format), i obrnuto.
4. Redeem radi <2 s na stvarnoj mreži; pad mreže na skeneru daje jasan error + entry-log
   ponašanje po donesenoj online/offline odluci (dokumentirano u Zapisniku).
5. Testovi: qrPayload parser, redeem idempotencija (backend curl scenarij), skener gating;
   `node scripts/verify.mjs --changed --workspace=mobile` zelen; `safe`/`ff` netaknuti.
6. Ažuriran status E3 u [handoffs/README.md](README.md) i [11](../11-dogadjaji-p2p-ticketing.md) §5.

## Zapisnik izvršenja

> Izvršeno: 2026-07-17 (Claude Code sesija). Verify (mobile) zelen (414 suita /
> 3329 testova); backend SQL verificiran end-to-end na lokalnom Postgresu 17.

### Isporučeno — domovina-api (grana `main`, commit `099d194`)

- Migracija `20260717120000_events_checkin.sql` (idempotentna, 2× run čist):
  - `redeem_ticket(qr_token)` — security definer; sha256 hash lookup, org-admin
    autorizacija (`has_role_on_account(campaign.account_id,'admin')`),
    `issued→checked_in` u JEDNOJ update naredbi uz `for update` row lock;
    idempotentno — drugi sken vraća PRVI rezultat (`already_checked_in` +
    `checked_in_at` + e-mail skenera + brojač). Poslovni ishodi (not_found /
    void / already_checked_in) su status jsonb, NE exception — audit eventi
    (`ticket.checked_in`, `ticket.checkin_duplicate`) prežive. Exceptioni samo
    za neispravan poziv (`not_authenticated`/`not_authorized`/`invalid_token`).
  - `void_ticket(ticket_id)` — org admin; samo `issued→void` (iskorištena se ne
    poništava — vraća `already_checked_in`); audit `ticket.voided`.
- Edge funkcija `events-checkin`: interni `getUser` (obrazac handoff-consume) +
  RPC kroz USER klijent (anon key + Authorization header ⇒ `auth.uid()` =
  skener); 401/403/400 mapiranje; tolerira i payload s `dgdj1:` prefiksom.
  `config.toml`: `verify_jwt = false` (getUser interno).
- Curl scenarij §7 (check-in) + prošireni deploy koraci.

### Isporučeno — monorepo (grana `custom`)

- `events/logic/qrPayload.ts` — format `dgdj1:<64-hex>`; build/parse + testovi,
  uklj. dokaz da `resolveScannedAddress(dgdj1…) === null` (payment choke-point
  netaknut — NULA upstream izmjena Send flowa; formati su međusobno gluhi).
- `events/screens/UlaznicaQr.tsx` + ruta `app/events/ticket.tsx` — QR po komadu
  (holder ime, tier, serial), crno-na-bijelom neovisno o teme (brightness na
  ulazu); "nije isporučen" stanje; napomena za iskorištenu/poništenu.
  MojeUlaznice: tap na izdanu ulaznicu s tokenom otvara QR.
- `events/screens/SkenerUlaza.tsx` + ruta `app/events/scanner.tsx` — reuse host
  `QrCamera`/`useCameraPermissionFlow`/`ScanErrorOverlay`, vlastiti parser
  (payment/adresni QR = glasno "Nije QR ulaznice", checkin API se NE zove);
  veliki ✅/⛔ + ime + tier + brojač ulazaka; `already_checked_in` pokazuje
  vrijeme i skenera prvog ulaska.
- `events/state/useEntryLog.ts` — MMKV log skenova (samo fingerprint tokena,
  prvih 16 hex — bearer token se ne akumulira na uređaju); lokalni
  anti-double-entry pre-check bez mreže (isti uređaj) + brojač + audit.
- `events/state/useScannerAuth.ts` — pristupni token skenera (GoTrue JWT org
  admina; paste u ekran, MMKV). Transport, NE autorizacija.
- `api/client.ts` `checkinTicket` + `CheckinResult` tipovi (4xx kod =
  autoritativno; 5xx/mreža = `unreachable`).
- Testovi: qrPayload (5), useEntryLog (6), useScannerAuth (3), client checkin
  (5), SkenerUlaza (8), UlaznicaQr (5) — pack ukupno 110 testova / 15 suita.

### Ključne odluke

1. **Online-only check-in (MVP)** — opaque token traži mrežu; potpisani
   Ed25519 voucher + odgođeni redeem je dokumentirani upgrade path (receipts
   plan Tier 1; javni ključ u brand config, `useEntryLog` već ima sync-ready
   strukturu). Pad mreže: jasan ⛔ "sken nije potvrđen", zapis `error` u log,
   ulaz se NE priznaje ni ne broji. Lokalni pre-check duplikata radi i bez
   mreže, ali samo za skenove OVOG uređaja (backend hvata cross-device).
2. **Skener auth = paste GoTrue JWT** ("pristupni token"): wallet je
   self-custody bez GoTrue sesije, a `redeem_ticket` traži `auth.uid()` s
   admin rolom. MVP: organizator dobije JWT (pinka SPA login / operater) i
   zalijepi ga u skener; istek (1 h) ⇒ 401 s porukom "zatraži novi". Pravi
   organizator login/refresh + self-service skener osoblje = E4.
3. **Ulaz u skener = long-press na "Tvoj događaj ovdje"** karticu huba:
   organizator-nost se klijentski NE MOŽE dokazati, pa bi vidljivi gumb ili
   "skriveni flag" bili lažna sigurnost — autorizacija je uvijek server-side
   (svaki sken → RPC role check), diskretni ulaz samo smanjuje šum za kupce.
4. **Brojač ulazaka**: server `checked_in_count` je autoritativan (odgovor
   svakog skena); lokalni MMKV count je fallback prikaz na kameri.
5. **Fingerprint umjesto tokena u logu** (prvih 16 hex): organizatorov uređaj
   ne smije čuvati upotrebljive bearer tokene ulaznica.

### Verifikacija

- Backend: svih 35 migracija čisto na lokalnom Postgresu 17 (Supabase stub);
  E3 migracija idempotentna (2×). Matrica: prvi sken ✅ (ime+tier+brojač) →
  drugi sken ⛔ `already_checked_in` (vrijeme + e-mail skenera, brojač ne
  raste) → ne-admin `not_authorized` → bez JWT-a `not_authenticated` → krivi
  format `invalid_token` → nepoznat token `not_found` → void flow (voided /
  redeem→void / already_void / used→already_checked_in) → audit eventi
  persistirani. Dokumentirano u curl scenariju §7.
- Monorepo: `node scripts/verify.mjs --changed --workspace=mobile` exit 0
  (type-check, lint, prettier, 414 suita / 3329 testova). Expo typed routes
  regenerirani kratkim `npx expo start --offline` (E1 gotcha).

### Odstupanja / otvoreno (ručni koraci)

- **Produkcijski deploy NIJE izvršen** (nema SSH): `./scripts/db-migrate.sh`
  (1 nova migracija) + `./scripts/deploy-functions.sh --only=events-checkin`
  (+ restart) — koraci na dnu curl scenarija.
- **Kamera nije testirana na fizičkom uređaju** u ovoj sesiji (workflow: build
  samo na eksplicitan zahtjev); QrCamera je postojeća, dokazana komponenta.
- **Kriterij "<2 s na stvarnoj mreži"** nije mjeren (nema prod deploya) —
  izmjeriti uz pilot; RPC je jedan indexirani lookup + update.
- Ručni preduvjeti iz tablice (org admin memberi za uređaje na ulazu, pilot
  procedura na pultu) i dalje otvoreni — E4/pilot runbook.
