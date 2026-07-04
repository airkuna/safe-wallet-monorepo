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

_(prazno — popunjava agent koji izvrši fazu)_
