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

(popunjava agent koji izvrši fazu)
