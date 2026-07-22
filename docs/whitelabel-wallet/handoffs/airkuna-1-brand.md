# airKUNA 1 (A1) — brand manifest `airkuna` + `donations` schema polje

> Handoff prompt za praznu Claude Code sesiju. Repo: `/Users/ms/git/safe-global/safe-wallet-monorepo`, grana `custom`.
> Prije početka pročitaj [handoffs/README.md](README.md) i **obavezno** [15 — airKUNA wallet](../15-airkuna-wallet.md) (SSOT strategije — ne otvarati ponovno odluke iz §3).

## Cilj

Postoji tracked brand manifest `airkuna` s kojim `BRAND_ID=airkuna` build prolazi type-check i
config evaluaciju, s airKUNA temom (navy + zlato), Gnosisom kao default mrežom i **novim manifest
poljem `donations`** (schema + runtime tip) koje će A2 konzumirati. Stock brandovi (`safe`,
`example.community`) i `domovina` ostaju bajt-identični.

## Kontekst i izvori

- [15 — airKUNA wallet](../15-airkuna-wallet.md): §3 (odluke), §7 (brand smjernice + tablica tokena), §8 (ručni preduvjeti — placeholderi).
- Brand sustav: `apps/mobile/brand/README.md`, `apps/mobile/brand/schema.js` (zod schema — jedina istina o poljima), `apps/mobile/brand/resolveBrand.js` (`loadBrandManifest`, forward runtime polja).
- Precedenti manifesta: `apps/mobile/brand/manifests/domovina.json` (tracked, s `features` + `events` poljem) i `example.community.json` (tracked template s `theme`).
- Presedan novog schema polja: `events` blok u `schema.js` (+ `schema.d.ts`, forward u `resolveBrand.js`, `RuntimeBrand.events` u `src/custom/brand/types.ts`) — `donations` je strukturna kopija.
- Boje — izvor `/Users/ms/git/airkuna/airkuna-web/README.md`, sekcija "Brand": navy `#002F6C`, zlato `#C8912A` / svjetlija `#E3AF35`; crvena `#C0181C` je `.org`-only — **ne koristi se u appu**. Logo: `coin.svg` (512×512) u istom repou.
- Runtime konzumacija: `apps/mobile/src/custom/brand/` (`getBrand()` / `useBrand()`), tema u `apps/mobile/src/theme/tokens.ts`.

## Preduvjeti

**Ručni (vlasnik — bez njih placeholderi, zapiši u Zapisnik):** tablica u [15](../15-airkuna-wallet.md) §8 (EAS projekt/owner, Apple team, bundle id, Firebase, asseti). Ništa od toga ne blokira A1 — kunapay-1 obrazac: placeholder vrijednosti jasno označene.

**Automatski (postoji u repou):** brand resolver + schema (faza 0), runtime theme override (faza 1), `features` polje (FF presedan), `events` polje kao uzor za `donations`.

## Opseg

**In:**

- Tracked manifest `airkuna.json` + gitignore iznimka (kunapay-1 korak 2, **opcija A** — odluka je tamo već obrazložena: manifest ne nosi tajne, tracked = reproducibilan build; symlink obrazac je ff-specifičan jer je ff git submodule).
- Novo schema polje `donations` (svih 5 datoteka, v. tablicu šavova) + `features: { donations: true }` u manifestu.
- Theme override (navy + zlato) za light i dark mod.
- Assets: **ako je** lokalni `/Users/ms/git/airkuna/airkuna-web` dostupan u sesiji — rasterizirati `coin.svg` → icon / splash / androidAdaptiveIcon PNG-ovi u `apps/mobile/brand/assets/airkuna/` uz gitignore iznimku `!/brand/assets/airkuna/`; inače fallback = stock Safe asseti (resolver to već radi), zapiši u Zapisnik.

**Out (svjesno):**

- Donations pack kod, rute, ekrani → A2. (Nema novih ruta ⇒ typed-routes regeneracija nije potrebna.)
- Zero-fee UX → A3; release/Firebase/EAS setup → A4 + ručni preduvjeti.
- Font swap (Fraunces/Inter) — post-MVP ([15] §7).

## Točne datoteke i šavovi

| Datoteka                                    | Izmjena                                                                                              |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `apps/mobile/brand/manifests/airkuna.json`  | **novo** — tracked manifest (v. Koraci, korak 2)                                                     |
| `apps/mobile/.gitignore`                    | `!/brand/manifests/airkuna.json` (postojeći obrazac linija 163–166); iznimka za assets ako se dodaju |
| `apps/mobile/brand/schema.js`               | `donations` blok — kopija `events` bloka (`apiBaseUrl: z.string().url()`)                            |
| `apps/mobile/brand/schema.d.ts`             | tip za `donations`                                                                                   |
| `apps/mobile/brand/resolveBrand.js`         | forward `donations: manifest.donations` (uzor: `events: manifest.events`)                            |
| `apps/mobile/brand/resolveBrand.d.ts`       | tip za forwardano polje                                                                              |
| `apps/mobile/src/custom/brand/types.ts`     | `RuntimeBrand.donations` (uzor: `RuntimeBrand.events`)                                               |
| `apps/mobile/brand/resolveBrand.test.ts`    | novi test caseovi (airkuna.json validnost, `donations` forward)                                      |
| `docs/whitelabel-wallet/handoffs/README.md` | status A1 u airKUNA tablici (nakon izvršenja)                                                        |

