# Faza 3 — Receive: QR s iznosom + payment linkovi

> Handoff prompt za praznu Claude Code sesiju. Repo: `/Users/ms/git/safe-global/safe-wallet-monorepo`, grana `custom`.
> Prije početka pročitaj [handoffs/README.md](README.md) i [03 — Feature audit](../03-feature-audit-revolut.md).
> Preduvjet: faza 1 mergeana. Neovisno o fazi 2 (može paralelno).

## Kontekst

Mobile receive flow danas pokazuje **golu adresu/QR bez iznosa** (`apps/mobile/src/features/Share/`). Revolut-feel zahtijeva: "Request 20 €" → QR ili link koji primatelj samo potvrdi. Domovina wallet (Track B) to već ima kroz **EIP-681 URI + share link** — obrazac je dokazan, treba ga donijeti u ovaj fork.

Dvije strane istog featurea:

- **Generiranje** (receive): adresa + token + iznos → EIP-681 URI u QR-u + shareable URL (`<scheme>://pay?...` iz brand manifesta + opcionalno https universal link).
- **Konzumiranje** (send): skeniranje tog QR-a / otvaranje linka → Send wizard prefillan (primatelj, token, iznos).

## Ključne ulazne točke

- `apps/mobile/src/features/Share/` — postojeći receive ekran (QR)
- `apps/mobile/src/features/Send/` — send wizard s risk-validacijom; naći ulaz koji prima prefill parametre
- Deep linking: Expo scheme dolazi iz brand manifesta (faza 0/1, `apps/mobile/brand/`); potraži postojeći linking config u `apps/mobile/src/app/_layout.tsx` / Expo Router konvencije
- QR skener: potraži postojeću skener komponentu (Send flow "send na QR" već postoji — reuse)
- EIP-681 format: `ethereum:<token_adresa>@<chainId>/transfer?address=<primatelj>&uint256=<iznos>` (za ERC-20) odnosno `ethereum:<primatelj>@<chainId>?value=<wei>` (native). Provjeri postoji li parser/generator u `packages/utils` prije pisanja novog.

## Zadaci

1. **Recon + regression checklist:** mapiranje Share i Send featurea, postojeći deep-link handling, QR skener. LSP `findReferences` na Send wizard entry — tko ga sve otvara i s kojim parametrima.
2. **`packages/utils` (ili overlay modul ako utils nije nužan): EIP-681 generate + parse** kao čiste funkcije s potpunim unit testovima (native + ERC-20, chainId, malformed input). Ako već postoji djelomična implementacija — proširi ju, ne dupliciraj (DRY).
3. **Receive UX u `Share` featureu:** dodaj "Request amount" korak — odabir tokena (default stablecoin/native po mreži) + iznos → QR postaje EIP-681 URI + gumb "Share link". Overlay pristup: nove komponente u novom diru (`apps/mobile/src/custom/` ili unutar `features/Share` kao NOVE datoteke), postojeći ekran dira minimalno.
4. **Share link:** MVP = deep link s custom schemeom iz brand manifesta (radi kad primatelj ima app). U Zapisnik zapiši post-MVP plan za https universal link + web fallback stranicu (zahtijeva hosting po brandu — SaaS teritorij).
5. **Konzumiranje:** deep-link ruta (nova datoteka u `app/`) koja parsira EIP-681/link parametre i otvara Send wizard prefillan; isti parser za QR skener u Send flowu (ako skener danas prihvaća samo golu adresu — proširi da prihvati i EIP-681 URI).
6. **Edge caseovi:** iznos u tokenu koji primatelj nema na toj mreži, nepoznati chainId, adresa != checksum — pokrij testovima; risk-validacija Send wizarda mora ostati aktivna i za prefill put (NE zaobilazi je).
7. **Dokumentacija:** ažuriraj matricu u `03-feature-audit-revolut.md` (red "Receive QR + payment link": 🟡 → ✅ za mobile).

## Acceptance kriteriji

- [ ] Receive: odaberi token + iznos → QR; skeniranje drugim uređajem (ili domovina walletom / MetaMaskom — EIP-681 je standard) prepoznaje adresu+iznos.
- [ ] Share link na uređaju s instaliranim appom otvara Send prefillan (primatelj+token+iznos), risk-validacija se i dalje izvršava.
- [ ] Postojeći "goli QR" i send-na-adresu flow rade nepromijenjeno.
- [ ] EIP-681 parser/generator 100% pokriven unit testovima uklj. malformed input.
- [ ] `yarn verify:changed` čist.

## Ograničenja

- Bez backenda u ovoj fazi (universal link fallback je post-MVP).
- `packages/utils` promjene moraju biti platform-agnostičke (koristi ih i web) — bez React Native importa.

## Predaja

Označi fazu 3 ✅ u `handoffs/README.md`, popuni Zapisnik, commitaj (`feat(mobile): eip-681 receive amounts and payment links`) i pushaj na `origin custom`.

## Zapisnik izvršenja

> Izvršeno: 2026-07-06 (Claude Code sesija). `git merge upstream/dev` prije početka: already up to date.

### Što je isporučeno

**EIP-681 core (`packages/utils/src/utils/eip681.ts`)** — nova platform-agnostička datoteka (bez RN importa; koristi samo `ethers`): `generateEip681Uri`, `parseEip681Uri`, `isEip681Uri` + tip `Eip681Transfer`. Podržano: native (`ethereum:<to>@<chainId>?value=`) i ERC-20 (`ethereum:<token>@<chainId>/transfer?address=&uint256=`), `pay-` prefiks, case-insensitive shema, znanstvena notacija iznosa (`2.014e18`), checksumiranje adresa. Parser nikad ne baca; generator baca na programerske greške (kriva adresa/chainId/ne-cjelobrojni value). 38 unit testova uklj. malformed input. Nije postojala nikakva djelomična implementacija (potvrđeno recon-om: jedini `ethereum:` string u repou bio je Storybook fixture).

