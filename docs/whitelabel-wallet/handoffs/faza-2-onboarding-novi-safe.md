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

> Izvršeno: 2026-07-06 (Claude Code sesija). `git merge upstream/dev` = čist merge (samo web datoteke).

### Dizajn odluke

1. **Counterfactual-only za MVP** (opcija preporučena u zadatku 2): nula backend ovisnosti — bez CGW `counterfactual-safes` synca, bez relayinga pri kreiranju. Deploy se NE događa u ovoj fazi; račun živi kao CREATE2 predikcija dok prva odlazna transakcija (ili budući "Activate" korak) ne napravi deploy.
2. **Props oblik = `PredictedSafeProps`** (protocol-kit tip, dio shared `UndeployedSafeProps` uniona iz `@safe-global/utils/features/counterfactual`), ne weekov noviji `ReplayedSafeProps`. Razlog: `Safe.init({ predictedSafe })` kasnije gradi identičnu deployment transakciju bez ručnog resolvanja factory/singleton adresa iz `safe-deployments`; mobile ne dobiva novu ovisnost.
3. **Svježi lokalni signer po računu** (`Wallet.createRandom()`), pohranjen kroz postojeći hardware-backed keystore (`storePrivateKey` iz `useSign`, biometrijski gated) + `addSignerWithEffects`. `saltNonce = '0'` je fiksan — svježi owner sam po sebi čini CREATE2 adresu jedinstvenom.
4. **Adresa se računa protocol-kitovim `predictSafeAddress`** (isti API koji koristi web `computeNewSafeAddress`); verzija Safea = `getLatestSafeVersion(chain)`. Jedan RPC read (`proxyCreationCode`) po kreiranju.
5. **Default mreža**: novo opcionalno manifest polje `backend.defaultChainId` → aktivna mreža → prva mreža s gatewayja. Schema + tipovi + README ažurirani (aditivno, bakcompat).

### Što je isporučeno

- **Novi feature modul `apps/mobile/src/features/CreateSafe/`** (overlay): `CreateSafe.container` + `CreateSafeView` (ime, izbor mreže, error/loading stanja), `useCreateSafe` (generiranje signera → predikcija → atomarni store upis: `undeployedSafes`, `safes` sintetički `SafeOverview`, kontakt, `setActiveSafe`, `setActiveSigner`), `predictNewSafeAddress`/`buildCounterfactualOverview` logika, `undeployedSafesSlice` (persisted; cleanup na `removeSafe`; self-heal kad CGW počne vraćati overview = safe deployan), `CounterfactualBanner` + `useNativeBalance` (native balans direktno s RPC-a jer CGW 404-a za nedeployan safe).
- **Thin seamovi**: `store/index.ts` (+2 linije reducer wiring), `app/_layout.tsx` (+1 `Stack.Screen`), novi route `app/create-safe.tsx`, `GetStarted.tsx` (CTA "Create account"), `MyAccountsFooter.tsx` (CTA "Create new account"), `AssetsHeader.tsx` (+1 linija banner). Nijedan shared hook nije mijenjan in-place.
- **Brand manifest**: `backend.defaultChainId` (schema.js/schema.d.ts/custom types/README).
- **Testovi (24 nova)**: slice (uklj. self-heal matcher i cleanup), predikcija (props + no-RPC error), `useCreateSafe` (happy path s punim store stanjem + error putevi ne zapisuju ništa), banner (5 slučajeva), view (6 slučajeva), `resolveBrand` passthrough za `defaultChainId`.
- **Docs**: matrica u [03](../03-feature-audit-revolut.md) (red "Kreiranje novog računa": mobile ✅), ovaj zapisnik.

### Odstupanja od plana

1. **Zadatak 6 (deploy uz prvu transakciju) svjesno nije implementiran** — acceptance kriteriji faze ga ne traže, a dira shared ConfirmTx/tx-sender flow (protiv overlay pravila za ovu veličinu faze). Preporuka za nastavak: eksplicitni "Activate account" korak koji kroz `Safe.init({ predictedSafe })` + `createSafeDeploymentTransaction()` šalje deploy kroz CGW relay (`relayRelayV1`) gdje je flag dostupan; web referenca: `apps/web/src/features/counterfactual/services/safeDeployment.ts` (`dispatchTxExecutionAndDeploySafe`, `relaySafeCreation`).
2. **MSW nije korišten za protocol-kit predikciju** — `predictSafeAddress` interno radi lanac RPC poziva kroz viem transport; mockanje sirovog JSON-RPC-a testiralo bi protocol-kit, ne naš kod. Mockan je protocol-kit modul, a asertira se točan ulaz/izlaz i da pohranjeni props == props korišteni za predikciju (jedina invarijanta bitna za kasniji deploy).
3. **Izbor signera nije ponuđen u UI-u** (zadatak 3 dopušta "generiranje ili odabir") — uvijek se generira svjež ključ; jednostavnije i sigurnije za Revolut-feel onboarding. Postojeći signeri i dalje rade kroz import flow.

### Preostali dug

- **Vizualna potvrda na uređaju nije napravljena** (kao i u fazi 1): Create → switcher → slanje test sredstava → balans → restart persist. Acceptance checkboxi gore ostaju neoznačeni dok se ne potvrdi na deviceu; plumbing je pokriven unit testovima.
- **Tokens/NFT tab za nedeployan safe** vjerojatno prikazuje prazan/error state (CGW 404) — banner + native balans to komunicira, ali potpuni "counterfactual balance" (web `getCounterfactualBalance` ekvivalent u token listi) je dug.
- **Notifikacije**: za novi signer se ne kreira delegate key (import flow ga kreira) — push registracija za counterfactual safe ionako ne bi prošla na CGW; riješiti uz deploy korak.
- **Send flow s counterfactual safeom kao aktivnim** past će na CGW pozivima (nema deploy-with-first-tx) — vidi odstupanje 1.
- **`(tabs)` reset navigacija** nakon kreiranja kopira obrazac import flowa; ako se import flow ikad promijeni, uskladiti.
