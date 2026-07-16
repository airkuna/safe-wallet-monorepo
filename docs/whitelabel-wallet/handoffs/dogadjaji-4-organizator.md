# Događaji 4 (E4) — organizator self-service, discovery feed, pilot runbook

> Handoff prompt za praznu Claude Code sesiju. Repoi: `/Users/ms/git/safe-global/safe-wallet-monorepo`
> (grana `custom`) + `/Users/ms/git/domovinatv/domovina-api`.
> Prije početka pročitaj [11 — Događaji](../11-dogadjaji-p2p-ticketing.md) (§4, §6, §7),
> [dogadjaji-2-backend.md](dogadjaji-2-backend.md) i [10 — Onboarding trgovca](../10-onboarding-trgovca.md)
> (Tržnica ekvivalent — isti oblik runbooka za drugu vertikalu).
> Preduvjet: E2 mergean; E3 poželjan (runbook ga referencira), ne blokira.
>
> _EN abstract: organizer self-service (create event + tiers from the app, org account +
> Safe creation, @username identity), a public discovery feed replacing the config catalog,
> DAC7 organizer records, and a concrete pilot runbook for Luka Sučić (Money Motion /
> BlockSplit)._

## Cilj

Organizator bez developera: kreira org account, Safe (kroz postojeći onboarding), event s
tierima i objavi ga — event se pojavi u discovery feedu svih korisnika brandiranog builda;
prodaja i check-in rade bez ijedne izmjene koda. Uz to: pilot runbook (korak-po-korak za Luku
Sučića) i DAC7 evidencija organizatora.

## Kontekst i izvori

- **Config katalog → backend katalog**: E1 `catalog/registry.ts` je fallback; ovdje discovery
  feed (javni `events-feed` iz E2) postaje primarni izvor. Obrazac izmjene ograničen na
  `events/catalog/` modul (isti evolucijski put kao Tržnica M1→M4).
- **Safe kreiranje u appu**: onboarding faza 2 (`features/CreateSafe`, counterfactual +
  aktivacija — v. [05](../05-counterfactual-onboarding.md), [07](../07-hardening-aktivacija-i-brand-sigurnost.md)).
  Organizator svoj Safe radi u istoj app — "no address ⇒ no publish".
- **Identity**: `custom/identity/` — organizator registrira `@username`
  (UsernameStep obrazac iz CreateSafe integracije); discovery i event stranica prikazuju
  `@momo` umjesto hexa.
- **Org accounts**: `public.accounts` (org) + `accounts_memberships` role već postoje;
  `create_event` RPC (E2) je gated na org admin — self-service je UI nad postojećim modelom.
- **DAC7** ([11] §6): platforma evidentira organizatore (pravni subjekt, OIB, adresa) za
  godišnje izvještavanje; polje-set preuzmi iz Tržnica M4 handoffa
  ([trznica-4-merchant-onboarding.md](trznica-4-merchant-onboarding.md)) — ista obveza, ista
  struktura.
- **Pilot fakti**: [11] §2 (MoMo 2027 tieri i posebnosti, BlockSplit format) i §7 (ručni
  preduvjeti).

## Preduvjeti

**Ručni (vlasnik):**

| Preduvjet                                                         | Zašto                       | Status |
| ----------------------------------------------------------------- | --------------------------- | ------ |
| Pilot dogovor s Lukom Sučićem (event, pravni subjekt, tieri)      | runbook cilja stvarni event | ⬜     |
| Odluka o moderaciji objave (tko smije publish — pilot: allowlist) | spam/abuse zaštita          | ⬜     |
| ENS/identity preduvjeti ako brand još nema identity               | @username organizatora      | ⬜     |

Bez preduvjeta: izvršivo s test organizatorom; runbook se piše za stvarni pilot i ostavlja
čekliste prazne.

## Opseg

**In (monorepo):** organizator flow u `events/` packu — `screens/MojDogadjaj*` (kreiranje/uređivanje
eventa i tiera; vidljivo org adminima), publish gating (bez Safe adrese nema publish; draft →
active), discovery hub (`Dogadjaji.tsx` prelazi na feed + pull-to-refresh + config fallback),
event share link/QR (deep link na event u appu).

**In (domovina-api):** `update_event`/`publish_event` RPC-ovi (state machine draft→active→closed),
allowlist moderacija (pilot: ručni flag na org accountu), `organizer_records` (DAC7 polja, RLS
service+org), feed paginacija/filtriranje (grad, datum).

**In (docs):** `docs/whitelabel-wallet/12-onboarding-organizatora.md` — runbook po uzoru na
[10 — Onboarding trgovca](../10-onboarding-trgovca.md): koraci za Luku (account → Safe kroz app
→ @username → event + tieri → publish → promo link/QR → skener osoblje → nakon eventa:
off-ramp EURe opcije), s čeklistama i FAQ (što ako izgubi telefon; tko vidi novac — nitko osim
njega; kako refundirati P2P).

