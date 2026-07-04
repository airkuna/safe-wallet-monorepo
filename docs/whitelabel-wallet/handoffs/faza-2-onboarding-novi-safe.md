# Faza 2 — Onboarding: kreiranje novog Safea u appu

> Handoff prompt za praznu Claude Code sesiju. Repo: `/Users/ms/git/safe-global/safe-wallet-monorepo`, grana `custom`.
> Prije početka pročitaj [handoffs/README.md](README.md) i [03 — Feature audit](../03-feature-audit-revolut.md).
> Preduvjet: faza 1 (runtime branding) mergeana u `custom`.

## Kontekst

Safe mobile app danas može **samo importati postojeći Safe** (`apps/mobile/src/features/ImportReadOnly`, `ImportSigner(s)`, `GetStarted`, `Onboarding`) — korisnik novog brand-walleta nema način kreirati račun u appu. To ubija Revolut-feel: prvi dojam mora biti "otvorio sam račun u 30 sekundi", ne "zalijepi adresu postojećeg multisiga".

Web app **ima** counterfactual kreiranje Safea (Safe postoji kao deterministička adresa prije deploya; deploy se dogodi uz prvu transakciju) — logika i obrasci se mogu portati. Domovina wallet (Track B) to isto radi ("instant mint bez gasa", ADR 0013) i potvrđuje da je counterfactual pristup ispravan za MVP.

## Cilj

Novi korisnik u brandiranom appu: **"Create account" → ime računa → račun odmah postoji i može primati sredstva** (counterfactual adresa), bez plaćanja gasa unaprijed. Deploy se dogodi automatski uz prvu odlaznu transakciju.

## Ključne ulazne točke

- `apps/mobile/src/features/GetStarted/`, `Onboarding/`, `AccountsSheet/` — gdje "Create account" CTA ulazi
- `apps/mobile/src/features/ImportSigner/`, `PrivateKey/` — postojeći signer management (novi Safe treba ownera: generirani lokalni signer, pohranjen kako app već pohranjuje private keyeve — **reuse, ne izmišljaj novi keystore**)
- Web referenca za counterfactual: `apps/web/src/features/` (potraži `counterfactual` — postoji i speckit spec `specs/002-counterfactual-refactor/`)
- `@safe-global/protocol-kit` — `predictSafeAddress` / deployment config (SDK je već dependency; provjeri verziju u root `package.json` — audit je zabilježio peer major skew)
- Redux store: `apps/mobile/src/store/` — kako se Safeovi dodaju u state (vidi kako import flow upisuje Safe)
- Gasless izvršenje prve transakcije: relaying + GTF Safe-pays (`packages/utils/src/utils/isGtfSafePaid.ts`, opis u [03](../03-feature-audit-revolut.md#što-znači-gtf-safe-pays-gasless-u-ovom-repou))

## Zadaci

1. **Recon + regression checklist (obavezno):** istraži kako web radi counterfactual (spec + feature kod), kako mobile import flow upisuje Safe u store, i kako se signeri pohranjuju. LSP `findReferences` na store akcije koje import koristi — checklist mora pokriti sve potrošače tog state oblika (AccountsSheet, Assets, TxHistory…).
2. **Dizajn odluka (zapiši u Zapisnik):** counterfactual-only za MVP (preporučeno) ili odmah sponzorirani deploy. Counterfactual-only = nula backend ovisnosti.
3. **Feature modul `apps/mobile/src/features/CreateSafe/`** (novi dir — overlay pravilo): ekran(i) create flowa — ime računa, mreža (default iz brand manifesta / trenutne mreže), generiranje ili odabir signera (1/1 threshold za MVP), `predictSafeAddress`, upis u store kao counterfactual Safe.
4. **Route thin seam:** novi Expo Router route file u `apps/mobile/src/app/` (nova datoteka = nema konflikta) + CTA "Create account" u GetStarted/AccountsSheet (thin seam, ~1 linija po mjestu).
5. **Counterfactual status u UI:** račun prije deploya mora ispravno prikazivati balans (prima sredstva) i jasno stanje "aktivira se uz prvu transakciju". Provjeri što postojeći ekrani rade s ne-deployanim Safeom — vjerojatno CGW vraća 404 za safe-info; obradi taj slučaj u overlay kodu, ne mijenjaj shared hookove in-place.
6. **Deploy uz prvu transakciju:** prouči kako web to radi (batch deployment + tx); za MVP je prihvatljivo i jednostavnije rješenje (eksplicitni "Activate account" korak koji radi deploy kroz relayer/GTF ako je flag dostupan na mreži) — odluku zapiši.
7. **Testovi:** unit za predikciju adrese + store upis (MSW za RPC/CGW, faker za test podatke); component test za create ekran; test za counterfactual prikaz (404 safe-info slučaj).
8. **Dokumentacija:** ažuriraj `docs/whitelabel-wallet/03-feature-audit-revolut.md` matricu (red "Kreiranje novog računa u appu": 🟡 → ✅ za mobile).

## Acceptance kriteriji

- [ ] U dev buildu: Create account → račun vidljiv u account switcheru s determinističkom adresom, **bez ijedne on-chain transakcije**.
- [ ] Slanje test sredstava na tu adresu → balans se prikazuje.
- [ ] Postojeći import flow radi nepromijenjeno (regression).
- [ ] App restart → counterfactual račun preživi (persist).
- [ ] `yarn verify:changed` čist; novi kod ima testove; nijedan shared hook nije editiran in-place.

## Ograničenja

- **Ne uvodi passkey u ovoj fazi** — signer je lokalno generirani ključ kroz postojeći keystore. Passkey je post-MVP (velika površina, zahtijeva protocol-kit passkey signer + native integraciju).
- 1/1 threshold za MVP; multi-owner ostaje kroz postojeći import.
- Ne mijenjaj `packages/*` osim ako je strogo nužno (utječe na web).

## Predaja

Označi fazu 2 ✅ u `handoffs/README.md`, popuni Zapisnik, commitaj (`feat(mobile): create new safe onboarding flow`) i pushaj na `origin custom`.

## Zapisnik izvršenja

_(prazno — popunjava agent koji izvrši fazu)_
