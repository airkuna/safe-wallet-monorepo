# Web preview — pokretanje mobile appa u browseru

> Datum: 2026-07-17 · Status: radi (dev preview, NIJE release target) · Jezik: HR
> Nastalo tijekom Događaji sesije (v. [docs/whitelabel-wallet/13-lekcije-sesije-dogadjaji.md](../../../docs/whitelabel-wallet/13-lekcije-sesije-dogadjaji.md)).

## Pokretanje

```bash
cd apps/mobile
WEB_PREVIEW=1 npx expo start --web --port 8085
# → http://localhost:8085
```

`BRAND_ID` dolazi iz `.env.local`; feature flagovi (npr. `features.events`) se pale u
`brand/manifests/<brand>.json` (gitignored). Do tabova treba proći onboarding — dovoljan je
read-only import bilo koje Safe adrese.

## Zašto je ovo trebalo

App nikad nije imao web target: ~10 native-only paketa (TurboModule/Nitro/codegen speci) pucaju
**pri importu** u browseru, expo default gura RN-ov `InitializeCore` u svaki bundle, a static
SSR render u Nodeu dira native bridge. Rješenje je overlay sloj u `metro.config.js` +
`metro-stubs/` + `.web.ts` platform varijante — **sve gated na `platform === 'web'` ili
`WEB_PREVIEW=1`, native buildovi netaknuti**.

```mermaid
flowchart TB
  I["import u modulu"] --> R{"metro resolveRequest<br/>(metro.config.js)"}
  R -->|"platform=web +<br/>native-only paket"| S["metro-stubs/*<br/>(no-op / @noble/hashes / RNW komponenta)"]
  R -->|"crypto (native)"| Q[react-native-quick-crypto]
  R -->|ostalo| E["expo resolver<br/>(react-native → react-native-web)"]
  P["preModules (runBeforeMainModule)"] -->|"WEB_PREVIEW=1 filter"| F["bez RN InitializeCore<br/>(native bridge setup)"]
  W["web.output"] -->|"'single' (SPA)"| N["bez SSR rendera u Nodeu"]
```

## Što je stubbano i zašto

| Paket / modul                                                                                                                                                                                                                                                        | Stub                                     | Razlog (puca pri importu na webu)         |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ----------------------------------------- |
| `react-native-capture-protection`                                                                                                                                                                                                                                    | no-op prevent/allow                      | native modul, nema web                    |
| `expo-datadog` + `@datadog/mobile-react-native`                                                                                                                                                                                                                      | no-op RUM/Logs/Provider                  | TurboModule spec (`NativeDdSdk`)          |
| `react-native-vision-camera`                                                                                                                                                                                                                                         | Camera → null, permission denied         | throwa "does not work on web"             |
| `react-native-quick-crypto`                                                                                                                                                                                                                                          | **@noble/hashes** (md5/sha/hmac/pbkdf2)  | Nitro; `createDecipheriv` namjerno throwa |
| `react-native-pager-view`                                                                                                                                                                                                                                            | React komponenta (aktivna stranica)      | Fabric native komponenta                  |
| `freerasp-react-native`                                                                                                                                                                                                                                              | `useFreeRasp` no-op                      | native RASP                               |
| `@react-native-firebase/*`, `@notifee/*`, `react-native-share`, `react-native-keychain`, `react-native-device-crypto`, `react-native-device-info`, `react-native-ble-plx`, `react-native-permissions`, `react-native-quick-base64`, `@ledgerhq/...-react-native-ble` | `anything-noop.js` univerzalni proxy     | codegen/TurboModule speci                 |
| `src/platform/crypto-shims` → `.web.ts`                                                                                                                                                                                                                              | prazan (ethers defaulti rade u browseru) | quick-crypto install                      |
| `src/platform/security` → `.web.ts`                                                                                                                                                                                                                                  | prazan config/actions                    | čita `expoConfig.android.package`         |
| `services/notifications/backgroundHandlers`                                                                                                                                                                                                                          | empty (side-effect only modul)           | Firebase pri importu iz `index.js`        |
| RN devtools interni (`ReactDevToolsSettingsManager`)                                                                                                                                                                                                                 | empty                                    | ne resolvea se za web                     |

**`anything-noop.js`** je univerzalni proxy: svaki named export postoji, sve je pozivno,
`await`/`.then(cb)` se ponašaju kao `Promise.resolve(undefined)` (then je funkcija koja
async poziva callback s `undefined`), enum usporedbe daju `false` ("nije autorizirano").

Uz stubove: `app.config.ts` `web.output: 'single'` (SPA umjesto static SSR),
`WEB_PREVIEW=1` filter RN `InitializeCore` preModula, i guard
`Appearance.setColorScheme?.()` u `safeTheme.tsx` (RNW nema tu metodu).

## Kako debugirati sljedeći native modul koji pukne

Greške tipa `__fbBatchedBridgeConfig is not set` / `getEnforcing` / "importing from
'react-native' instead of 'react-native-web'" znače da je neki modul dirnuo native bridge pri
importu. Postupak (radio 7× u sesiji):

```mermaid
flowchart LR
  E["console error<br/>(bundle line brojevi)"] --> D["curl bundle → /tmp/wb.js"]
  D --> M["awk: za svaki line broj nađi<br/>sljedeći '},id,[deps],&quot;ime-modula&quot;'"]
  M --> K{"krivac?"}
  K -->|native paket| S["dodaj u metro stub listu<br/>(ili anything-noop)"]
  K -->|app modul| W[".web.ts platform varijanta"]
  S --> R["restart: pkill + WEB_PREVIEW=1 expo start"] --> E
  W --> R
```

```bash
curl -s 'http://localhost:8085/apps/mobile/index.bundle?platform=web&dev=true&...' -o /tmp/wb.js
awk -v l=<LINE> 'NR>=l && NR<=l+900' /tmp/wb.js | grep -am1 -oE '\},[0-9]+,\[[0-9, ]*\],"[^"]+"'
```

## Ograničenja (svjesno)

- Kamera/QR skeniranje ne radi (VisionCamera stub) — skener ulaza testiraj na uređaju.
- Push notifikacije, RASP, Ledger BLE, screenshot zaštita: no-op.
- Import legacy podataka (AES decipher) throwa jasnu grešku.
- PagerView renderira jednu stranicu bez swipea.
- Ovo je **preview alat**, ne osnova za web release — za to bi trebao pravi audit RNW podrške.
