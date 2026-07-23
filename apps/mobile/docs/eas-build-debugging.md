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

> ✅ Provjereno E2E 2026-07-23: APK potpisan istim EAS keystoreom (SHA-256 otisak
> identičan živom assetlinks.json), ~16 min s toplim cacheom. Recept dolje je rezultat
> 11 pokušaja — svaki korak postoji s razlogom.

Lokalni build koristi **iste profile, isti arhiver i isti remote keystore** kao cloud
(APK potpisan identično → app links i update preko instalirane aplikacije rade).

**Jednokratni setup** (oba vanjska diska su ExFAT — bez symlinkova, pa yarn/gradle na
njima NE rade; rješenje je APFS sparse image na vanjskom disku):

```bash
hdiutil create -type SPARSEBUNDLE -fs APFS -size 80g -volname EASBUILD \
  /Volumes/DOMOVINA2TB/airkuna_build_files/easbuild.sparsebundle
hdiutil attach /Volumes/DOMOVINA2TB/airkuna_build_files/easbuild.sparsebundle
mkdir -p /Volumes/EASBUILD/{eas-local,gradle-home,tmp}

# JDK 17 (RN toolchain ga traži; instaliran je samo 21 → gradle bi zvao foojay
# resolver koji je nekompatibilan s Gradleom 9: "JvmVendorSpec ... IBM_SEMERU")
curl -sL -o /Volumes/EASBUILD/jdk17.tar.gz \
  "https://api.adoptium.net/v3/binary/latest/17/ga/mac/aarch64/jdk/hotspot/normal/eclipse"
mkdir -p /Volumes/EASBUILD/jdk17 && tar xzf /Volumes/EASBUILD/jdk17.tar.gz \
  -C /Volumes/EASBUILD/jdk17 --strip-components=1 && rm /Volumes/EASBUILD/jdk17.tar.gz

cat > /Volumes/EASBUILD/gradle-home/gradle.properties <<'EOF'
org.gradle.java.installations.paths=/Volumes/EASBUILD/jdk17/Contents/Home
org.gradle.java.installations.auto-download=false
org.gradle.jvmargs=-Xmx6g -XX:MaxMetaspaceSize=2g -Djava.io.tmpdir=/Volumes/EASBUILD/tmp
datadogSourcemapsDryRun=true
EOF
```

**Build** (workingdir MORA biti prazan — EAS ga ne čisti nakon neuspjeha):

```bash
rm -rf /Volumes/EASBUILD/eas-local && mkdir -p /Volumes/EASBUILD/eas-local
cd apps/mobile
export ANDROID_HOME="$HOME/Library/Android/sdk" TMPDIR=/Volumes/EASBUILD/tmp
BRAND_ID=airkuna \
GOOGLE_SERVICES_JSON=$PWD/google-services-airkuna.json \
DATADOG_SOURCEMAPS_DRY_RUN=true DATADOG_API_KEY=dummy-local-dry-run \
EAS_LOCAL_BUILD_WORKINGDIR=/Volumes/EASBUILD/eas-local \
GRADLE_USER_HOME=/Volumes/EASBUILD/gradle-home \
npx eas-cli build --profile preview-airkuna --platform android --local \
  --output /Volumes/DOMOVINA2TB/airkuna_build_files/airkuna-preview-local.apk
```

Zašto svaki dio (svaki je bio zaseban pad):

- **`GOOGLE_SERVICES_JSON` apsolutnom putanjom**: arhiver izbacuje gitignorane fajlove
  pa brand Firebase config ne postoji u radnoj kopiji; EAS secret file env varovi
  lokalno nisu dostupni. Apsolutna putanja do fajla u pravom repou rješava oboje.
- **JDK 17 + `installations.paths`**: bez lokalnog JDK 17 gradle pokreće toolchain
  auto-download kroz stari foojay-resolver → `NoSuchFieldError: IBM_SEMERU` (Gradle 9).
- **`-Xmx6g -XX:MaxMetaspaceSize=2g`**: default (512m metaspace) pukne na ovom monorepou
  ("Could not stop all services. > Metaspace").
- **`java.io.tmpdir` + `TMPDIR` na image**: AGP prefab staging i eas-cli tar.gz arhiv
  inače idu u `/var/folders` na glavnom (punom) disku → "No space left on device".
