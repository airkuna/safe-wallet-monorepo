# 08 — KUNAPay: generički consumer wallet (KEKS/Aircash UX na Safe + EURe tračnici)

> Datum: 2026-07-11 · Status: **plan** (handoff promptovi spremni, v. §5) · Jezik: HR
> Odluka konteksta: v. [01-vizija-i-strategija](01-vizija-i-strategija.md),
> [03-feature-audit-revolut](03-feature-audit-revolut.md), KATALOG-NOVCANIKA.md
> (`domovinatv/novcanik-template`) i FF Wallet presedan (`apps/mobile/src/custom/ff/docs/PLAN.md`).

## 1. Teza

Opći consumer wallet ("kao KEKS Pay / Aircash, ali self-custody") **nije novi proizvod nego
default brand postojećeg sustava**: jedan brand manifest na native tracku + tri host
funkcionalnosti koje ionako trebaju svim brandiranim walletima (FF, dbhz, …). Prema krajnjem
korisniku izgleda kao centralizirana platna aplikacija (bez seed fraze, bez gasa, IBAN uplata,
instant P2P); ispod je Safe smart account + Monerium EURe (EMI licencu nosi Monerium — mi smo
frontend prema blockchainu).

## 2. Brand arhitektura (preporuka — konačno imenovanje je ručna odluka vlasnika)

- **KUNAPay** = consumer aplikacija (radni brand id `kunapay`).
- **airKUNA** = tračnica/token/DAO (airkuna.org) i ime partnerskog pitcha Aircashu.
- Razlog razdvajanja: airKUNA se Aircashu _nudi_ kao tračnica — aplikacija istog imena
  bila bi im konkurencija u istom razgovoru. KUNAPay na airKUNA tračnici = čista priča.
- Valuta danas = EURe; prelazak na KUNA token = config (isti valuta-as-config invariant kao
  FF `clubs/currency.ts` — nijedan ekran ne hardkodira simbol/adresu/decimale).

## 3. Paritet s KEKS/Aircash — što postoji, što fali

| Funkcija                           | Stanje    | Gdje                                                                                        |
| ---------------------------------- | --------- | ------------------------------------------------------------------------------------------- |
| Instant P2P bez naknade            | ✅        | EURe transfer; gas: CGW relay / GTF Safe-pays                                               |
| QR plaćanje / zahtjev za novac     | ✅        | EIP-681 + payment linkovi (faza 3 + hardening)                                              |
| Onboarding bez seed fraze          | ✅        | keystore + biometrija; kreiranje + aktivacija Safe-a (faza 2 + hardening)                   |
| P2P na kontakt / @username         | ❌        | **[faza-4-identity-layer](handoffs/faza-4-identity-layer.md)** — najveći gap, već planirano |
| Uplata s banke (SEPA → EURe)       | ❌ native | **kunapay-2** (Track B to već ima — Monerium intents preko `mpt.domovina.ai`)               |
| Isplata na banku (EURe → SEPA)     | ❌        | **kunapay-3** (Monerium redemption)                                                         |
| Slanje ne-korisniku (viral petlja) | ❌        | **kunapay-4** (claim linkovi, Peanut-style prior art)                                       |
| Store release per brand            | ⬜        | [faza-5-release-pipeline](handoffs/faza-5-release-pipeline.md)                              |
| Cash in/out na kioscima            | —         | **ne gradi se — Aircash partnerstvo** (airKUNA pitch; oni donose mrežu/IBAN/licencu)        |

## 4. Regulatorni okvir (sažetak, ne pravni savjet)

Self-custody frontend + Monerium kao EMI = mi ne držimo tuđi novac ni e-novac. Paziti na
granice: bez custody-like featurea, bez mjenjačnice (swap), bez vlastitog escrowa s diskrecijom —
svaka takva funkcionalnost mora proći provjeru MiCA/CASP obveza prije nego što uđe u plan
(claim linkovi u kunapay-4 imaju eksplicitan korak analize upravo zbog toga).

## 5. Faze i handoff promptovi

Redoslijed maksimizira zajednički ROI: identity prije svega (množi se preko svih brandova),
fiat rampe zatim (čine wallet upotrebljivim normalnom korisniku), claim linkovi zadnji
(rast, ovisi o identityju za dobar UX).

| #   | Faza                                            | Handoff                                                                         | Ovisi o                          |
| --- | ----------------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------- |
| K1  | Brand manifest + identitet `kunapay`            | [kunapay-1-brand.md](handoffs/kunapay-1-brand.md)                               | —                                |
| K2  | Identity layer (@username)                      | **postojeća** [faza-4-identity-layer.md](handoffs/faza-4-identity-layer.md)     | ručni preduvjeti (ENS/Namestone) |
| K3  | Fiat on-ramp (SEPA uplata → EURe u native appu) | [kunapay-2-fiat-onramp.md](handoffs/kunapay-2-fiat-onramp.md)                   | K1                               |
| K4  | Fiat off-ramp (EURe → SEPA isplata)             | [kunapay-3-offramp.md](handoffs/kunapay-3-offramp.md)                           | K3                               |
| K5  | Claim linkovi (pošalji ne-korisniku)            | [kunapay-4-claim-links.md](handoffs/kunapay-4-claim-links.md)                   | K2 (UX), analiza rizika          |
| K6  | Store release za `kunapay`                      | **postojeća** [faza-5-release-pipeline.md](handoffs/faza-5-release-pipeline.md) | K1, host faza 5                  |

**Nulti inkrement:** K1 je manifest + copy + asseti — izvršiv odmah, u jednoj sesiji.
**Web tier:** KUNAPay web = default brand Track B-a (`pay.domovina.ai/wallet`) — izvan opsega
ovog plana (tamo već postoji; eventualno preimenovanje je marketinška odluka).

## 6. Odnos s FF-om i lozom

FF Wallet je dokazao obrazac (brand manifest + feature-pack + handoff faze). KUNAPay je
komplementaran: FF i community walleti su **distribucijske niše** (zajednica po zajednica),
KUNAPay je **horizontalna površina** iste tračnice. Sve tri rupe koje KUNAPay zatvara
(identity, fiat rampe, claim linkovi) automatski vrijede i za FF i svaki budući brand —
zato žive kao host funkcionalnosti (gated per-brand kroz manifest `features`), ne kao
KUNAPay-specifičan kod.
