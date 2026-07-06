# Faza 1 — Runtime branding (brand config faza 2)

> Handoff prompt za praznu Claude Code sesiju. Repo: `/Users/ms/git/safe-global/safe-wallet-monorepo`, grana `custom`.
> Prije početka pročitaj [handoffs/README.md](README.md) (pravila za sve faze) i [02 — Brand config sustav](../02-brand-config-sustav.md).

## Kontekst

Ovo je airkuna fork Safe{Wallet} monorepoa (origin=airkuna fork, upstream=safe-global, radna grana `custom`). Faza 0 (commit `f7cb87d44`) je isporučila manifest-driven **native identitet**: `apps/mobile/app.config.ts` čita brand manifest kroz `resolveBrand({ isDev })` iz `apps/mobile/brand/resolveBrand.js` (CommonJS + `.d.ts`, zod schema u `brand/schema.js`; manifesti u `brand/manifests/`, tracked su `safe.json` i `example.community.json`). Precedenca: `BRAND_CONFIG_JSON` env → `brand/manifests/${BRAND_ID}.json` → default `safe`.

**Problem koji ova faza rješava** (potvrđeno auditom `docs/codebase-audit/03-mobile-white-label.md`):

1. Manifest polja `theme` (palette override) i `backend` (`cgwBaseUrl`) **postoje u schemi ali se nigdje ne konzumiraju** — `resolveBrand.js` ih ne mapira, runtime ih ne vidi.
2. `app.config.ts` i dalje **hardkodira icon/splash/adaptive-icon** na Safeove assete.
3. ~**100 hardkodiranih hex boja** u mobile komponentama zaobilazi theme sustav — brand paleta ih ne bi promijenila.

## Cilj

Buildati `BRAND_ID=<brand>` i dobiti app u brand bojama, s brand ikonom/splashom i (opcionalno) brand backendom — **bez ijedne izmjene koda**, samo manifest.

## Ključne datoteke

- `apps/mobile/brand/schema.js` + `resolveBrand.js` (+ testovi `resolveBrand.test.ts`) — proširiti mapiranje
- `apps/mobile/app.config.ts` — thin seam; assete čitati iz resolved branda
- `packages/theme/src/palettes/` + `packages/theme/src/generators/` (`generateTamaguiThemes`, `generateTamaguiTokens`) — točka za palette override
- `apps/mobile/src/theme/provider/safeTheme` (`SafeThemeProvider`, montiran u `apps/mobile/src/app/_layout.tsx`) — točka gdje runtime tema ulazi u app
- Audit hardkodiranih boja: `docs/codebase-audit/03-mobile-white-label.md`

## Zadaci