**Out (svjesno):** fiskalizacija/računi (E5), napredni discovery (kalendar, subscribe,
podsjetnici — Luma paritet post-MVP), plaćeni promo/featured eventi, multi-organizator
suradnja na eventu, web (ne-app) prodajna stranica — zapiši kao ideje u [11] §8.

## Sigurnost / privatnost

- Publish gating server-side (org admin + allowlist), ne samo UI.
- Organizatorovi pravni podaci (DAC7) su sensitive: RLS service_role + vlastiti org admin;
  nikad u javnom feedu (feed nosi samo naziv/`@username`/kontakt e-mail koji organizator
  izabere).
- Event opisi su user-generated content u javnom feedu — sanitizacija/limiti duljine.

## Kriteriji prihvaćanja

1. Test organizator (org admin) iz appa kreira event s 2 tiera, ne može objaviti bez Safe
   adrese, objavi s adresom — event se pojavi u discovery feedu drugog korisnika bez izmjene
   koda/configa.
2. Kupnja + (ako je E3 mergean) check-in rade na self-service eventu identično pilot-config
   eventu.
3. Ne-allowlistani org ne može publish (server-side test).
4. DAC7 zapis organizatora postoji i nije javno čitljiv (RLS test).
5. Runbook doc 12 napisan (HR, s mermaid dijagramom onboarding toka), linkan iz README indeksa.
6. Verify zelen u oba repoa; `safe`/`ff` netaknuti; status E4 ažuriran u
   [handoffs/README.md](README.md) i [11](../11-dogadjaji-p2p-ticketing.md) §5.

## Zapisnik izvršenja

> Izvršeno: 2026-07-17 (Claude Code sesija). Monorepo verify zelen (417 suita /
> 3357 testova); backend SQL verificiran end-to-end na lokalnom Postgresu 17
> (Supabase stub) — 18-koračni scenarij, svi PASS.

### Isporučeno — domovina-api (grana `main`, commit `efbe908`)

- Migracija `20260717130000_events_organizer.sql` (idempotentna, 2× run čist):
  - `organizer_allowlist` — moderacija objave (pilot: ručni flag; upis SAMO
    service_role/psql); RLS select samo vlastiti account member.
  - `organizer_records` — DAC7 evidencija (polje-set iz trznica-4: pravni
    subjekt, OIB, adresa, financijski identifikator IBAN/Safe); RLS select
    samo org admin + service_role, **anon bez grant-a** (kriterij 4);
    `upsert_organizer_record` DEFINER RPC s validacijom formata.
  - `update_event` INVOKER RPC (RLS vrijedi): uređivanje eventa/tiera +
    **naknadni upis Safe adrese** (draft se rađa s nultom placeholder
    adresom jer `create_campaign` traži destination); nakon objave su
    cijena/imenska postojećeg tiera zaključani (`tier_locked`),
    inventory_total ne smije pasti ispod claimed; novi tieri dopušteni
    (faze prodaje). `sanitize_ugc` čisti kontrolne znakove iz opisa (UGC u
    javnom feedu; length limiti već u constraintima).
  - `publish_event` DEFINER RPC — state machine draft→active→closed;
    aktivacija = org admin + **allowlist** + pravi Safe (uz postojeći
    `campaigns_write_guard` mirror) i postavlja `visibility='public'` (TO
    je objava); audit kroz `public.log_event`.
  - `organizer_overview` DEFINER RPC — jedan poziv za organizator UI
    (accounti s allowlist/DAC7 statusom + eventi s tierima uklj. draftove).
- Edge funkcija `events-organizer` (action router: overview/create/update/
  publish/record_upsert; interni getUser kao events-checkin; deno check čist)
  - `config.toml` unos.
- `events-feed`: filtriranje `?grad=` (ilike po venue_city), `?from/to=`
  (starts_at prozor), paginacija `?limit/offset` (default 50, max 100); bez
  parametara identično E2; typed rows (deno check sada čist i za feed).
- Curl scenarij §9 (self-service + **allowlist odbijanje**, kriterij 3) i §10
  (feed filtri); deploy koraci prošireni (`--only=events-organizer`).

### Isporučeno — monorepo (grana `custom`)

- `events/api/` — organizer tipovi + klijent (`fetchOrganizerOverview`,
  `createOrganizerEvent`, `updateOrganizerEvent`, `publishOrganizerEvent`,
  `upsertOrganizerRecord`) s istom trostrukom semantikom (ok/rejected/
  unreachable) kao checkin; `fetchEventsFeed` prima filter/paginaciju
  (bez parametara = E2 ponašanje). Auth = **isti pristupni token kao skener**
  (useScannerAuth MMKV store — jedan paste za skener i organizatorski mod).
- `screens/MojDogadjaji.tsx` (ruta `/events/organizer`) — organizatorski hub:
  accounti (allowlist/DAC7 status), eventi sa state badgeovima, Novi događaj,
  ulaz u skener, change token; refetch na fokus.
