# EAS build — debugging vodič (lekcije airkuna builda, 2026-07-22)

> Nastalo tijekom prvog per-brand EAS builda (`airkuna`, faza 5 + A4). Sve dolje je
> provjereno u praksi na buildovima `2c43e4a3` (errored) i `838170f4` (retry).
> Vidi i [brand/README.md](../brand/README.md) i `docs/whitelabel-wallet/16-release-checklist.md`.

## eas-cli treba brand kontekst

`eas-cli` u ovom repou radi **samo iz `apps/mobile` s postavljenim `BRAND_ID`** — bez toga
dinamički config resolvea stock `safe` brand (tuđi `easProjectId`) ili javi
"EAS project not configured":

```bash
cd apps/mobile
BRAND_ID=airkuna npx eas-cli build:view <BUILD_ID>
BRAND_ID=airkuna npx eas-cli build --profile preview-airkuna --platform android --non-interactive --no-wait
```

**Gotcha:** pozvan iz krivog direktorija (repo root), eas-cli **tiho kreira `app.json`
(`{"expo": {}}`) u cwd-u** — obriši ga, ne smije u git.

## Arhiv ne poštuje gitignore `!`-re-include (build 2c43e4a3)

EAS arhiver (npm `ignore` lib) **ne re-includea sadržaj ispod isključenog direktorija**,
za razliku od gita. Obrazac:

```gitignore
/brand/assets/*
!/brand/assets/airkuna/     # git: radi · EAS arhiv: NE radi (ni s /** varijantama)
```

tiho izbaci tracked assete iz build arhiva → **Prebuild ENOENT** na adaptive iconu, dok
lokalni `expo prebuild` uredno prolazi. Rješenje: **bez blanket ignora + `!` iznimke**;
privatni brandovi dobivaju eksplicitnu ignore liniju (v. komentar u `apps/mobile/.gitignore`).

**Dijagnostički alat** — točan arhiv koji bi se uploadao, bez pokretanja builda:

```bash
BRAND_ID=airkuna npx eas-cli build:inspect --platform android --profile preview-airkuna \
  --stage archive --output /Volumes/DOMOVINA2TB/airkuna_build_files/inspect
ls <output>/apps/mobile/brand/assets/airkuna/   # moraju biti svi PNG-ovi
```

(Output uvijek na vanjski disk — v. memory o disku.)

## Kako doći do logova erroranog builda (CLI, bez browsera)

`build:view` daje samo status; log fileovi se vade kroz Expo GraphQL (session token iz
`~/.expo/state.json`, header `expo-session`):

```bash
SESSION=$(python3 -c "import json;print(json.load(open('$HOME/.expo/state.json'))['auth']['sessionSecret'])")
curl -s https://api.expo.dev/graphql -H "expo-session: $SESSION" -H 'content-type: application/json' \
  -d '{"query":"{ builds { byId(buildId: \"<ID>\") { status logFiles error { message } } } }"}'
```

`logFiles` URL vraća **brotli-komprimirani JSONL** (bez ekstenzije/Content-Encodinga!) —
dekomprimiraj Nodeom: `zlib.brotliDecompressSync(raw)`. Svaka linija je JSON s `phase`
(`PREBUILD`, `INSTALL_DEPENDENCIES`, `RUN_EXPO_DOCTOR`…) i `msg`.

**Brža alternativa za Prebuild greške** — reproduciraj lokalno (lagano, bez gradlea):

```bash
BRAND_ID=airkuna APP_VARIANT=preview npx expo prebuild --platform android --no-install
```

Ako lokalno prolazi a EAS pada → problem je u arhivu ili EAS env varovima, ne u codebaseu.

## Ostali provjereni Expo API recepti

- **Popis računa / članstva**: `{ viewer { accounts { id name } } }`
- **EAS projekt po imenu**: `{ app { byFullName(fullName: "@airkuna/airkuna") { id } } }`
- **SHA-256 otisak Android keystorea** (za `assetlinks.json` — EAS auto-keystore nastaje
  uz prvi build): `{ app { byFullName(...) { androidAppCredentials {
androidAppBuildCredentialsList { androidKeystore { sha256CertificateFingerprint } } } } } }`
  → format za assetlinks: uppercase, `:`-odvojeno po bajtu.
- **Firebase inputi na EAS-u**: file env varovi `GOOGLE_SERVICES_JSON` / `GOOGLE_SERVICES_PLIST`
  (secret, po environmentu preview/production) — EAS ih mounta kao path.

## Ograničenja okoline

- **Expo doctor u buildu**: `RUN_EXPO_DOCTOR` zna prijaviti fail (duplicirani native moduli
  u monorepou) ali build nastavlja — nije terminalna greška; Prebuild jest.
- Free-tier EAS queue zna držati build u `in queue` 30–60+ min; `--no-wait` + periodični
  `build:view` je obrazac (orkestracijski watcher svakih ~2,5 min).

## Lokalni build bez queuea (`eas build --local`)

Kad je free-tier queue blokada, Android build se vrti lokalno **istim profilima, istim
arhiverom i istim remote keystoreom** (APK potpisan identično cloud buildu → app links i
update preko instalirane aplikacije rade). Toolchain je na ovom stroju kompletna
(Android SDK+NDK u `~/Library/Android/sdk`, JDK 21, gradle).

```bash
cd apps/mobile
BRAND_ID=airkuna \
EAS_LOCAL_BUILD_WORKINGDIR=/Volumes/DOMOVINA2TB/airkuna_build_files/eas-local \
GRADLE_USER_HOME=/Volumes/DOMOVINA2TB/airkuna_build_files/gradle-home \
npx eas-cli build --profile preview-airkuna --platform android --local \
  --output /Volumes/DOMOVINA2TB/airkuna_build_files/airkuna-preview.apk
```

Gotche:

- **Disk**: radni dir + gradle cache traže 10–15 GB → obavezno na vanjski disk (glavni
  ima ~6 GB slobodno). Ako vanjski disk ne podnosi symlinkove (exFAT), radni dir vrati
  na glavni disk, a samo `GRADLE_USER_HOME` i `--output` drži vani.
- **Secret file env varovi** (GOOGLE_SERVICES_JSON/PLIST s EAS-a) nisu dostupni lokalno —
  ne smeta, brand Firebase configi ionako postoje lokalno u `apps/mobile` (gitignorani).
- `preview-airkuna` je čist kandidat (nema `autoIncrement`); za `production-airkuna`
  (remote version source + autoIncrement) verzioniranje u lokalnom buildu ima ograničenja —
  produkciju i dalje raditi u cloudu.