- **Datadog dry-run + dummy ključ**: `uploadReleaseSourcemaps` je `finalizedBy` na
  bundlanju i ne može se preskočiti; dry-run (env ili gradle property) dodaje
  `--dry-run`, ali `datadog-ci` svejedno traži da `DATADOG_API_KEY` postoji — dummy
  vrijednost je sigurna jer se s `--dry-run` ništa ne šalje. **Isto ruši i CLOUD
  buildove** (potvrđeno na 838170f4): fix je jednokratni
  `eas env:create --environment preview --name DATADOG_SOURCEMAPS_DRY_RUN --value true
--visibility plaintext --scope project` + isto za `DATADOG_API_KEY` (dummy,
  sensitive). Za `production` environment ista odluka: dummy+dry-run ili pravi DD ključ.
- **Gradle daemon pamti env** iz prvog pokretanja — nakon promjene env varova
  `pkill -f GradleDaemon` (ili koristi gradle.properties, koji se čita svaki build).
- `preview-airkuna` je čist kandidat (nema `autoIncrement`); za `production-airkuna`
  (remote version source + autoIncrement) verzioniranje u lokalnom buildu ima
  ograničenja — produkciju i dalje raditi u cloudu.
- Provjera potpisa: `apksigner verify --print-certs <apk>` → SHA-256 mora odgovarati
  otisku u `https://domovina.ai/.well-known/assetlinks.json`.
- **Exit kod zna biti 1 i kad build USPIJE**: nakon "Build successful" i zapisanog APK-a
  cleanup radne kopije padne na `ENOTEMPTY … build/.git`. Uspjeh se provjerava po
  "Build successful" u logu / postojanju APK-a, ne po exit kodu. (Vrijedi i za iOS.)

## Cloud pipeline potvrđen (2026-07-23)

Cloud Android `preview-airkuna` build `9b13d407` **finished** nakon env fixa
(`DATADOG_SOURCEMAPS_DRY_RUN` + dummy `DATADOG_API_KEY` u EAS `preview` environmentu)
— cloud queue je od sada samo čekanje, build proces je dokazano ispravan.

## Lokalni iOS build (`eas build --local --platform ios`)

> ✅ Provjereno E2E 2026-07-23 (`preview-ios-simulator`, credential-free): `airKUNA.app`
> u tar.gz artefaktu. Tri pada dok se nije složilo — svaki je lekcija dolje.

**Preduvjeti povrh Android setupa** (Xcode + CocoaPods već postoje):

```bash
gem install fastlane --no-document   # eas local iOS build ga zahtijeva
# gem bin dir NIJE na defaultnom PATH-u — homebrew ruby:
export PATH="/opt/homebrew/lib/ruby/gems/3.4.0/bin:/opt/homebrew/opt/ruby/bin:$PATH"
```

**Build (simulator, bez credentials-a):**

```bash
rm -rf /Volumes/EASBUILD/eas-local-ios && mkdir -p /Volumes/EASBUILD/eas-local-ios
cd apps/mobile
export TMPDIR=/Volumes/EASBUILD/tmp
BRAND_ID=airkuna \
GOOGLE_SERVICES_PLIST=$PWD/GoogleService-Info-airkuna.plist \
DATADOG_SOURCEMAPS_DRY_RUN=true DATADOG_API_KEY=dummy-local-dry-run \
EAS_LOCAL_BUILD_WORKINGDIR=/Volumes/EASBUILD/eas-local-ios \
npx eas-cli build --profile preview-ios-simulator --platform ios --local \
  --non-interactive --output /Volumes/DOMOVINA2TB/airkuna_build_files/airkuna-preview-sim.tar.gz
```

Lekcije (svaka je bila zaseban pad):

- **Stale `ios/`/`android/` prebuild direktoriji ruše config rezoluciju.** Lokalni
  eas-cli resolvea app config u pravom projektnom diru; ako tamo stoji `ios/` od ranijeg
  `expo prebuild`/`expo run` za DRUGI brand (npr. `ios/DevDomovina`), introspect tiho
  padne (exit 1 bez outputa!), a fallback pukne na `EXUpdatesRuntimeVersion` u starom
  `Expo.plist` (domovina ima OTA → runtimeVersion; airkuna nema). Fix: makni/obriši
  `apps/mobile/ios` i `android` prije lokalnog EAS builda — regenerabilni su, u arhiv
  ionako ne ulaze (gitignored).
