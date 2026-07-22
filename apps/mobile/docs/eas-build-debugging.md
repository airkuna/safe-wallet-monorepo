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
  vrijednost je sigurna jer se s `--dry-run` ništa ne šalje.
- **Gradle daemon pamti env** iz prvog pokretanja — nakon promjene env varova
  `pkill -f GradleDaemon` (ili koristi gradle.properties, koji se čita svaki build).
- `preview-airkuna` je čist kandidat (nema `autoIncrement`); za `production-airkuna`
  (remote version source + autoIncrement) verzioniranje u lokalnom buildu ima
  ograničenja — produkciju i dalje raditi u cloudu.
- Provjera potpisa: `apksigner verify --print-certs <apk>` → SHA-256 mora odgovarati
  otisku u `https://domovina.ai/.well-known/assetlinks.json`.
- **Exit kod zna biti 1 i kad build USPIJE**: nakon "Build successful" i zapisanog APK-a
  cleanup radne kopije padne na `ENOTEMPTY … build/.git`. Uspjeh se provjerava po
  "Build successful" u logu / postojanju APK-a, ne po exit kodu.
