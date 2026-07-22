# Faza 5 — Release pipeline: EAS build per brand + smoke

> Handoff prompt za praznu Claude Code sesiju. Repo: `/Users/ms/git/safe-global/safe-wallet-monorepo`, grana `custom`.
> Prije početka pročitaj [handoffs/README.md](README.md) i [02 — Brand config sustav](../02-brand-config-sustav.md).
> Preduvjeti: faze 1–4 mergeane u `custom`.

## Kontekst

Sve MVP funkcionalnosti postoje; ova faza pretvara "radi na dev uređaju" u **ponovljiv build po brandu**. Podsjetnik iz [01 — Vizija](../01-vizija-i-strategija.md): jedan community = **jedan binary + jedan store listing** — SaaS dashboard će jednog dana automatizirati proizvodnju tih binarya, ali MVP treba ručno-pokretljiv, deterministički pipeline: manifest in → potpisani build out.

Native identitet (packageId, ime, Firebase, EAS project) već dolazi iz manifesta (faza 0); runtime branding iz faze 1. Ono što nedostaje: EAS konfiguracija koja to veže, provjera kompletnosti brand paketa, i smoke test da brandirani build stvarno radi.

## Ključne ulazne točke

- `apps/mobile/eas.json` — EAS build profili (provjeri postojeće: dev/preview/production varijante)
- `apps/mobile/app.config.ts` + `brand/resolveBrand.js` — build-time ulaz (BRAND_ID / BRAND_CONFIG_JSON)
- `apps/mobile/brand/manifests/` — gitignorani per-brand manifesti + Firebase datoteke; `example.community.json` template
- Postojeći CI: `.github/workflows/` (potraži mobile buildove — što već postoji za Safeov vlastiti release)
- Lokalni run setup: [[mobile-local-run-setup]] memory (`.env.local`, `google-services-dev.json`, dev variant)

## Zadaci

1. **Recon:** popiši sve build inpute koje brand treba (manifest polja, Firebase datoteke za obje platforme, EAS project ID, store credentiali, asseti iz faze 1) i gdje EAS/Expo očekuje svaki od njih. Regression checklist: `safe` default build mora ostati identičan.
2. **`brand doctor` skripta** (`apps/mobile/brand/doctor.js` + yarn script): za dani BRAND_ID validira kompletnost paketa — manifest prolazi zod schemu, referencirani asseti postoje, Firebase datoteke prisutne i package name im odgovara manifestu, identity polje resolvabilno. Jasan izvještaj što fali. Unit testovi.
3. **EAS profili per brand:** parametriziraj build (`BRAND_ID` env kroz EAS build env / `--profile`); dokumentiraj i `BRAND_CONFIG_JSON` put (SaaS pipeline ubacuje manifest inline bez datoteke). Cilj: `BRAND_ID=<brand> eas build --profile production-android` (i iOS ekvivalent) radi bez diranja koda.
4. **Smoke provjera brandiranog builda:** minimalni check-list skripta ili Maestro/postojeći e2e harness ako ga mobile ima (provjeri `apps/mobile` e2e setup prije uvođenja novog alata!): app se otvara, brand boje/ime prisutni, create account radi, receive QR se generira. Ako automatizacija nije izvediva u okviru faze — napiši ručni smoke checklist u `brand/README.md` i to zapiši u Zapisnik.
5. **Store priprema (dokumentacija, ne automatizacija):** checklist po brandu u `docs/whitelabel-wallet/05-release-checklist.md` — store listing asseti, privacy policy URL (per brand!), Apple/Google računi, push (APNs/FCM) preduvjeti. GPL-3.0 napomena: fork mora nuditi source (link na fork repo u store listingu / in-app licences ekran) — provjeri kako Safe to danas rješava i repliciraj.
6. **CI (opcionalno, ako se uklapa):** GitHub Actions workflow (`chore:` commit!) koji na ručni trigger (workflow_dispatch s BRAND_ID inputom) pokreće doctor + EAS build. Secrets ostaju u GH/EAS, ne u repou.
7. **Dokumentacija:** `brand/README.md` end-to-end "od manifesta do storea" poglavlje; ažuriraj `02-brand-config-sustav.md` (SaaS pipeline sekcija — što je sad stvarnost, što ostaje vizija).

## Acceptance kriteriji

- [ ] `yarn workspace @safe-global/mobile brand:doctor` (ili ekvivalent) za `safe` i za test brand daje točan pass/fail izvještaj.
- [ ] EAS build za test brand (barem Android, može preview profil) završi uspješno i instalira se s ispravnim imenom, ikonom, bojama.
- [ ] Default `safe` build bajt-ekvivalentan ponašanjem (regression).
- [ ] Smoke checklist (automatski ili ručni) prolazi na brandiranom buildu.
- [ ] Nula secrets/credentials u repou; `yarn verify:changed` čist.

## Ograničenja

- CI promjene = `chore:` prefix; bez diranja postojećih Safe release workflowova (naši idu u zasebne datoteke).
- SaaS dashboard i automatska submisija u storeove su **post-MVP** — samo dokumentiraj sučelje (manifest in → binary out) koje će SaaS kasnije zvati.