1. **Recon (obavezno prije koda):** pročitaj `apps/mobile/brand/README.md`, `schema.js`, `resolveBrand.js`, `app.config.ts`, `packages/theme/src/index.ts` i theme provider. Napiši regression checklist (format iz root `AGENTS.md`) — theme dira SVE ekrane.
2. **Prijenos manifesta u runtime:** native config (`app.config.ts`) vidi manifest u build-timeu, ali runtime kod ne. Provuci resolved brand (theme + backend + display ime/logo) u runtime kroz `expo-constants` (`extra` polje u `app.config.ts`) — to je postojeći thin seam, bez novih upstream editova. Napravi novi modul `apps/mobile/src/custom/brand/` (overlay dir — NOVE datoteke) s tipiziranim `useBrand()` / `getBrand()` accessorom.
3. **Theme injection:** u `packages/theme` dodaj čistu funkciju koja prima parcijalni palette override i vraća izvedene Tamagui teme (npr. `generateTamaguiThemes(paletteOverride?)` — provjeri postojeći potpis i budi bakcompat; `safe` manifest bez `theme` mora dati bajt-identičan rezultat). Zatim u theme provideru (thin seam u `_layout.tsx` ili unutar postojećeg providera ako je već naš) primijeni override iz `getBrand()`.
4. **Brand asseti:** u `app.config.ts` icon/splash/adaptive-icon čitaj iz resolved branda; manifest schema dobiva `assets` polje (pathovi relativni na `brand/`); default = postojeći Safe asseti (nula promjene za `safe.json`). Per-brand asseti su gitignorani kao i manifesti.
5. **Backend:** mapiraj `backend.cgwBaseUrl` iz manifesta do mjesta gdje se CGW base URL danas konfigurira (nađi env var, vjerojatno `EXPO_PUBLIC_*` — potraži u `apps/mobile/src/config/` i `packages/store`). Default = postojeći URL.
6. **Hex čišćenje (vremenski boxano):** iz audita uzmi popis hardkodiranih hex boja; zamijeni theme tokenima **samo u ekranima MVP flowa** (Onboarding/GetStarted, Assets/home, Send, Share/receive, AccountsSheet). Ostalo popiši u "Zapisnik izvršenja" kao poznati dug — NE pokušavaj svih ~100 u ovoj fazi.
7. **Testovi:** proširi `resolveBrand.test.ts` (theme/backend/assets mapiranje + precedenca + default), test za palette-override funkciju u `packages/theme` (uklj. bakcompat snapshot za `safe`), test za `useBrand()`.
8. **Ažuriraj dokumentaciju:** `apps/mobile/brand/README.md` (nova polja), `docs/whitelabel-wallet/02-brand-config-sustav.md` (faza 2 = isporučeno), `example.community.json` (primjer s theme/assets/backend).

## Acceptance kriteriji

- [ ] `BRAND_ID=example.community yarn workspace @safe-global/mobile start` → app se otvara s bojama/imenom iz manifesta (vizualno potvrdi na uređaju/simulatoru; setup u [[mobile-local-run-setup]] memoryju: `.env.local` + `google-services-dev.json`, device `ZY22G9DDR3`).
- [ ] `BRAND_ID=safe` (ili bez env) → **nula vizualnih promjena** (bakcompat).
- [ ] `packages/theme` promjene ne lome web: `yarn turbo run type-check --filter=@safe-global/web` prolazi; `yarn workspace @safe-global/web css-vars` ne mijenja `vars.css` za default paletu.
- [ ] `yarn verify:changed` čist; novi kod ima testove.
- [ ] Nijedna upstream datoteka nije editirana osim dogovorenih thin seamova (`app.config.ts`, theme provider seam); `git diff --stat upstream/dev...HEAD` pregledan.

## Ograničenja

- **Ne diraj** `packages/store/src/gateway/AUTO_GENERATED/` ni generirane tipove.
- Shared paketi (`packages/theme`) utječu i na web — svaka promjena mora biti additivna/bakcompat.
- Commit poruke: `feat(mobile): ...` / `feat(theme): ...`; docs kao `docs(whitelabel): ...`.

## Predaja

Na kraju: označi fazu 1 ✅ u `handoffs/README.md`, ispuni "Zapisnik izvršenja" ispod (što je odstupilo, što je ostalo kao dug), commitaj i pushaj na `origin custom`.

## Zapisnik izvršenja

> Izvršeno: 2026-07-06 (Claude Code sesija). `git merge upstream/dev` = already up to date.

### Što je isporučeno