**Generiranje (Receive):**

- Novi ekran `/request-amount` (modal) → `features/Share/components/RequestAmount/` (container + view + `useRequestAmount` hook, sve NOVE datoteke). Iznos + odabir tokena (chipovi) → živi EIP-681 QR + gumbi "Share link"/"Copy link".
- Native token dolazi iz chain configa (`selectChainById`), **ne** iz CGW balances — ekran radi i za counterfactual račun (CGW 404). ERC-20 opcije se dodaju iz `useTokenBalances` kad postoje.
- Payment link: `apps/mobile/src/custom/paymentLinks/buildPaymentLink.ts` (overlay dir) → `<scheme>://pay?uri=<enc(EIP-681)>`. Scheme se čita runtime iz `Constants.expoConfig.scheme` (bake-a se iz brand manifesta u fazi 0/1); preferira se ne-`wc` scheme jer `wc` presreću svi walleti. Stock `safe` manifest registrira samo `wc` → za stock build link je `wc://pay?...` (radi, ali dvosmisleno); brand manifesti s vlastitim schemeom (npr. `domovina`) dobivaju ispravan link bez ikakve promjene koda.
- Seam u `ShareView.tsx`: samo novi gumb "Request amount" (postojeći goli QR/Copy/Share nepromijenjeni).

**Konzumiranje (Send):**

- `resolveScannedAddress` (jedina ulazna točka SVA TRI skenera) sada prepoznaje i EIP-681 URI → `{ address, paymentRequest }`; postojeće grane (gola/`eth:` prefiksana adresa) netaknute.
- `useScannedAddressToSend` prošireno: `sendScannedToRecipient` (zajednički entry za oba send-skenera) i `sendPaymentRequestToRecipient`. **Risk-validacija ostaje aktivna**: payment request UVIJEK slijeće na recipient ekran (isti put kao ručni unos — suspicious/self-send/cross-chain provjere se izvršavaju), a token+iznos putuju kao `prefillTokenAddress`/`prefillValueRaw` parametri.
- Deep-link ruta `app/pay.tsx` → `features/Send/PayRequestRedirect.tsx`: parsira `uri` param, nevaljano → toast "Invalid payment link" + home; bez aktivnog safea → home. `+native-intent.tsx` nije trebalo dirati (`pay` nije protected ruta).
- Prefill lanac: recipient (forwarda parametre) → token (`useAutoSelectPrefillToken`: auto-odabir ako korisnik drži token, jednom po mountu — back ne bounca; toast ako ga nema) → amount (`usePrefillAmount`: raw base-units → human preko decimals, jednokratno, korisnik može editirati). Iznos se NE prenosi ako korisnik odabere drugi token (krive decimale bi lagale).

### Edge caseovi (pokriveni testovima)

- chainId iz requesta ≠ aktivni chain → toast upozorenje + prefill SAMO adrese (token adrese su chain-specifične).
- Traženi token bez balansa → toast, korisnik bira ručno.
- Lowercase adrese → checksum; `wc:`/URL/junk QR-ovi → postojeće error grane.
- Counterfactual receive → native fallback (vidi gore).

### Odluke i odstupanja od plana

1. **Prefill kroz router parametre, ne kroz store** — eksplicitnije, expo-router idiomatski, nema skrivenog transient statea. Cijena: mali edit u 3 upstream Send containera (spread `prefillParams`) — svjesno odstupanje od čistog overlaya, u duhu "thin seams".
2. **Native sentinel = zero address** (ista konvencija kao `isNativeToken` u Send servisu), pa postojeći `findToken` obrasci rade bez izmjena.
3. **WalletConnect header skener također prima payment requeste** (besplatno, jer ide kroz isti `sendScannedToRecipient`).
4. **Bez ENS targeta u parseru** (MVP; faza 4 ionako uvodi username sloj).
5. Deep link koristi format `?uri=<cijeli EIP-681>` umjesto raspakiranih parametara — jedan parser za QR i link (DRY).

### Post-MVP dug (namjerno odgođeno)

- **Https universal link + web fallback stranica**: zahtijeva per-brand hosting (apple-app-site-association + assetlinks.json + landing stranica koja fallbacka na store). Predloženi format: `https://<brand-domena>/pay?uri=...` s istim `uri` paramom → ista `pay` ruta. SaaS teritorij, ide uz fazu 5+.
- Fiat unos na request ekranu (Send ima `useFiatConversion`; receive MVP je token-only).
- `wc://pay` dvosmislenost za stock brand: riješiti dodavanjem drugog schemea u `safe.json` manifest ako ikad zatreba.
- Verify napomena: 2 nepovezana flaky testa pod punim opterećenjem suite-a (`PendingTx.container.test`, `DelegateCleanupService.test`) — oba prolaze izolirano i drugi puni run je bio 347/347 zelen; nisu dirani ovom fazom.

### Ručna provjera (nije izvršeno u sesiji — nema uređaja)

Acceptance kriteriji 1–2 (sken drugim uređajem/MetaMaskom, otvaranje linka na uređaju s appom) zahtijevaju fizički uređaj; sve ostalo pokriveno unit testovima + `node scripts/verify.mjs --changed --workspace=mobile` čist (type-check, lint, prettier, testovi).