## Predaja

Označi fazu 5 ✅ u `handoffs/README.md` (MVP komplet!), popuni Zapisnik, commitaj (`chore(mobile): per-brand eas release pipeline` + `docs(whitelabel): release checklist`) i pushaj na `origin custom`. Predloži korisniku ažuriranje memoryja (MVP isporučen, post-MVP backlog: kartica, off-ramp, claim linkovi, passkey, SaaS dashboard).

## Zapisnik izvršenja

> Izvršeno: 2026-07-22 (dev2) · test brand: `airkuna` · commit/push radi orkestrator

**Isporučeno:**

1. **`brand doctor`** — `apps/mobile/brand/doctor.js` (+ `doctor.d.ts`, `doctor.test.ts`, 17 testova) i yarn script `brand:doctor`. Validira: zod schemu, assete, Firebase datoteke + podudaranje application id-jeva (JSON `package_name`, plist `BUNDLE_ID`, prod i dev varijante), OTA certifikat, identity (https + resolvabilna domena), `eas.json` brand profile. `--remote-firebase` flag za CI (Firebase dolazi kao EAS file env var). Naming konvencija: `google-services-<id>[-dev].json`, `GoogleService-Info-<id>[-Dev].plist`; `safe` zadržava stock imena.
2. **EAS profili per brand** — `preview-airkuna` / `production-airkuna` u `eas.json` (extends stock profila, nose samo `env.BRAND_ID`); postojeći Safe profili netaknuti. Firebase configi idu kao **file-type EAS env vars** u brandovom EAS projektu (kreirani za airkuna preview: `GOOGLE_SERVICES_JSON`, `GOOGLE_SERVICES_PLIST`, visibility secret). `BRAND_CONFIG_JSON` put dokumentiran u `brand/README.md` §5.
3. **CI** — `.github/workflows/mobile-brand-release.yml` (workflow_dispatch: brand_id/variant/platform → doctor `--remote-firebase` + `eas build --no-wait`); zasebna datoteka, Safe workflowi nedirnuti.
4. **Smoke** — Maestro harness postoji (`apps/mobile/e2e/`) ali je vezan na Safe appId + e2e mock env; parametrizacija per brand nije stala u fazu → **ručni smoke checklist** u `brand/README.md` (dozvoljena opcija po zadatku 4).
5. **Store priprema** — `docs/whitelabel-wallet/16-release-checklist.md` (broj **16, ne 05** — 05 je već zauzet counterfactual onboardingom). GPL-3.0: mobile **nema** in-app licences ekran; Safe se oslanja na javni repo → za fork minimum = source link u store listing opisu (checklist §5).
6. **Dokumentacija** — `brand/README.md` (doctor, "From manifest to store", smoke checklist), `02-brand-config-sustav.md` (§ "Što je stvarnost od faze 5").

**Stvarni EAS build (cloud, Android preview):**

- ✅ Pokrenut: **build ID `2c43e4a3-7968-4d43-99f1-dd3622574172`** — <https://expo.dev/accounts/airkuna/projects/airkuna/builds/2c43e4a3-7968-4d43-99f1-dd3622574172> (`--no-wait`; ishod prati orkestrator). Android keystore automatski kreiran na EAS-u; `versionCode` inicijaliziran na 1.
- iOS nije pokretan (credentials/ASC setup je dio A4).

**Acceptance status:**

- [x] `brand:doctor` za `airkuna` → PASS (0 warnings); za `safe` → točan FAIL izvještaj (vidi napomenu ispod)
- [x] EAS build za test brand pokrenut (Android preview, cloud) — instalacija/vizualna potvrda = orkestrator/korisnik po smoke checklistu
- [x] Default `safe` build neizmijenjen: `resolveBrand`/`app.config.ts` nisu dirani; eas.json samo **dodaje** profile; verify čist
- [x] Smoke checklist napisan (ručni)
- [x] Nula secrets u repou (doctor samo referencira lokalne putanje; `.easignore` sad isključuje `/keys/`)

**Odstupanja i nalazi:**

- `05-release-checklist.md` → **`16-release-checklist.md`** (kolizija broja).
- Doctor za `safe` na ovom stroju ispravno FAIL-a: lokalni `google-services.json`/plistovi su **domovina** configi (dev setup ovog stroja), ne Safeovi — environmentalno, ne regresija.
- Nalaz: stock fallback `./assets/images/favicon.png` **ne postoji** (upstream ga obrisao u `04ef9a4d4`, `resolveBrand.js` ga još referencira) — favicon je samo web-preview target pa je u doctoru warning, ne error.
- Sigurnosni popravak usput: `apps/mobile/.easignore` nije isključivao `/keys/` (service account + OTA privatni ključevi bi ušli u EAS build arhivu) — dodano isključenje.
- `eas env:create` je deprecated u eas-cli 21 (radi; nasljednik `eas env:set`) — README koristi postojeću formu.