- **`packages/theme`**: novi čisti util `applyPaletteOverride` (dot-path ključevi, ignore-unknown, no-mutation) + opcionalni `override` parametar na `generateTamaguiColorTokens`/`generateTamaguiThemes` (`ThemeOverride` tip). Bez overridea rezultat je byte-identičan — pokriveno testom. Web generatori (`mui.ts`, `css-vars.ts`) nisu dirani; `vars.css` nepromijenjen; web type-check prolazi.
- **`brand/`**: schema + `.d.ts` dobili `assets` polje (icon/splash/adaptiveIcon/favicon); `resolveBrand` mapira `theme`/`backend` passthrough + `assets` s defaultom na stock Safe assete (pathovi iz manifesta se razrješavaju kao `./brand/<path>`). 10 testova.
- **`app.config.ts`** (thin seam): icon/splash/adaptive-icon/favicon iz `brand.assets`; novi `extra.brand` payload (`id`/`name`/`theme`/`backend`) za runtime.
- **Novi overlay `src/custom/brand/`**: `getBrand()`/`useBrand()` tipizirani accessori nad `expo-constants` s fallbackom na stock Safe (testovi/Storybook rade bez payloada). 3 testa.
- **Runtime seamovi**: `src/theme/tokens.ts` → `generateTamaguiColorTokens(getBrand().theme)` (1 linija); `src/config/constants.ts` → `GATEWAY_URL` respektira `backend.cgwBaseUrl` (2 linije).
- **Hex čišćenje (boxano)**: `Loader` default `#12FF80` → novi theme key `$colorBrand` (= `static.textBrand`, identičan u obje palete → nula vizualne promjene); `EmptyToken`/`EmptyNFT` SVG fillovi `#121312`/`#A1A3A7` → `static.main`/`static.textSecondary` tokeni (isto mode-invarijantni). + smoke testovi.
- **Docs**: `brand/README.md` (nova polja + primjeri), `02-brand-config-sustav.md` (faza 2 isporučeno + dijagram), `example.community.json` (theme primjer), `.gitignore` (`/brand/assets/`).

### Odstupanja od plana

1. **Točka theme injectiona je generiranje tokena, ne theme provider.** Tamagui `config`/`tokens` grade se statički pri module-eval i nisu reaktivni — override u `SafeThemeProvider` ne bi imao učinka. Seam je zato u `src/theme/tokens.ts` (1 linija), što pokriva i teme u `tamagui.config.ts` (sve referenciraju `tokens.color.*`). Posljedica: brand je fiksan po binaryju; OTA rebrand bi tražio restart-gated apply.
2. **`example.community.json` nema `assets` polje** — asset pathovi pokazuju na gitignorani `brand/assets/`, pa bi manifest s njima srušio `BRAND_ID=example.community` boot na svježem checkoutu. Assets su dokumentirani u `brand/README.md`; schema/resolve/config plumbing pokriven testovima.
3. **Dodatni thin seamovi izvan dogovorenih**: `tamagui.config.ts` (+2 linije, aditivni `colorBrand` theme key), `eslint.config.mjs` (+5 linija — popravlja _pre-postojeći_ no-undef lint fail na CommonJS `brand/*.js`, vidljiv tek kad verify eksplicitno lintaa te fileove).

### Verifikacija

- `expo config` (default): asset pathovi byte-identični starim hardkodiranim; `extra.brand = {id:'safe', name}` bez theme/backend. `BRAND_ID=example.community`: puni theme/backend payload u `extra.brand`.
- `node scripts/verify.mjs --changed --workspace=mobile`: type-check/lint/prettier/testovi ✅ (282 suites / 2266 testova). `packages/theme`: type-check/lint/prettier/45 testova ✅. `yarn turbo run type-check --filter=@safe-global/web --force` ✅; `css-vars` ne mijenja `vars.css` ✅.
- Napomena: root `yarn verify:changed` bez `--workspace` krivo detektira web (default) i diffa vs zastarjeli lokalni `dev` → koristiti `--workspace=mobile`.

### Preostali dug

- **Vizualna potvrda na uređaju** (`BRAND_ID=example.community`) nije napravljena — traži per-brand Firebase fileove + native rebuild (identitet se mijenja s BRAND_ID). Plumbing je verificiran kroz `expo config` + unit testove.
- **~90 hardkodiranih hex boja izvan MVP ekrana** (audit `03-mobile-white-label.md` #3) — nije dirano. U MVP flowu preskočeni: `ShareView` (#fff/#000 QR kontrast je namjeran), `SafeSkeleton` shimmer sive (nema odgovarajući token; dodavanje novog palette polja mijenja `vars.css` → zaseban zadatak).
- **SSL pinning** pokriva samo `safe-client.*` domene — custom `cgwBaseUrl` na drugoj domeni nije pinnan (dokumentirano u README-u).
- **Placeholder EAS guard** (audit #4) — izvan opsega faze.
