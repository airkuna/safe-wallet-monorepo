# 14 — Dnevnik sinkronizacije s upstreamom (safe-global)

Ovaj dokument je **dnevnik** (append-only): svaki put kad povučemo `upstream/dev`
(https://github.com/safe-global/safe-wallet-monorepo) ovdje dopisujemo datirani zapis —
što je community doradio, kako je prošao merge s našim `custom` overlayem i snapshot
strateškog stanja upstreama relevantnog za nas.

Postupak sinkronizacije: `git fetch upstream dev && git merge upstream/dev` na branchu
`custom`, riješiti konflikte (tipično `apps/mobile/app.config.ts` — zadržati brand overlay
polja, preuzeti upstream verziju), zatim `yarn install`, type-check + testovi za
mobile/utils/store, pa push na `origin/custom`.

---

## 2026-07-22 — merge `ad7dda18d` (41 upstream commit, 16.7.–22.7.)

### Merge

- Konflikt samo u `apps/mobile/app.config.ts`: upstream digao mobile verziju **1.0.14 → 1.0.15**;
  zadržana naša `brand.slug` / `brand.owner` polja uz novu verziju.
- Verifikacija: type-check (mobile, utils, store) + testovi (utils) — sve zeleno.

### Što je upstream doradio

Od 41 commita, 22 su dependabot bumpovi. Suštinske promjene, gotovo sve **web-only**:

- **feat(web): unificirana navigacija Workspaces + Trusted accounts** (WA-2811, #8271) —
  welcome/root ima tabove Workspaces i Trusted accounts, lazy-load safeova po workspaceu,
  novi hookovi (`useWorkspacesView`, `useSafeSpaces`, `useLocalAccountsView`).
- Perf za velike liste računa: lazy-load balansa u accounts tablici (#8314), instant
  manage-account-list modal (#8324), filtriranje trusted safeova po mreži (#8323).
- Fix: "awaiting confirmation" samo stvarnim ownerima (WA-2889, #8322); threshold aktivnog
  chaina u multi-chain selectoru (#8334); reconnect signing walleta preko EIP-6963 (#8307).
- Workspace admini mogu uređivati ime workspacea (#8229); staking banner → nativni SAFE
  staking app (#8301).
- **Mobile: samo version bump 1.0.15** + shared fix `formatNumber` (puna preciznost
  iznosa, WA-1990, #8315) koji dira obje platforme.
- Web releasi 1.93.1 i 1.94.0; CI: Linear Releases integracija (#8291).

### Snapshot: strategija Safe{Mobile} vs. web paritet (istraženo danas, gh + web)

**Zaključak: ograničeni mobile scope je bila namjerna "signer-first MVP" odluka, ali
privremena — paritet se aktivno zatvara.** Dokazi:

- **Issue #6134** ("Add ability to create accounts on Android"): Safe maintainer —
  _"The first version of the app will be an MVP that is very much focussed on a seamless
  signing experience"_; zatvoren s _"Closing because this will be in the new mobile app
  roadmap."_ → kreiranje Safea na mobileu je poznata, roadmapirana rupa.
- Stari nativni appovi ([safe-ios](https://github.com/safe-global/safe-ios),
  [safe-android](https://github.com/safe-global/safe-android)) su arhivirani; stari iOS app
  je **podržavao kreiranje Safea** — novi RN app je svjesno resetirao scope radi jednog
  codebasea i bržeg shippinga. Nema dokaza da je razlog veličina ekrana/regulativa.
- Launch blog: ["Secure Signing, Now Seamlessly Mobile"](https://safe.global/blog/introducing-the-all-new-safe-wallet-mobile-app) — "secure signing companion".
- **Mobile već može pokretati transakcije upstream**: send/transfer flow **PR #7255**
  (merged 3.3.2026, iza `SEND_TRANSFERS` chain-config flaga), izvršavanje + relayed
  execution **PR #8156** (lipanj 2026).
- **Aktivno u razvoju** (lipanj–srpanj 2026): WalletConnect smjer — WalletKit (#7999),
  QR scanner (#8006), session sheets (#8033), `eth_sendTransaction`/`wallet_sendCalls`
  (#8092), RPC proxy + EIP-5792 (#8194), dApp management (#8058), deep linking (#8241),
  approve view (#8249); nonce editor (#8297). Otvoren issue **#8243**: Safe Messages
  queue + signing — "keep parity with Safe web where possible".
- **Preostale rupe upstream**: kreiranje/deploy Safea (nula PR-ova), owner/settings
  management, Safe Apps, swaps/staking, Safe Messages. Naš fork s vlastitim `CreateSafe`
  featureom je **ispred upstreama** na toj osi — pratiti hoće li upstream to shipati
  (rizik buduće merge kolizije).
- Roadmap je **interni u Linearu** (`WA-xxxx` ticketi); GitHub Discussions isključeni,
  javnog roadmap dokumenta nema.

### Implikacije za nas

1. Smjer upstreama (signer → tx pokretanje → dApp konekcije → kreiranje Safea) poklapa se
   s našom whitelabel strategijom — nastaviti povremeni `git pull` s upstreama.
2. `CreateSafe` (naš overlay) je kandidat za najveću buduću koliziju — kad upstream shipa
   svoje kreiranje Safea, odlučiti: migrirati na njihovo ili zadržati naše.
3. `SEND_TRANSFERS` chain-config flag: provjeriti da je uključen za naše chainove.

---

## 2026-09-11 — merge `aa90a2f5f` (278 upstream commita, 22.7.–11.9.)

### Merge

- Konflikt samo u root `package.json` → `resolutions`: obje strane dodale nove pinove.
  Zadržana **oba** skupa (naš `expo-updates-interface` + upstream
  `axios`/`protobufjs`/`brace-expansion`/`postcss`).
- `apps/mobile/app.config.ts` ovaj put **bez konflikta** — upstream nije dizao mobile
  verziju (i dalje 1.0.15).
- Verifikacija: `yarn install` ✅, type-check (mobile, utils, store) ✅,
  testovi mobile/store/utils ✅ uz jedan flaky timeout
  (`packages/utils/.../useGuardCheck.test.ts` padne pod punim paralelnim loadom,
  prolazi izolirano — upstream test, nije posljedica merge-a).

### Što je upstream doradio

278 commita, od toga 61 dependabot. Težište je i dalje **web** — mobile je u ovih 7
tjedana dobio **nula novih featurea**, samo E2E testove i shared fixeve.

**1. shadcn/ui + Tailwind migracija (#8040) — najveća strukturna promjena dosad.**
`apps/web` više **nema MUI ni Emotion**; `vars.css` je zamijenjen `shadcn.css`-om,
a web čita theme kao CSS varijable (ne više JS MUI theme objekt). Za `packages/theme`
posljedica je da je MUI generator efektivno mrtav za web; Tamagui put (naš) netaknut.
Iza migracije je došlo ~25 `fix(UI)` commita — migracija je ostavila dosta repova.

**2. `apps/web-tanstack` — novi workspace (#7994).** Drugi runtime istog koda:
TanStack Router + Vite, reusa `apps/web/src` preko Vite aliasa, s `src/compat/` shimovima
za `next/*`. Nije fork — priprema za izlazak iz Next.js-a.

**3. Safe Pro monetizacija — Workspaces prelaze na plaćeni plan 6.10.2026.**
Nova `safe-pro-announcement` feature (banneri, modal, Plans ruta) iza `SAFE_PRO` flaga,
plus dva **nova CGW API modula** u `packages/store/src/gateway/AUTO_GENERATED/`:
`billing.ts` (subscriptions, plans, Stripe checkout/payment links, upgrade/downgrade)
i `entitlements.ts` (metered/binary/value entitlements, prva feature key: `safe_seats`).
Dakle: Safe naplaćuje Workspaces po sjedalu.

**4. Safenet checks — nov podsustav (19 commita).**
`packages/utils/src/features/safenet-checks/` + `packages/store/src/safenet/`:
čitanje lifecycle logova Safenet check-ova s Gnosis Chaina, dekodiranje eventa,
**FROST** verifikacija atestacija protiv coordinator group keya, EIP-712 preimages,
polling hook, prikaz u queue redu i Safe Shield sekciji. Sve iza `NEXT_PUBLIC_SAFENET_*`
/ `EXPO_PUBLIC_SAFENET_*` varijabli (shared web+mobile konstante, default Gnosis).

**5. Relaying je na webu ISKLJUČEN (#8467).** `IS_RELAYING_LIVE = false` u
`apps/web/src/features/gtf/constants/index.ts` — "Safe pays" UI se skriva i nove potpise
pinaju na signer-pays. Nije obrisano, flag vraća staro ponašanje. Paralelno:
**relayer je prebačen s Gelata na Rhinestone** (#8338) — `RelayTxWatcher` i CGW relay
schema više ne spominju Gelato, `isGtfSafePaid` prilagođen.

**6. Policies (Spaces).** Nova ruta + sidebar stavka, katalog s 4 pločice:
Spending limit, Proposer, Account recovery, "Something missing?" (feedback). Zasad
empty-state katalog — okvir za buduće account-level politike.

**7. Sigurnost / robusnost:**
- **Address poisoning Mode B** (WA-2823): detekcija look-alike Safeova kroz sve liste računa.
- `setGuard` target se validira protiv guard interfacea (ERC-165) prije slanja (#8364).
- Nepodržani Zodiac mastercopyji se flagaju kao kritični, s deep-linkom na uklanjanje.
- Safe **1.5.0** priznat kao trusted verzija + podržan u multichain kreaciji i add-network.
- zkSync flavour-aware upgrades/dekodiranje/predviđanje adrese (#8380).
- Step-up auth / switch authenticator: OIDC `enroll` i `elevate` parametri + lista
  MFA autentikatora u `auth.ts`; 2FA awareness kartica u Spaces sidebaru.
- Nova error taksonomija u `packages/utils/src/services/exceptions/`
  (`contractErrors`, `gatewayErrors`, `normalizeError`) — GS013 i on-chain revert poruke
  se dekodiraju i prikazuju čitljivo umjesto generičkog reverta.
- `proposers`: imena proposera ostaju na uređaju, ne šalju se backendu.

**8. Testiranje / CI:** Playwright je **wired u CI** (#8558) uz novi
`.github/actions/playwright`; Cypress ostaje samo za održavanje. Mobile je dobio Maestro
flowove za WalletConnect dApp management, tx-send (happy/batch/reject/readonly/CGW failure)
i nonce/approval draft editore. Dodan CODEOWNERS, knip na razini monorepa,
`.agents/skills/` (skills preseljeni iz `.claude/`), CLAUDE.md pointeri uz svaki AGENTS.md.

**9. Releasi:** web 1.94 → **1.99.2** (1.96.x, 1.97, 1.98, 1.99.x), tx-builder 2.1.0.

### Implikacije za nas

1. **Mobile stagnacija ide nam u korist**: upstream 7 tjedana nije dirao mobile feature
   set, pa naš `CreateSafe` overlay i dalje nema konkurenciju uzvodno. Rizik kolizije
   odgođen, ne uklonjen.
2. **Relay**: upstream je ugasio "Safe pays" na webu i promijenio relayera. Naš `zerofee`
   pack i donations flow oslanjaju se na relay-paid transakcije — provjeriti radi li
   Rhinestone relay na našim chainovima prije nego ga obećamo korisniku.
   Vidi i postojeću bilješku: SEND_FLOW isključen na prod CGW Gnosis.
3. **Safe Pro (6.10.)**: Workspaces postaju plaćeni. Nas se izravno ne tiče (ne koristimo
   Spaces), ali potvrđuje smjer — Safe monetizira B2B sloj, a ne wallet. Dobra vijest za
   whitelabel: wallet sloj ostaje besplatan temelj.
4. **shadcn migracija**: ako ikad radimo web tier (`faza-9-web-tier`), plan se mijenja —
   ciljati shadcn/Tailwind, ne MUI. Stari `vars.css` recepti u našim docovima su mrtvi.
5. **Safenet** je zanimljiv kao sigurnosni signal, ali je vezan uz Safe infrastrukturu
   (Gnosis coordinator) — za naše brandove zasad nije primjenjiv.
