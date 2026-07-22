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

| Preduvjet                                                                | Bez njega                                                                               | Status |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- | ------ |
| EAS projekt (`easProjectId`) + owner račun `airkuna`                     | build se ne može ni pokrenuti                                                           | ⬜     |
| Apple Team odluka (ITalk `6SCK58757K` ili vlastiti)                      | iOS signing nemoguć                                                                     | ⬜     |
| Bundle id / package registrirani (`com.airkuna.wallet` + `.dev` variant) | store upload nemoguć                                                                    | ⬜     |
| Firebase projekti iOS+Android (dev+prod, push)                           | build pada na google-services fileovima                                                 | ⬜     |
| Store računi (App Store Connect / Play Console)                          | distribucija nemoguća                                                                   | ⬜     |
| Ikona/splash asseti (A1 korak 4)                                         | build prolazi sa stock Safe assetima — prihvatljivo za interni track, NE za javni store | ⬜     |

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

_(prazno — popunjava agent koji izvrši fazu)_