- **Datadog na iOS-u NEMA dry-run put** (za razliku od gradle `datadogSourcemapsDryRun`):
  `expo-datadog` plugin generira "Upload dSYMs to Datadog" fazu i wrapa RN bundle kroz
  `datadog-ci react-native xcode`, koji ključ validira API pozivom → dummy ključ →
  `Configuration error … not a valid API key` → xcodebuild exit 65. Fix je u
  `app.config.ts`: gate `datadogUploadArtifacts = EAS_BUILD && DATADOG_SOURCEMAPS_DRY_RUN
!== 'true'` na svim `errorTracking` opcijama — s dry-runom se upload faze uopće ne
  generiraju (vrijedi za obje platforme; cloud preview env već ima taj var).
- **Local-build-plugin prosljeđuje CIJELI parent env** (`...process.env` + `EAS_BUILD=1`)
  u sve build korake — zato `BRAND_ID`, `GOOGLE_SERVICES_PLIST` (apsolutna putanja!) i
  `DATADOG_*` varovi iz shella rade. `builderEnvironment.env` u job JSON-u je `{}` i to
  je OK.
- **Monitoring gotcha**: novi run truncatea log tek kad se npx stvarno pokrene (par
  sekundi do minute) — `tail`/`grep` u tom prozoru čitaju STARI sadržaj i lako se krivo
  zaključi da je novi run pao sa starom greškom. Provjeri `ps` prije dijagnoze.

### iOS s remote credentials (`preview-airkuna`) — interaktivni korak za vlasnika

Non-interactive pokušaj staje ovdje (očekivano, credentials još ne postoje):

```
Setting up credentials for following targets:
- airKUNA (com.airkuna.wallet)
- NotifeeNotificationServiceExtension (com.airkuna.wallet.NotifeeNotificationServiceExtension)
Failed to set up credentials. You're in non-interactive mode…
```

Internal distribution = **ad-hoc provisioning** → traži Apple ID login + registriran
UDID test iPhonea. Koraci (jednokratno, ~10 min):

1. `cd apps/mobile && BRAND_ID=airkuna npx eas-cli device:create` → izaberi
   "Website" → otvori generirani link NA iPHONEU → instaliraj profil (registrira UDID).
2. `BRAND_ID=airkuna npx eas-cli build --profile preview-airkuna --platform ios`
   (BEZ `--non-interactive`; cloud ili `--local`, svejedno) → login Apple ID-em
   (team ITalk `6SCK58757K`) → potvrdi generiranje dist certa + DVA ad-hoc profila
   (glavni target + Notifee extension). EAS sve sprema remote — svaki idući build
   (i lokalni i cloud) radi bez pitanja.
3. Nakon toga backup credentials-a (v. sekciju dolje).

## Backup potpisnih ključeva (anti vendor lock-in)

EAS drži ključeve, ali su izvlačivi — arhivirano 2026-07-23 u
`/Volumes/DOMOVINA2TB/airkuna_build_files/credentials/` + `apps/mobile/keys/airkuna/`
(gitignored kroz `/keys/`), u `credentials.json` formatu (odmah upotrebljiv uz
`"credentialsSource": "local"` ili običan gradle/apksigner).

- **Android keystore = identitet appa** (assetlinks!), gubitak je nepovratan — ovaj
  backup je kritičan. Izvlačenje kroz GraphQL (session recept gore), polja na
  `androidKeystore`: `keystore` (base64 JKS), `keystorePassword`, `keyAlias`,
  `keyPassword`. Verificiraj otisak `keytool -list -v` protiv assetlinks.json.
  airkuna ključ vrijedi do 2053.
- **iOS nema pravi lock-in**: identitet je bundle ID + Apple team, certovi se
  regeneriraju u Apple računu. Kad credentials nastanu, ista GraphQL ruta:
  `iosAppCredentials { iosAppBuildCredentialsList { distributionCertificate {
certificateP12 certificatePassword } provisioningProfile { provisioningProfile } } }`.