## Koraci

1. **Recon:** pročitaj `brand/README.md`, `schema.js`, `resolveBrand.js`, `src/custom/brand/types.ts` i postojeće manifeste. Regression checklist: `BRAND_ID=safe` put mora ostati netaknut.

2. **Schema prvo:** dodaj `donations` polje u `schema.js` (opcionalan objekt, `apiBaseUrl: z.string().url()`; **bez** `confirmUrl` — confirm ide na isti `apiBaseUrl`, dodaje se tek ako se ikad pokaže potreba), tipove u `schema.d.ts` i `resolveBrand.d.ts`, forward u `resolveBrand.js` (runtime blok na dnu `resolveBrand`), `RuntimeBrand.donations` u `src/custom/brand/types.ts` s JSDoc opisom (uzor `events`).

3. **Napiši manifest** `apps/mobile/brand/manifests/airkuna.json` + gitignore iznimka. Polazni sadržaj (placeholderi = ručni preduvjeti iz [15] §8):

   ```json
   {
     "id": "airkuna",
     "name": "airKUNA",
     "devNamePrefix": "Dev-",
     "slug": "airkuna",
     "owner": "airkuna",
     "easProjectId": "00000000-0000-0000-0000-000000000000",
     "scheme": ["airkuna", "wc"],
     "ios": {
       "bundleIdentifier": "com.airkuna.wallet",
       "appleTeamId": "XXXXXXXXXX"
     },
     "android": {
       "package": "com.airkuna.wallet"
     },
     "backend": {
       "defaultChainId": "100"
     },
     "features": {
       "donations": true
     },
     "donations": {
       "apiBaseUrl": "https://api.domovina.ai/functions/v1"
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

   - `scheme` mora sadržavati `wc` (WalletConnect deep-linkovi, ff/kunapay obrazac).
   - `defaultChainId: "100"` = Gnosis, EURe tračnica ([15] §3 odluka 1).
   - Tema: dot-path ključevi po `brand/README.md`; nepoznati ključevi se tiho ignoriraju — validiraj protiv palete u `packages/theme/src/palettes/`. **Vizualno provjeri kontrast u oba moda** i korigiraj nijanse po potrebi.

4. **Asseti (uvjetno):** ako je airkuna-web repo dostupan, rasteriziraj `coin.svg` (npr. `rsvg-convert`/`sharp`) u dimenzije koje `resolveBrand.js` `SAFE_DEFAULT_ASSETS` očekuje (pogledaj stock assete u `apps/mobile/assets/images/` za dimenzije), spremi u `brand/assets/airkuna/`, referenciraj iz manifesta `assets` bloka (pathovi su relativni na `brand/`). Inače preskoči — fallback je automatski.

5. **Verificiraj resolve:**

   ```bash
   cd apps/mobile && BRAND_ID=airkuna npx expo config --type public | head -40
   ```

   `extra.brand.id === "airkuna"`, tema, `defaultChainId`, `features.donations` i `donations.apiBaseUrl` prisutni. Dodaj test caseove u `resolveBrand.test.ts`: (a) airkuna.json prolazi schemu, (b) `donations` polje se forwarda, (c) manifest **bez** `donations` polja i dalje prolazi (backward-compat za sve postojeće brandove).

6. **Dokumentacija i predaja:** označi A1 ✅ u airKUNA tablici u `handoffs/README.md`, popuni Zapisnik (stanje placeholdera, asseti da/ne), commit `feat(mobile): airkuna brand manifest + donations schema polje`, push na `origin custom`.

## Kriteriji prihvaćanja

- [ ] `BRAND_ID=airkuna npx expo config --type public` prolazi; `extra.brand` sadrži id/temu/`defaultChainId`/`features.donations`/`donations.apiBaseUrl`.
- [ ] Manifest prolazi zod validaciju kroz `loadBrandManifest`; `donations` polje opcionalno (postojeći manifesti netaknuti prolaze).
- [ ] `BRAND_ID=safe` config output bajt-identičan stanju prije faze.
- [ ] Gitignore iznimka postoji i manifest je u gitu.
- [ ] Placeholderi (easProjectId, appleTeamId, bundle idevi) pobrojani u Zapisniku kao otvoreni ručni preduvjeti.
- [ ] `node scripts/verify.mjs --changed --workspace=mobile` čist.

## Zapisnik izvršenja

_(prazno — popunjava agent koji izvrši fazu)_
