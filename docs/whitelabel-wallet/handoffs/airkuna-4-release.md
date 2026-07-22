# airKUNA 4 (A4) — release pipeline za brand `airkuna`

> Handoff prompt za praznu Claude Code sesiju. Repo: `/Users/ms/git/safe-global/safe-wallet-monorepo`, grana `custom`.
> Prije početka pročitaj [handoffs/README.md](README.md), [15 — airKUNA wallet](../15-airkuna-wallet.md) §8 (ručni preduvjeti — **ova faza je njima blokirana**) i [faza-5-release-pipeline.md](faza-5-release-pipeline.md) (host obrazac koji se ovdje primjenjuje na airkunu).

## Cilj

`BRAND_ID=airkuna eas build --profile production` (Android i iOS) proizvodi potpisani, instalabilan
build s airKUNA identitetom, distribuiran na TestFlight + Play interni track. Ova faza je
**primjena** infrastrukture iz faze 5 na jedan konkretan brand — ako faza 5 (host pipeline: brand
doctor, EAS profili, smoke) još nije izvršena, izvrši nju prvo ili je uključi u ovu sesiju.

## Preduvjeti — checklist (STOP ako nije riješeno)

Prije ijednog koraka provjeri tablicu iz [15](../15-airkuna-wallet.md) §8 i ažuriraj status ovdje:

| Preduvjet                                                                | Bez njega                                                                               | Status                                                                                      |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| EAS projekt (`easProjectId`) + owner račun `airkuna`                     | build se ne može ni pokrenuti                                                           | ✅ `@airkuna/airkuna` = `a3bfe1f6-…` (u manifestu)                                          |
| Apple Team odluka (ITalk `6SCK58757K` ili vlastiti)                      | iOS signing nemoguć                                                                     | ✅ ITalk `6SCK58757K` (u manifestu)                                                         |
| Bundle id / package registrirani (`com.airkuna.wallet` + `.dev` variant) | store upload nemoguć                                                                    | 🔶 idevi odlučeni i u manifestu; Apple registracija = ručni korak vlasnika (Zapisnik)       |
| Firebase projekti iOS+Android (dev+prod, push)                           | build pada na google-services fileovima                                                 | ✅ `airkuna-production`, 4 appa; configi lokalno + EAS file env vars (preview i production) |
| Store računi (App Store Connect / Play Console)                          | distribucija nemoguća                                                                   | ⬜ ručni korak vlasnika (Zapisnik)                                                          |
| Ikona/splash asseti (A1 korak 4)                                         | build prolazi sa stock Safe assetima — prihvatljivo za interni track, NE za javni store | ✅ brand/assets/airkuna/ kompletan, doctor zelen                                            |

Ako je išta ⬜, radi što se može (dev/preview profil, Android prije iOS-a), ostalo zapiši u
Zapisnik kao blokirano i vrati vlasniku točan popis akcija.

**Automatski:** A1 mergean (manifest); faza 0 native identitet iz manifesta; [faza-5](faza-5-release-pipeline.md) host pipeline (ili se izvršava zajedno).

## Opseg

**In:**

- Popunjavanje airkuna manifesta stvarnim vrijednostima (zamjena placeholdera iz A1) — `easProjectId`, `appleTeamId`, potvrđeni idevi.
- Firebase datoteke za obje platforme + obje variante (gitignored, po `brand/README.md`).
- EAS build za airkunu kroz profile iz faze 5 (`.dev` sufiks variant obrazac kao domovina — `resolveBrand.js` to već računa).
- **OTA odluka**: self-hosted expo-updates kao domovina (`updates` blok + cert u `brand/certs/airkuna/`) ili bez OTA za MVP — preporuka: **bez OTA za MVP** (manje ručnih preduvjeta; reverzibilno), zapiši odluku.
- Smoke provjera brandiranog builda (faza-5 checklist: boje/ime/ikona, create account, receive QR, **plus airkuna-specifično**: Doniraj tab vidljiv, slug → kampanja dohvat radi na uređaju).
- TestFlight + Play interni track upload.
- **Android App Links za `/c/*`** (preporuka iz associatedDomains taska, 2026-07-22): iOS strana je gotova (AASA na domovina.ai živ + `ios.associatedDomains` u manifestu); za Android treba (1) `assetlinks.json` na `domovina.ai/.well-known/` sa SHA-256 otiskom **stvarnog potpisnog certa** (EAS keystore postoji od prvog builda — `eas credentials`), (2) novo manifest polje `android.appLinks: [{host, pathPrefix}]` → expo `android.intentFilters` s `autoVerify` (čista derivacija iz `associatedDomains` nije moguća jer Android traži eksplicitni path scope).

**Out (svjesno):**

