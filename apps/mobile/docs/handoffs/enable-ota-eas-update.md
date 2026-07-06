# Handoff — enable OTA (EAS Update) for the Domovina mobile app

> **STATUS: EXECUTED 2026-07-06 — with one deviation.** The app side is fully wired (module,
> per-brand config, fingerprint runtimeVersion, channels, code signing). Deviation: EAS gates
> update code signing behind a paid plan, so hosted EAS Update was dropped in favour of a
> **self-hosted server** at `ota.domovina.ai` (standalone repo `~/git/domovinatv/domovina-ota`,
> see its `HANDOFF.md`). Current live state is documented in the OTA section of
> `apps/mobile/docs/domovina-build-and-flavors.md` — read that, not this file.

Self-contained task brief for a **fresh Claude Code session**. Everything needed is here or in
the linked docs; do not assume prior chat context.

## Goal

Wire **over-the-air JS/asset updates** (`expo-updates` + **EAS Update**) into the Domovina mobile
app so a single native binary shipped to the App Store / Play Store can receive UI/logic/bug-fix
updates without a new store submission — **with update code signing enabled** (this is a
crypto wallet; unsigned OTA is unacceptable).

## Read first (required)

1. `apps/mobile/docs/domovina-build-and-flavors.md` — brand, flavors, build modes, and the full
   **"Over-the-air (OTA) updates — EAS Update"** section (model, what can/can't be OTA,
   runtimeVersion, channels, security). This handoff implements that section.
2. Root `AGENTS.md` and `apps/mobile/AGENTS.md` — conventions (CNG, tests, semantic commits,
   never edit generated `ios/`).

## Current state (verified 2026-07-06)

- Brand `domovina` (`BRAND_ID=domovina`, `brand/manifests/domovina.json`). Two flavors:
  - dev → bundle `ai.domovina.wallet.dev`, Firebase `domovina-wallet-development`
  - prod → bundle `ai.domovina.wallet`, Firebase `domovina-wallet-production`
- Apple team **ITalk d.o.o. `6SCK58757K`**. Both flavors build & run on device.
- **`expo-updates` is NOT installed** (only `expo-dev-client`); generated `ios` `Expo.plist` has
  `EXUpdatesEnabled = false`. No `updates`/`runtimeVersion` key in `app.config.ts`.
- `eas.json` has build profiles `development` / `preview` / `production` (each sets `environment`
  - `env.APP_VARIANT`) but **no `channel` keys** and no update config. NB: `eas.json` `submit`
    block still holds **Safe's** ascAppIds / android applicationId — that's a separate cleanup, out
    of scope here, but flag it.
- `.env.local`, `GoogleService-Info*.plist` are **gitignored** (secrets). `ios/` is CNG/gitignored.

## Prerequisites (ask the user to do / confirm before building)

- `eas login` with the account that owns the EAS project, and confirm the EAS **project id**
  (`brand/manifests/domovina.json` currently has `easProjectId: c6767ce3-…`; verify it's correct
  and owned by the intended account — `eas project:info`).
- Decide branch/channel naming (recommended: channel == profile name → `development`, `preview`,
  `production`; branches mirror them).
- Confirm whether OTA should target **both** iOS and Android (default: yes).

## Tasks (ordered)

1. **Install the module** (changes native → will require a fresh prebuild + new binary):
   ```bash
   cd apps/mobile
   npx expo install expo-updates
   ```
2. **Configure in `app.config.ts`** (source of truth — never hand-edit `ios/`):
   - `runtimeVersion: { policy: 'fingerprint' }` (auto-tracks native changes so OTA only reaches
     compatible binaries).
   - `updates: { url: 'https://u.expo.dev/<EAS_PROJECT_ID>', enabled: true }`.
   - Sensible `updates.checkAutomatically` (`ON_LOAD`) and `updates.fallbackToCacheTimeout` (e.g.
     `0` so launch never blocks on the network; update applies next launch).
   - Keep per-flavor concerns via the existing `IS_DEV` branch if any differ.
3. **`eas update:configure`** to provision the update endpoint, then add a **`channel`** to each
   `eas.json` build profile (`development`/`preview`/`production`).
4. **Enable update code signing (mandatory for a wallet):**
   - Generate a code-signing key pair and configure `expo-updates` code signing so the app only
     accepts updates signed with the private key (`npx expo-updates codesigning:generate` +
     `configure`, per Expo docs). Store the private key as a secret; **never commit it**. Document
     where it lives.
5. **Regenerate native + rebuild** a `development` (or `preview`) build that now contains
   `expo-updates` (CNG: `expo prebuild --clean` then build; first flavor build may need the Xcode
   signing pass — see the build doc's signing section).
6. **Publish & verify** an update round-trip:
   ```bash
   eas update --branch development --message "OTA smoke test"
   ```
   Launch the installed build, confirm it fetches the update (check `expo-updates` logs /
   `Updates.checkForUpdateAsync`), and that a signed update is accepted while a tampered/unsigned
   one is rejected.
7. **Update the docs**: flip the "Current state" note in
   `apps/mobile/docs/domovina-build-and-flavors.md` OTA section to "wired", and record the actual
   `runtimeVersion` policy, channel names, update URL, and where the code-signing key lives.
8. **Tests / verify**: add/adjust any unit coverage for update-gating logic if code is added; run
   `yarn verify:changed` (mobile). Do not commit without a clean pass and without asking the user.

## Constraints & gotchas

- **CNG**: adding `expo-updates` is a native change. The binary that first ships to the stores
  **must already contain `expo-updates`** — OTA cannot be retro-added to an already-published
  build. Communicate this.
- Only JS/assets compatible with the installed `runtimeVersion` are OTA-updatable; native changes
  still need a new build + store submission (see the "what can/cannot be OTA" table in the doc).
- Secrets stay gitignored; the code-signing **private key must never be committed**.
- Use semantic commits (`feat:`/`chore:`); this touches build/config so prefer `chore(mobile):`
  for wiring and `feat(mobile):` only if runtime behavior is added.
- Ask before any `git commit`/push, before creating EAS resources that cost money, and before
  changing account-level settings.

## Definition of done

`expo-updates` installed and code-signed; `app.config.ts` has `runtimeVersion` + `updates.url`;
each `eas.json` profile has a `channel`; a signed update published to a test channel is fetched by
an installed build and applied on next launch; unsigned/tampered updates are rejected; the OTA
section of `domovina-build-and-flavors.md` updated to reflect the live setup.
