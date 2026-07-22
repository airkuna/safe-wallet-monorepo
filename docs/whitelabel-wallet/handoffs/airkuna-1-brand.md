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

> Izvršeno: 2026-07-22 (dev1). Sve iz opsega isporučeno; odstupanja i nalazi dolje.

**Isporučeno po planu:**

- `donations` schema polje u svih 5 datoteka šavova (strukturna kopija `events`, samo `apiBaseUrl`, bez `confirmUrl`).
- Tracked manifest `airkuna.json` + gitignore iznimke; tema navy/zlato za oba moda; `defaultChainId: "100"` (Gnosis); `features.donations: true`.
- Testovi: 4 nova casea u `resolveBrand.test.ts` (airkuna s diska, `donations` forward, forward `undefined` bez polja, odbijanje ne-URL `apiBaseUrl`) — 18/18 prolazi.
- `node scripts/verify.mjs --changed --workspace=mobile` čist (full verify: 417/417 suiteova, prettier/lint/type-check OK).

**Odstupanja od handoff tablice:**

1. **Dodatni šav: `app.config.ts`** (1 linija) — `extra.brand` se gradi polje-po-polje, pa `resolveBrand` forward nije dovoljan; bez `donations: brand.donations` u `app.config.ts` polje ne stiže u runtime. Tablica šavova ga nije navela.
2. **Gitignore assets iznimka**: `/brand/assets/` morao postati `/brand/assets/*` — git ne može re-include unutar isključenog direktorija; `!/brand/assets/airkuna/` inače ne radi. Ostali brandovi nemaju trackane assete, promjena je no-op za njih.
3. **`BRAND_ID=safe` bajt-identičnost**: pretty-print `expo config --type public` dobiva novu liniju `donations: undefined` (isti presedan kao `events` u E1). Serijalizirani config (`--json`) je **bajt-identičan** prije/poslije (provjereno stash-diffom) — `undefined` ključevi se ne serijaliziraju u binary.

**Placeholderi → stvarne vrijednosti:** ručni preduvjeti iz [15] §8 pokazali su se većinski riješeni (potvrđeno 2026-07-22, memorija `italk-apple-team`):

- `easProjectId: a3bfe1f6-16bd-4b0c-a171-86410842cbaf` (EAS `@airkuna/airkuna`) — stvaran, nije placeholder.
- `appleTeamId: 6SCK58757K` (ITalk) — potvrđen default.
- `owner: airkuna` (Expo org postoji), bundle/package `com.airkuna.wallet` — poklapa se s Firebase appovima.
- Firebase projekti postoje (`airkuna-wallet-development/-production`); `google-services-airkuna[-dev].json` zatečeni u `apps/mobile/` (gitignored) — bili su neformatirani i rušili prettier check pa su formatirani in-place. iOS plistovi (`GoogleService-Info-Airkuna*.plist`) nisu zatečeni.
- **Ostaje otvoreno za A4**: AASA/universal link na domovina.ai, pinka backend allowlist, iOS Firebase plistovi.

**Asseti: DA** — `rsvg-convert` iz `airkuna-web/com/coin.svg` (512×512, novčić r=150) → `brand/assets/airkuna/`: `icon.png` (1024, opaque navy podloga, novčić kropan na ~83%), `splash.png` (1024, prozirna, isti PNG za light/dark; podloge `#FFFFFF` / `#00224E`), adaptive foreground (novčić 600 px stane u 660 px safe zonu), background (puni navy), monochrome (= foreground; Android koristi samo alfa masku → silueta novčića), `favicon.png` (48). Vizualno provjereno: ikona ispravna (navy + zlatni prsten + bijela kuna).

**Kontrast (WCAG omjeri, izračunato):** light navy-na-bijelo 12.9:1, dark zlato-na-`#121312` 9.3:1, splash-dark bijela-kuna-na-`#00224E` 15.7:1 — sve AAA. `static.textBrand` `#C8912A` na bijelom = 2.8:1 — ispod AA za mali tekst, ali token se koristi kao brand akcent (isti kompromis kao stock `#12FF80` koji ima 1.5:1); nijanse nisu korigirane da se ne odstupi od brand SSOT-a.