- Javni store listing (screenshotovi, privacy policy URL, GPL-3.0 source ponuda) — faza-5 korak 5 checklist, zaseban ručni posao.
- SaaS automatizacija, CI — faza-5 opseg.
- Bilo kakav app kod — ova faza mijenja samo manifest, gitignored config datoteke i eventualno `eas.json`/docs.

## Točne datoteke i šavovi

| Datoteka                                      | Izmjena                                                                                                           |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `apps/mobile/brand/manifests/airkuna.json`    | placeholderi → stvarne vrijednosti (easProjectId, appleTeamId, potvrđeni idevi; `updates` blok ako OTA = da)      |
| Firebase datoteke (gitignored)                | `google-services-airkuna*.json`, `GoogleService-Info-airkuna*.plist` po `brand/README.md` konvenciji              |
| `apps/mobile/eas.json`                        | samo ako faza-5 profili traže per-brand dopunu (izbjegavaj — parametrizacija preko `BRAND_ID` env je cilj faze 5) |
| `docs/whitelabel-wallet/15-airkuna-wallet.md` | §8 tablica statusa preduvjeta (nakon izvršenja)                                                                   |
| `docs/whitelabel-wallet/handoffs/README.md`   | status A4                                                                                                         |

## Koraci

1. **Checklist preduvjeta** (gore) — ažuriraj, odluči dokle se može.
2. **Faza-5 stanje:** ako host pipeline (brand doctor, EAS profili) nije isporučen, izvrši [faza-5-release-pipeline.md](faza-5-release-pipeline.md) korake 1–3 prvo (u istoj sesiji ako stane, inače kao zasebnu fazu — zapiši).
3. **Manifest + Firebase:** upiši stvarne vrijednosti, položi Firebase datoteke, `BRAND_ID=airkuna yarn brand:doctor` (ili ekvivalent iz faze 5) mora biti zelen.
4. **Buildovi:** Android preview → Android production → iOS (redoslijed po riziku); svaki build instaliraj i provuci smoke checklist (uklj. Doniraj flow).
5. **Distribucija:** TestFlight + Play interni track; zabilježi build brojeve u Zapisnik.
6. **Predaja:** A4 ✅ u airKUNA tablici, statusi preduvjeta u [15] §8, Zapisnik (OTA odluka, blokirano/isporučeno), commit `chore(mobile): airkuna release konfiguracija` (+ `docs(whitelabel):` za status update), push na `origin custom`.

## Kriteriji prihvaćanja

- [ ] `BRAND_ID=airkuna` build (min. Android) instaliran s ispravnim imenom, ikonom, bojama; `Dev-airKUNA` variant radi paralelno uz produkcijski (`.dev` sufiks).
- [ ] Smoke checklist prolazi na uređaju, uključivo Doniraj tab + dohvat kampanje.
- [ ] Nula secrets/credentials u repou (Firebase/keys ostaju gitignored; provjeri `git status` prije committa).
- [ ] OTA odluka dokumentirana; ako OTA = da, cert u `brand/certs/airkuna/` je tracked, privatni ključ NIJE.
- [ ] Preostali blokirani preduvjeti pobrojani u Zapisniku s točnim akcijama za vlasnika.
- [ ] `node scripts/verify.mjs --changed --workspace=mobile` čist (ako je diralo išta izvan docs/config).

## Zapisnik izvršenja

> 2026-07-22 · sesija dev2 · automatizirani dio faze; ručni koraci vlasnika pobrojani dolje.

### OTA odluka: **BEZ OTA za MVP** ✅

Airkuna manifest **nema** `updates` blok i ne dodaje se. Razlozi:

1. Manje ručnih preduvjeta — self-hosted expo-updates (domovina obrazac) traži update server, code-signing cert u `brand/certs/airkuna/` + privatni ključ, i operativu oko manifest potpisivanja; ništa od toga nije potrebno za TestFlight/interni track MVP.
2. Interni track distribucija ionako ide kroz store kanale — novi build je jednako brz kao OTA za ovu fazu.
3. **Reverzibilno**: uključenje kasnije = `updates` blok u manifestu + cert + rebuild (postojeći `ota.domovina.ai` server se može višebrandirati); nula promjena app koda.

### Odrađeno (automatizirano)

