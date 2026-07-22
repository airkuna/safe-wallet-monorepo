# 16 — Release checklist po brandu (store priprema)

> Datum: 2026-07-22 · Status: živi dokument (faza 5)
> Tehnički dio pipelinea (doctor → EAS build) je u [apps/mobile/brand/README.md](../../apps/mobile/brand/README.md);
> ovo je **operativni checklist** koji se prolazi za svaki novi brand prije store submissiona.
> Napomena: handoff faze 5 predviđao je ovaj dokument kao `05-release-checklist.md`, ali je broj 05
> već zauzet ([05 — Counterfactual onboarding](05-counterfactual-onboarding.md)) pa je ovdje kao 16.

## 1. Računi i pristupi (jednokratno po brandu)

- [ ] **Apple Developer** račun (ili postojeći team, npr. ITalk `6SCK58757K`) s pristupom za brand
- [ ] **App Store Connect** app record (bundle id iz manifesta, npr. `com.airkuna.wallet`) + `ascAppId` za `eas submit`
- [ ] **Google Play Console** developer račun + app record (package iz manifesta)
- [ ] **EAS projekt** per brand (`owner` + `easProjectId` u manifestu); builder ima member pristup
- [ ] **Firebase projekt** per brand: Android + iOS app registrirane za **prod i dev** application id (`<package>` i `<package>.dev`)

## 2. Push notifikacije

- [ ] **FCM**: `google-services-<id>.json` + `-dev` varijanta preuzete i lokalno položene (gitignored); doctor zelen
- [ ] **APNs**: APNs key/cert u Apple teamu; `GoogleService-Info-<id>.plist` + `-Dev` varijanta
- [ ] Firebase service account (za server-side slanje) čuvan u `apps/mobile/keys/<id>/` — **gitignored i easignored, nikad u repo/arhivu**
- [ ] EAS file env vars postavljene u brandovom EAS projektu (`GOOGLE_SERVICES_JSON`, `GOOGLE_SERVICES_PLIST`, `_DEV` varijante po environmentu)

## 3. Build inputi (validira `brand:doctor`)

- [ ] Manifest prolazi schemu; `eas.json` ima `preview-<id>` / `production-<id>` profile
- [ ] Brand asseti: icon, splash (light/dark), 3× android adaptive, favicon
- [ ] Credentials na EAS: Android keystore + iOS distribution cert/profile (prvi build kreira uz interaktivnu potvrdu; `--non-interactive` radi tek nakon toga)
- [ ] OTA (opcionalno): `updates` u manifestu + code-signing certifikat + update server ([mobile-local-run-setup] obrazac)

## 4. Store listing (po brandu!)

- [ ] Ime, kratki/dugi opis (HR + EN), kategorija Finance
- [ ] Screenshotovi (min. 6.5" iPhone + telefon/tablet za Play), feature grafika
- [ ] **Privacy policy URL — per brand domena** (ne Safeova!); data-safety/privacy upitnici (self-custody wallet: bez custodije, analytics po stvarnom stanju — Datadog/Firebase)
- [ ] Support kontakt (email/URL brand domene)
- [ ] Export compliance (iOS): `usesNonExemptEncryption=false` već u configu

## 5. GPL-3.0 obveza (fork!)

Monorepo je GPL-3.0: **binarna distribucija mora nuditi izvorni kod**.

- [ ] Fork repo javan (ili written offer) — commit iz kojeg je build nastao dostupan
- [ ] Link na source repo u store listing opisu ("Open source: github.com/…")
- [ ] Zadržani copyright/licence notices (LICENSE u repou)
- Safe danas: javni monorepo repo; mobile app **nema** in-app licences ekran (provjereno fazom 5) — link u store opisu je minimum; in-app "Licences" stavka u Settings = poželjna nadogradnja (post-MVP)

## 6. Submission

- [ ] `eas build --profile production-<id> --platform all` zelen; artefakt instaliran i **smoke checklist** ([brand/README.md](../../apps/mobile/brand/README.md#smoke-checklist-branded-build)) prošao
- [ ] `eas submit` profili po brandu (`ascAppId` / play track) — dodati u `eas.json` `submit` sekciju kad brand ide u store
- [ ] TestFlight / Play internal track runda prije produkcije
- [ ] Post-release: verzija tagirana, manifest + asseti arhivirani (SaaS DB jednog dana)

### 6.1 Smoke dodaci po brandu

Generički smoke je u [brand/README.md](../../apps/mobile/brand/README.md#smoke-checklist-branded-build); svaki brand s feature packovima dodaje svoje stavke ovdje.

**airkuna:**

- [ ] **Doniraj tab** vidljiv u tab baru (`features.donations`); na stock `safe` buildu ga NEMA
- [ ] Otvaranje kampanje po **slugu** dohvaća podatke s `api.domovina.ai` na uređaju (živi backend, ne mock)
- [ ] Donacijski flow: odabir kampanje → iznos → review ekran se otvara (bez slanja)
- [ ] **Send gumb vidljiv na Gnosisu** (`features.forceSendFlow` override — prod CGW nema `SEND_FLOW` za chain 100)
- [ ] "Bez naknade" copy u Send flowu (A3 zero-fee UX)
- [ ] Universal link `https://domovina.ai/c/<slug>` otvara app (iOS: AASA; Android: tek nakon `assetlinks.json` s otiskom EAS keystorea)

## Sučelje koje SaaS dashboard jednog dana zove

Manifest in → binary out: `BRAND_CONFIG_JSON` (inline manifest) + EAS file env
vars (Firebase) + `eas build --profile <variant>-<id>`. Sve iznad sekcije 4 je
automatizirano ili doctor-validirano; sekcije 4–6 ostaju ručne dok ne postoji
dashboard.
