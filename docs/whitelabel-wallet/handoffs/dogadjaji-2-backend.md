# Događaji 2 (E2) — backend: eventi, narudžbe, onchain verifikacija, izdavanje ulaznica

> Handoff prompt za praznu Claude Code sesiju. **Ova faza se izvršava u DRUGOM repou:**
> `/Users/ms/git/domovinatv/domovina-api` (self-hosted Supabase backend). Ovaj monorepo
> (`safe-wallet-monorepo`, grana `custom`) se dira samo za app-stranu klijenta na kraju.
> Prije početka pročitaj [11 — Događaji](../11-dogadjaji-p2p-ticketing.md) (§3.2, §3.3, §4, §8)
> i u domovina-api repou: `docs/backend-architecture.md`,
> `supabase/migrations/20260530120100_pinka_finance_schema.sql` (+ `_rls.sql`, `_rpcs.sql`),
> `20260602130000_pinka_finance_onchain_contributions.sql`,
> `20260611120000_pinka_campaign_hardening.sql`, funkcije `pinka-contribute`,
> `pinka-onchain-confirm`, `pinka-onchain-ingest`, i `docs/pinka-onchain-receipts-tokenization-plan.md`.
>
> _EN abstract: extend the `pinka_finance` schema (campaigns already support `type='tickets'`)
> with event details, per-unit tickets, inventory reservation with TTL, and edge functions for
> ordering, client-submitted onchain payment confirmation, ticket listing; wire the mobile
> `events` pack to it._

## Cilj

Narudžba iz TicketCheckouta (E1) postaje backend narudžba s rezervacijom inventoryja; nakon
EURe uplate kupčev Safe → organizatorov Safe klijent javi tx hash, backend **verificira receipt
na Gnosis RPC-u** i idempotentno izda N ulaznica (redaka) s QR tokenima; app u "Moje ulaznice"
povlači stvarne ulaznice umjesto lokalnog best-effort zapisa. Nikakva sredstva i nikakvi
ključevi na backendu.

## Kontekst i izvori

- **Postojeće pokriva ~80 %**: `campaigns` (type `'tickets'`, `destination_address` =
  organizatorov Safe, state machine, visibility), `campaign_tiers` (kind `'ticket'`,
  `price_cents`, `inventory_total/claimed`), `contributions` (= narudžbe: `tier_id`,
  `quantity`, state pending→paid→refunded/expired, idempotency `(forward_tx_hash,
onchain_log_index)`), trigger `tg_contribution_state` (inventory + stats + funded flip).
- **Onchain confirm obrazac**: `pinka-onchain-confirm` — klijent šalje `{campaign_id, tx_hash}`,
  funkcija čita receipt (`GNOSIS_RPC_URL`), parsira EURe `Transfer` logove na
  `destination_address`, kreditira kroz idempotentni security-definer RPC. **"Onchain
  verifikacija JE autorizacija"** — bez JWT/HMAC povjerenja u klijenta.
- **RLS/RPC konvencije**: sve write operacije kroz `security definer set search_path = ''`
  RPC-ove s eksplicitnim revoke/grant; public-read po visibility; sensitive gated na
  kontributora ili `has_role_on_account(account_id, 'admin')`. Organizator = org account u
  `public.accounts` + membership role.
- **QR dizajn**: Tier 0 iz `docs/pinka-onchain-receipts-tokenization-plan.md` — opaque random
  token, u bazi **samo hash**; NFT/attestation tieri su post-MVP.
- **Deploy**: `scripts/db-migrate.sh` (idempotentne SQL migracije, `YYYYMMDDHHMMSS_events_*.sql`),
  `scripts/deploy-functions.sh --only=<fn>`; nove funkcije + `verify_jwt` flagovi u `config.toml`.

## Preduvjeti

**Ručni (vlasnik):**

| Preduvjet                                       | Zašto                            | Status |
| ----------------------------------------------- | -------------------------------- | ------ |
| SSH pristup produkcijskom serveru (Coolify)     | migracije + function deploy      | ⬜     |
| Org account za pilot organizatora (MoMo/UBIK)   | vlasništvo eventa u `accounts`   | ⬜     |
| Organizatorov Safe upisan (destination_address) | bez adrese event ne ide `active` | ⬜     |

Bez server pristupa: faza se izvršava do kraja lokalno (migracije + funkcije + testni curl
scenarij protiv lokalnog stacka); produkcijski deploy = ručni korak, zapiši u Zapisnik.

## Opseg