- **Preduvjeti**: tablica gore ažurirana — svi build-blokirajući preduvjeti ✅ (EAS projekt, Apple team, Firebase, asseti); ostaju store-računi kao ručni koraci.
- **Brand doctor**: `yarn brand:doctor airkuna` → **PASS (0 warnings)** (manifest, asseti, 4 Firebase filea s ispravnim application idevima, EAS profili).
- **EAS build profili**: `preview-airkuna` / `production-airkuna` postoje u `eas.json` od faze 5 — provjereni, bez izmjena.
- **EAS file env vars (production)**: kreirani na `@airkuna/airkuna` — `GOOGLE_SERVICES_JSON` (`google-services-airkuna.json`) i `GOOGLE_SERVICES_PLIST` (`GoogleService-Info-airkuna.plist`), secret/project scope; preview ih je već imao. Production remote build sada ima Firebase inpute.
- **`eas.json` submit profil** `production-airkuna` (Android): `applicationId com.airkuna.wallet`, `track internal`, `releaseStatus draft`, `serviceAccountKeyPath ./keys/airkuna/play-service-account.json` (fajl još ne postoji — v. Play koraci). iOS submit namjerno izostavljen dok ne postoji `ascAppId` (v. iOS koraci).
- **Smoke checklist**: airkuna-specifične stavke (Doniraj tab, slug dohvat, forceSendFlow, zero-fee copy, `/c/*` link) dodane u [16 — Release checklist](../16-release-checklist.md) §6.1.
- **Android preview build** `2c43e4a3` u EAS redu — prati ga orkestrator (izvan opsega ove sesije); production-android build namjerno NIJE pokrenut.
- **Nije dirano** (ograde sesije): `brand/schema.*`, `resolveBrand.*`, `app.config.ts`, `airkuna.json`, `src/` — na njima radi druga sesija (uklj. novo `android.appLinks` polje u manifestu).

### Ručni koraci za vlasnika — iOS (redoslijedom)

1. **ASC API key** (za credentials + submit bez Apple ID logina): App Store Connect → Users and Access → Integrations → App Store Connect API → Team Keys → generiraj key s rolom **App Manager** (ITalk team `6SCK58757K`); preuzmi `.p8` (jednokratno!). Zatim: `cd apps/mobile && BRAND_ID=airkuna npx eas-cli credentials --platform ios` → odaberi production → "App Store Connect: Manage your API Key" → upload `.p8` + Key ID + Issuer ID.
2. **Bundle id registracija**: u istom `eas credentials` flowu EAS nudi auto-registraciju bundle ideva na Apple Developer portalu — potvrdi za `com.airkuna.wallet` **i** `com.airkuna.wallet.dev`. Capabilities koje build očekuje: Push Notifications, Associated Domains (AASA već živ), App Groups. (Alternativa: ručno na developer.apple.com → Identifiers.) Distribution cert + provisioning profile EAS kreira sam pri prvom buildu (prvi put interaktivno, bez `--non-interactive`).
3. **ASC app record**: App Store Connect → My Apps → **New App** → platforma iOS, bundle `com.airkuna.wallet`, ime "airKUNA", SKU po želji. Zapiši **Apple ID (ascAppId)** appa → upiši u `eas.json` `submit.production-airkuna.ios.ascAppId`.
4. **Build + TestFlight**: `cd apps/mobile && eas build --profile production-airkuna --platform ios` (prvi put interaktivno zbog credentials), pa `eas submit --profile production-airkuna --platform ios`. U TestFlightu dodaj interne testere (do 100, bez reviewa).

### Ručni koraci za vlasnika — Google Play (redoslijedom)

1. **App record**: Play Console (developer račun vlasnika) → **Create app** → ime "airKUNA", app (ne igra), Finance, besplatno. Package `com.airkuna.wallet` se veže tek prvim uploadom.
2. **Prvi AAB ručno**: Play zahtijeva da prvi artefakt novog appa ide kroz Console UI — preuzmi `production-airkuna` Android artefakt s EAS-a (kad se pokrene i završi) i uploadaj na **Internal testing** track. Time se package id fiksira.
3. **Service account za `eas submit`** (NIJE isti kao `keys/airkuna/firebase-adminsdk.json` — taj je za push!): Google Cloud Console (bilo koji projekt, može `airkuna-production`) → IAM → Service Accounts → novi SA → JSON ključ → spremi kao `apps/mobile/keys/airkuna/play-service-account.json` (dir je gitignored + easignored). U Play Console → Users and permissions → **Invite new user** s emailom SA-a → prava: Release to testing tracks (min.) za airKUNA app.
4. **Nadalje**: `eas submit --profile production-airkuna --platform android` šalje na interni track (`draft` status — objava klikom u Consoleu).

### Blokirano / ostaje

- **Android App Links**: manifest polje `android.appLinks` postoji (druga sesija); ostaje `assetlinks.json` na `domovina.ai/.well-known/` sa **SHA-256 otiskom EAS keystorea** — otisak dostupan tek nakon prvog Android builda (`eas credentials --platform android`); hosting = orkestrator/vlasnik.
- **Smoke na uređaju** (§6.1 checklist) — nakon što preview build `2c43e4a3` završi i instalira se.
- **Javni store listing** (screenshotovi, privacy policy URL na airkuna domeni, GPL-3.0 source link) — doc 16 §4–5, svjesno izvan A4 opsega.
