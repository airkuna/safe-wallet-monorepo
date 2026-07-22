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
