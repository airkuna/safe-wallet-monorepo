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

(popunjava agent koji izvrši fazu)