**In (domovina-api):**

- Migracije: `pinka_finance.events` (1:1 s campaign: venue, `starts_at/ends_at`, timezone,
  `description_hr/en`, cover, organizer kontakt); `pinka_finance.tickets` (contribution_id,
  campaign_id, tier_id, `serial`, `holder_name?`, `holder_email?`, `qr_token_hash` unique,
  state `issued|checked_in|void`, `checked_in_at/by`); tier polja `imenska boolean`,
  `sale_start/end`; **rezervacija s TTL-om**: `create_ticket_order` RPC rezervira
  `inventory_claimed` odmah (uz check protiv oversella), `expire_stale_ticket_orders()` RPC
  (pg_cron ili poziv iz funkcije) vraća rezervacije istekom TTL-a (~20 min) kroz postojeći
  `expired` state.
- RPC-ovi: `create_event` (nad obrascem `create_campaign` hardening: idempotency + rate limit),
  `create_ticket_order` (contribution + holders payload validacija: imenska ⇒ N imena),
  izdavanje ulaznica na paid (proširenje `tg_contribution_state` ili zaseban trigger: N redaka,
  serial, random 32-bajtni token → vrati tokene jednokratno, spremi hash), `list_my_tickets`.
- Edge funkcije: `events-order` (user client; vraća order id + iznos + Safe adresu),
  `events-confirm` (obrazac `pinka-onchain-confirm`, ali **veže tx uz konkretnu narudžbu**:
  `{order_id, tx_hash}` → verify iznos ≥ očekivano, primatelj = event Safe, idempotentno po
  `(tx_hash, log_index)`), `events-tickets` (moje ulaznice + QR tokeni), javni `events-feed`
  (public-read lista aktivnih evenata za discovery — može i direktan PostgREST select po RLS-u,
  odluka u sesiji).
- Reconciliation rub (v. [11] §8): uplata bez confirma → `pinka-onchain-ingest` watchlist već
  pokriva detekciju; nesparene uplate označi za ručno sparivanje, omogući retroaktivni
  `events-confirm` iz "Moje narudžbe".

**In (ovaj monorepo, manji dio):** `apps/mobile/src/custom/events/api/` klijent +
`useTicketSync` (submit narudžbe pri checkoutu, confirm nakon Send flowa, poll/refetch u Moje
ulaznice; graceful offline fallback = E1 ponašanje); `catalog/` dobiva backend source uz
config fallback; MSW testovi.

**Out (svjesno):** check-in/redeem (E3), organizator self-service UI (E4), e-mail/push
notifikacije, refund UI, secondary market. `events-checkin` NE ide u ovu fazu.

## Sigurnost / privatnost

- Backend ne drži ključeve ni sredstva; jedini "novčani" kod je read-only RPC receipt parsing.
- Holderi = osobni podaci: RLS select samo kontributor + org admin; nikad u javnim viewovima;
  retencija/brisanje nakon eventa (zapiši policy u migraciju komentarom).
- QR token: u bazi samo hash; token se klijentu vraća jednom (na izdavanje / kroz
  `events-tickets` autoriziran kao kupac). Rate limit na `events-order` (obrazac iz campaign
  hardeninga).
- Oversell nemoguć: rezervacija + check u istoj transakciji (RPC), ne u aplikacijskom kodu.

## Kriteriji prihvaćanja

1. Curl scenarij (dokumentiran u repou): create_event → events-order (rezervacija vidljiva) →
   simulirana/stvarna EURe uplata → events-confirm → contribution `paid` + N `tickets` redaka;
   ponovljeni confirm istog tx-a ne duplicira ništa.
2. Narudžba iznad raspoloživog inventoryja je odbijena; istekla pending narudžba oslobađa
   rezervaciju.
3. Imenski tier bez potpunih imena je odbijen na `create_ticket_order`.
4. App: checkout šalje narudžbu (pad mreže ne blokira plaćanje — fallback E1), Moje ulaznice
   prikazuje backend ulaznice sa serialom i holderom; MSW testovi pokrivaju happy path +
   offline.
5. Migracije idempotentne (`db-migrate.sh` dvaput = no-op); RLS slijedi pinka obrasce (revoke +
   grant eksplicitni); u monorepou `node scripts/verify.mjs --changed --workspace=mobile` zelen.
6. Ažuriran status E2 u [handoffs/README.md](README.md) i [11](../11-dogadjaji-p2p-ticketing.md) §5.

## Zapisnik izvršenja

(popunjava agent koji izvrši fazu)
