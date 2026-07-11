# KUNAPay 1 (K1) — brand manifest i identitet `kunapay`

> Handoff prompt za praznu Claude Code sesiju. Repo: `/Users/ms/git/safe-global/safe-wallet-monorepo`, grana `custom`.
> Prije početka pročitaj [handoffs/README.md](README.md) i **obavezno** [08 — KUNAPay](../08-kunapay-consumer-brand.md) (SSOT strategije — ne otvarati ponovno odluke iz §2).

## Cilj

Postoji brand manifest `kunapay` s kojim `BRAND_ID=kunapay` build prolazi type-check i config evaluaciju, s KUNAPay temom (navy + zlato) i Gnosisom kao default mrežom. Nulti inkrement iz [08] §5 — čisti manifest + copy + odluke, bez novog koda i bez novih ruta. Stock brandovi (`safe`, `example.community`) ostaju bajt-identični.

## Kontekst i izvori

- [08 — KUNAPay](../08-kunapay-consumer-brand.md) §2: **KUNAPay** = consumer app (radni brand id `kunapay`), **airKUNA** = tračnica/DAO — razdvojeno namjerno (Aircash pitch). Konačno imenovanje je ručna odluka vlasnika; radni id se ne mijenja bez te odluke.
- Brand sustav: `apps/mobile/brand/README.md` (kako se manifest resolva, što je build-time vs runtime), `apps/mobile/brand/schema.js` (zod schema — jedina istina o poljima), `apps/mobile/brand/resolveBrand.js` (`loadBrandManifest` čita `BRAND_CONFIG_JSON` env pa `brand/manifests/${BRAND_ID}.json`).
- Precedenti manifesta: `apps/mobile/brand/manifests/example.community.json` (tracked template) i `apps/mobile/src/custom/ff/brand/ff.json` (FF feature-pack manifest, symlink obrazac).
- Boje — **izvor: `/Users/ms/git/airkuna/airkuna-web/README.md`, sekcija "Brand"**: navy `#002F6C` (povjerenje), zlato `#C8912A` / svjetlija varijanta `#E3AF35` (vrijednost, treasury), crvena `#C0181C` je rezervirana samo za .org kontekst — **ne koristi se u appu**.
- Runtime konzumacija: `apps/mobile/src/custom/brand/` (`getBrand()` / `useBrand()`), tema se primjenjuje u `apps/mobile/src/theme/tokens.ts`.

## Preduvjeti

**Ručni (vlasnik projekta — bez njih se koriste placeholder vrijednosti, zapiši u Zapisnik):**

| Preduvjet                                          | Gdje se upisuje                                 | Status                    |
| -------------------------------------------------- | ----------------------------------------------- | ------------------------- |
| Konačna potvrda imena "KUNAPay" i brand id-a       | manifest `id`/`name`                            | ⬜ radni naziv            |
| EAS projekt za kunapay (`easProjectId`)            | manifest `easProjectId`                         | ⬜ placeholder            |
| EAS owner račun (prijedlog: `airkuna`, kao ff)     | manifest `owner`                                | ⬜ potvrditi              |
| Apple Team ID + registracija bundle id-a           | manifest `ios.appleTeamId` / `bundleIdentifier` | ⬜ placeholder            |
| Android package (prijedlog: `org.airkuna.kunapay`) | manifest `android.package`                      | ⬜ potvrditi              |
| Firebase projekti (iOS+Android, dev+prod)          | gitignored fileovi (v. `brand/README.md`)       | ⬜ (nije blokada za K1)   |
| Ikona/splash asseti                                | `brand/assets/` (gitignored)                    | ⬜ fallback = Safe asseti |

**Automatski (postoji u repou):** brand resolver + schema (faza 0), runtime theme override (faza 1), `features` polje u schemi (FF presedan) — K1 ne dira ništa od toga.

## Opseg

**In:**

- Manifest `kunapay.json` validan po `schema.js`, s placeholder vrijednostima jasno označenima.
- Theme override (navy + zlato) za light i dark mod.
- Odluka o trackanju manifesta (v. Koraci, korak 2) — dokumentirana, s preporukom.
- HR copy razmatranja zapisana (v. Koraci, korak 5).

**Out (svjesno):**

- `features` flagovi (`fiat`, `claimLinks`, `identity`…) — dodaju ih kasnije faze koje ih implementiraju; K1 manifest ih ne navodi.
- Novi ekrani, rute, kod — ništa. (Zato **typed-routes gotcha iz FF PLAN.md §7 ovdje ne vrijedi** — nema novih ruta, nema regeneracije `.expo/types`.)
- Produkcijski asseti i store release (→ K6 / [faza-5-release-pipeline.md](faza-5-release-pipeline.md)).
- Firebase/EAS setup (ručni preduvjeti).

## Točne datoteke i šavovi

| Datoteka                                              | Izmjena                                                                                         |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `apps/mobile/brand/manifests/kunapay.json`            | **novo** — ili tracked (uz gitignore iznimku) ili lokalno linkan (v. odluku)                    |
| `apps/mobile/.gitignore`                              | samo ako odluka = tracked: `!/brand/manifests/kunapay.json` (linije 30–32 su postojeći obrazac) |
| `docs/whitelabel-wallet/08-kunapay-consumer-brand.md` | status K1 ⬜→✅ (nakon izvršenja)                                                               |
| `docs/whitelabel-wallet/handoffs/README.md`           | status K1 u KUNAPay tablici                                                                     |

Ništa drugo — nula šavova u kodu.

## Koraci

1. **Recon:** pročitaj `brand/README.md`, `brand/schema.js`, `resolveBrand.js` i oba postojeća manifesta (`example.community.json`, ff `ff.json`). Regression checklist je trivijalan (nema koda), ali potvrdi da `BRAND_ID=safe` put ostaje netaknut.