- `screens/MojDogadjaj.tsx` (ruta `/events/organizer-event`) — kreiranje/
  uređivanje: polja eventa, tip-chipovi, tieri (cijena EUR string → centi,
  inventory, imenska switch), Safe adresa s "Upiši adresu ovog računa"
  (activeSafe prefill), Objavi (disabled bez valjane adrese — UI zrcalo,
  server presuđuje), Zatvori prodaju, promo sekcija (deep link + QR + share).
- `screens/TokenGate.tsx` — izvučen iz SkenerUlaza (DRY; isti testID-evi).
- `logic/eventLink.ts` — `buildEventLink(slug)` =
  `<scheme>://events/event?event=<slug>` (obrazac buildPaymentLink; test
  dokazuje da payment skener link NE interpretira).
- `Dogadjaji.tsx` — pull-to-refresh (RefreshControl → refreshEventCatalog);
  "Tvoj događaj ovdje": **tap = organizator**, long-press = skener (E3).
- `EventDetail.tsx` — share gumb (naziv + deep link kroz native share sheet).
- Testovi: client organizer akcije + feed params (MSW), eventLink (3),
  MojDogadjaji (6), MojDogadjaj (9), Dogadjaji (tap/long-press + refresh) —
  pack ukupno 139 testova / 18 suita.

### Ključne odluke

1. **Jedan pristupni token za sve organizatorske radnje** (skener + self
   service; isti MMKV ključ) — organizator lijepi token jednom; pravi login/
   refresh ostaje post-MVP (doc 12 §8).
2. **Draft bez Safe-a = nulta placeholder adresa**: `create_campaign` (E2
   hardening) zahtijeva destination pri kreiranju; nulta adresa prolazi
   format-check, a aktivaciju blokiraju i `publish_event` i postojeći write
   guard. Safe se upisuje naknadno kroz `update_event` (guard i dalje
   zaključava adresu nakon prve plaćene uplate — anti-rug).
3. **Publish = state active + visibility public u jednoj tranziciji** — draft
   eventi se kreiraju `private` pa ih javni feed nikad ne vidi (RLS test u
   scenariju: anon vidi 0 draftova, 1 aktivan).
4. **Tier lock nakon objave** (cijena/imenska) umjesto slobodnog uređivanja —
   kupci su kupovali pod tim uvjetima; nove faze prodaje = novi tier (MoMo
   Super Early Bird → Early Bird obrazac).
5. **Jedna edge funkcija s action routerom** (events-organizer) umjesto 5
   malih — jedan deploy unit, iste 4xx/5xx semantike, autorizacija ionako
   živi u RPC-ima (INVOKER + RLS za create/update, DEFINER s eksplicitnim
   checkovima za publish/record).
6. **DAC7 unos ostaje operaterski** (RPC + curl/psql; app ima klijent, ali ne
   formu) — svjesno malen mobile opseg; runbook doc 12 to dokumentira.

### Verifikacija

- Backend: svih 36 migracija čisto (lokalni Postgres 17 + Supabase stub); E4
  migracija idempotentna (2×). Scenarij: create draft (zero Safe, kontrolni
  znakovi u opisu) → publish `organizer_not_allowlisted` → allowlist →
  publish `campaign_destination_missing` → update (Safe + tier edit u draftu)
  → anon NE vidi draft → publish → active+public → anon VIDI event →
  `tier_locked` → kupnja + izdavanje 2 ulaznice na self-service eventu →
  `inventory_below_claimed` → `campaign_destination_locked` (guard) →
  ne-admin `not_authorized` (publish/update/overview prazan) → DAC7 upsert +
  RLS izolacija (drugi user 0 redaka; anon permission denied) → `invalid_oib`
  → closed → `invalid_state_transition` → audit eventi persistirani.
- Edge funkcije: `deno check` čist (events-organizer, events-feed).
- Monorepo: `node scripts/verify.mjs --changed --workspace=mobile` exit 0
  (type-check, lint, prettier, 417 suita / 3357 testova); expo typed routes
  regenerirani kratkim `npx expo start --offline`; `safe`/`ff` netaknuti
  (sve izmjene u `custom/events/` + 2 nove route datoteke).

### Odstupanja / otvoreno (ručni koraci)

- **Produkcijski deploy NIJE izvršen** (nema SSH): `./scripts/db-migrate.sh`
  (1 nova migracija) + `./scripts/deploy-functions.sh --only=events-organizer`
  - `--only=events-feed --restart -y` — koraci na dnu curl scenarija; nakon
    deploya ručno allowlistati pilot org account (curl scenarij §9.3).
- **Ručni preduvjeti pilota** i dalje otvoreni (pilot dogovor s Lukom, org
  account + KYC, Safe, @username preduvjeti) — čekliste u doc 12 §4 ostavljene
  prazne.
- **Kriterij 1 (end-to-end na uređaju)** dokazan na razini backend scenarija
  - unit testova ekrana; fizički uređaj s prod backendom = uz pilot (workflow:
    build samo na eksplicitan zahtjev).
- **DAC7 forma u appu ne postoji** (odluka 6) — unos radi operater RPC-om.
- Brand manifest za pilot i dalje bez `features.events` (marketinška odluka,
  [11] §7.5).
