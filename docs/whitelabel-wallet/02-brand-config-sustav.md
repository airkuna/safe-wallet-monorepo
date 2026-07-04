# 02 — Brand config sustav (faza 1: native identitet)

> Izvor istine u kodu: [`apps/mobile/brand/`](../../apps/mobile/brand/README.md) · Isporučeno: commit `f7cb87d44` (`feat(mobile): manifest-driven white-label brand config`).

## Ideja

`app.config.ts` više **ne hardkodira** Safe identitet. Umjesto toga čita **brand manifest** (JSON) u build-timeu i "zapeče" identitet u binary. Codebase ostaje brand-agnostičan; identitet je podatak.

**Zašto CommonJS `.js` a ne `.ts`:** Expo-ov config loader transpilira **samo** `app.config.ts` (single-file, nije bundler) i onda `require`-a siblinge kroz obični Node resolver, koji ne razrješava `.ts`. Zato su `brand/*.js` (+ `.d.ts` za tipove) — isti obrazac kao postojeći `expo-plugins/*.js`.

## Datoteke

```
apps/mobile/brand/
├─ schema.js / schema.d.ts        # zod manifest schema (+ tipovi) — dijeljivo s budućim dashboardom
├─ resolveBrand.js / .d.ts        # sva variant-logika (.dev suffix, iOS app-group, APNs mode)
├─ resolveBrand.test.ts           # 6 testova (safe manifest = identično starom)
├─ README.md                      # dokumentacija
└─ manifests/
   ├─ safe.json                   # default (BRAND_ID unset) = Safe identitet 1:1
   └─ example.community.json       # template za novi brand
apps/mobile/app.config.ts          # čita brand.* umjesto hardkodiranog Safea
apps/mobile/.gitignore             # per-brand manifesti + Firebase fajlovi ignorirani
```

## Kako se manifest razrješava

```mermaid
flowchart TD
  Start["app.config.ts → resolveBrand({ isDev })"]
  Start --> Q1{"BRAND_CONFIG_JSON<br/>u env-u?"}
  Q1 -->|Da| Inline["Parse inline JSON<br/>(SaaS build pipeline)"]
  Q1 -->|Ne| File["brand/manifests/${BRAND_ID}.json<br/>(BRAND_ID default = 'safe')"]
  Inline --> Validate["zod validacija<br/>(brandManifestSchema)"]
  File --> Validate
  Validate --> Compute["Variant math:<br/>• .dev suffix (dev varijanta)<br/>• appGroup = group.&lt;bundleId&gt;<br/>• apsEnvMode = dev/prod"]
  Compute --> Out["ResolvedBrand →<br/>spread u ExpoConfig<br/>(name, package, bundleId, scheme, EAS…)"]

  classDef ok fill:#eafbea,stroke:#2f855a,color:#14331f
  class Out ok
```

**Prioritet:** `BRAND_CONFIG_JSON` (inline, SaaS) → `brand/manifests/${BRAND_ID}.json` → default `safe` (nepromijenjeno ponašanje).

## Native vs runtime slojevi

| Sloj                 | Polja u manifestu                                                                    | Kad se primjenjuje      | Faza                                              |
| -------------------- | ------------------------------------------------------------------------------------ | ----------------------- | ------------------------------------------------- |
| **Native identitet** | `name`, `android.package`, `ios.bundleIdentifier`, `scheme`, `owner`, `easProjectId` | build-time, po binaryju | ✅ Faza 1 (gotovo)                                |
| **Runtime branding** | `theme` (palette override), `backend.cgwBaseUrl`                                     | runtime (moguće OTA)    | 🔜 Faza 2 (polja u schemi, još se ne konzumiraju) |

Verificirano: `safe` default daje **bit-identičan** identitet starom (dev i prod), `BRAND_ID=example.community` prebacuje cijeli identitet, `BRAND_CONFIG_JSON` nadjačava sve.

## SaaS pipeline (cilj)

```mermaid
flowchart LR
  DB[("Brand configs DB<br/>(dashboard)")] -->|"manifest JSON<br/>+ asset URL-ovi"| CI["Build job"]
  CI -->|"BRAND_CONFIG_JSON<br/>+ Firebase fajlovi<br/>+ asseti"| EAS["EAS build"]
  EAS --> Store["Per-brand .aab / .ipa<br/>+ store listing"]

  Schema["packages/brand-config<br/>(zod schema)"] -.->|"ista validacija"| DB
  Schema -.->|"ista validacija"| CI
```

Dashboard i app validiraju **istim** zod schemom. Sljedeći korak: promovirati `schema.js` u `packages/brand-config` (dijele web + mobile + dashboard).

## Faza 2 — theme injection (plan)

`packages/theme` već generira MUI (web) i Tamagui (mobile) teme iz paleta. Brand `theme.light/dark` override tokena se primijeni **prije** `generateMuiTheme` / `generateTamaguiThemes`. To je runtime sloj — može se čak dohvaćati s backenda (OTA rebrand boja bez novog binarya).

## Usporedba: kako je domovina wallet riješio branding (ADR 0015)

Track B je isti problem riješio **drugačije** i **na webu je gotov**:

|                  | Ovaj repo (Track A)                         | domovina wallet (Track B, ADR 0015)        |
| ---------------- | ------------------------------------------- | ------------------------------------------ |
| Što brenda       | **native identitet** (ime/package/bundleId) | **runtime vizual** (boje → CSS varijable)  |
| Kad              | build-time (po binaryju)                    | runtime, **jedan deployment N brendova**   |
| Rezolucija       | `BRAND_ID` / `BRAND_CONFIG_JSON`            | `window.location.hostname` → brand         |
| Gdje config živi | `brand/manifests/*.json`                    | `src/brands/<id>/brand.ts` (u repou)       |
| Tenanti          | safe, example.community (template)          | default, sportklub, zupa, **edemokracija** |

**Pouka:** kad Track A dođe do faze 2 (runtime vizual), domovina ADR 0007/0015 su gotov referentni dizajn — `applyBrandCss.ts` (CSS `--brand-*` varijable) je izravno prenosiv obrazac na web, a na mobileu ekvivalent su Tamagui token overrides.

## Povezano

- [`apps/mobile/brand/README.md`](../../apps/mobile/brand/README.md) — operativna dokumentacija (kako buildati brand)
- [01 — Vizija i strategija](01-vizija-i-strategija.md)
- [[fork-overlay-strategy]] (memory)