2. **Odluka: tracked iznimka vs gitignored-like-domovina.** `brand/manifests/*.json` je gitignoriran (iznimke: `safe.json`, `example.community.json`). Dvije opcije:
   - **A — tracked iznimka** (dodaj `!/brand/manifests/kunapay.json` u `apps/mobile/.gitignore`): manifest je javan dio repoa. **Preporuka.** Razlog: fork je open-source-as-product ([FF PLAN.md](../../../apps/mobile/src/custom/ff/docs/PLAN.md) §1.5 — "forkanje je proizvod"); KUNAPay je default consumer brand te priče i njegov manifest ne nosi tajne (easProjectId/bundle id nisu tajna; Firebase fileovi i certifikati ionako ostaju gitignored). Tracked manifest = reproducibilan build za svakoga tko forka.
   - **B — gitignored, SSOT drugdje** (domovina/ff obrazac): manifest živi izvan repoa ili u submodulu i **lokalno se symlinka u gitignorirani `brand/manifests/`** (FF gotcha, PLAN.md §7: `ln -sf ../../src/custom/ff/brand/ff.json apps/mobile/brand/manifests/ff.json`).

   **Konačna odluka = vlasnik.** Ako nije dostupan u sesiji, izvedi opciju A (preporuka) i zapiši u Zapisnik da je reverzibilna (obrisati iznimku + premjestiti file).

3. **Napiši manifest** `apps/mobile/brand/manifests/kunapay.json` po schemi. Polazni sadržaj (placeholder vrijednosti označene u tablici preduvjeta):

   ```json
   {
     "id": "kunapay",
     "name": "KUNAPay",
     "devNamePrefix": "Dev-",
     "slug": "kunapay",
     "owner": "airkuna",
     "easProjectId": "00000000-0000-0000-0000-000000000000",
     "scheme": ["kunapay", "wc"],
     "ios": {
       "bundleIdentifier": "org.airkuna.kunapay.ios",
       "appleTeamId": "XXXXXXXXXX"
     },
     "android": {
       "package": "org.airkuna.kunapay"
     },
     "backend": {
       "defaultChainId": "100"
     },
     "theme": {
       "light": {
         "primary.main": "#002F6C",
         "secondary.main": "#002F6C",
         "secondary.dark": "#00224E",
         "static.textBrand": "#C8912A"
       },
       "dark": {
         "primary.main": "#E3AF35",
         "static.textBrand": "#E3AF35"
       }
     }
   }
   ```

   - `scheme` mora biti `["kunapay", "wc"]` — `wc` zadržava WalletConnect deep-linkove (isti obrazac kao ff).
   - `defaultChainId: "100"` = Gnosis, EURe tračnica ([08] §1; isti invariant kao FF `clubs/currency.ts` — valuta je config).
   - Tema: navy kao primarna u light modu, zlato kao brand akcent; u dark modu navy je pretaman na tamnoj podlozi pa je polazni prijedlog zlato `#E3AF35` (svjetlija varijanta iz airkuna README-a). **Vizualno provjeri kontrast u oba moda na uređaju/simulatoru i korigiraj nijanse po potrebi** — dot-path ključevi i primjena su opisani u `brand/README.md` (nepoznati ključevi se tiho ignoriraju — validiraj protiv palete u `packages/theme/src/palettes/`).

4. **Verificiraj resolve:** manifest se mora učitati kroz `loadBrandManifest` i proći zod validaciju. Provjeri config evaluaciju bez builda:

   ```bash
   cd apps/mobile && BRAND_ID=kunapay npx expo config --type public | head -40
   ```

   te da postojeći `resolveBrand.test.ts` prolazi. Ako je odluka bila opcija A (tracked), dodaj test case koji učitava `kunapay.json` i asserta schema-validnost (kolociran u postojeći test file).

5. **HR copy razmatranja (zapiši u Zapisnik, ne implementiraj):** upstream UI je engleski; potpuna HR lokalizacija je zaseban posao izvan K1. Za K1 vrijedi samo: `name` je "KUNAPay" (bez razmaka, veliko P — brand ime, ne rečenica), `devNamePrefix` daje "Dev-KUNAPay" za dev variant. Svaki budući KUNAPay-vidljivi string: hrvatski, sentence case, bez emojija (pravilo iz airkuna-web README-a i root AGENTS.md).

6. **Dokumentacija i predaja:** označi K1 ✅ u KUNAPay tablici u `handoffs/README.md`, popuni Zapisnik (odluka iz koraka 2, stanje placeholdera), commit `feat(mobile): kunapay brand manifest` (ili `docs(whitelabel): …` ako je ispalo samo docs + json), push na `origin custom`.

## Kriteriji prihvaćanja

- [ ] `BRAND_ID=kunapay npx expo config --type public` prolazi bez grešaka; `extra.brand.id === "kunapay"`, tema i `defaultChainId` prisutni.
- [ ] Manifest prolazi zod validaciju kroz `loadBrandManifest` (schema iz `brand/schema.js`, bez izmjena scheme).
- [ ] `BRAND_ID=safe` (default) build je netaknut — config output bajt-identičan stanju prije ove faze.
- [ ] Odluka tracked vs gitignored dokumentirana u Zapisniku s obrazloženjem; ako tracked, gitignore iznimka postoji i manifest je u gitu.
- [ ] Placeholder vrijednosti (easProjectId, appleTeamId, bundle id-i) pobrojane u Zapisniku kao otvoreni ručni preduvjeti.
- [ ] `node scripts/verify.mjs --changed --workspace=mobile` čist.

## Zapisnik izvršenja

_(prazno — popunjava agent koji izvrši fazu)_
