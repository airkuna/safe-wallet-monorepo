# 01 — Vizija i strategija

## Cilj

Izgraditi **N custom-brandiranih self-custody community walleta** iz **jedne brand-agnostičke kodne baze**, gdje se branding kontrolira **izvana** (u budućnosti iz SaaS dashboarda + baze podataka), a codebase sadrži **isključivo funkcionalnost**. Prvi modul je "osnovni wallet kao u Revolutu": N računa + jednostavno slanje drugim korisnicima (bankarski feel).

Princip: **branding kao podatak, ne kao fork.** Umjesto N forkova s hardkodiranim brandom, jedan codebase + manifest po brandu.

## Dva track-a

Trenutno postoje dvije paralelne implementacije, s komplementarnim jakim stranama:

```mermaid
flowchart TB
  subgraph TrackA["Track A — safe-wallet-monorepo fork (OVAJ repo)"]
    A1["Službeni Safe{Wallet} kod<br/>web (Next.js) + mobile (Expo)"]
    A2["Grana: custom (airkuna fork)<br/>origin=fork, upstream=safe-global"]
    A3["Brand config faza 1 (identitet)<br/>commit f7cb87d44"]
    A1 --> A2 --> A3
  end

  subgraph TrackB["Track B — pay.domovina.ai/wallet (vlastiti)"]
    B1["Neovisan PWA, NIJE fork<br/>Vite + React + Cloudflare"]
    B2["Na Safe SDK-u: protocol-kit + safe-passkey<br/>passkey = owner Safe računa"]
    B3["N-brand runtime branding (ADR 0015)<br/>+ SEPA fiat + N accounts (ADR 0013)"]
    B1 --> B2 --> B3
  end

  Safe[("Safe smart contracts<br/>+ Safe{Core} SDK")]
  Safe --- TrackA
  Safe --- TrackB

  classDef a fill:#e8f0ff,stroke:#2e5791,color:#0b2447
  classDef b fill:#eafbea,stroke:#2f855a,color:#14331f
  class TrackA a
  class TrackB b
```

|                   | Track A — Safe fork (ovaj repo)                                                 | Track B — domovina wallet                                                    |
| ----------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Odnos prema Safeu | **Fork** GPL-3.0 monorepoa                                                      | **Neovisan**, samo npm SDK (`protocol-kit`, `safe-passkey`)                  |
| Platforma         | Web + Mobile (native)                                                           | Web / PWA (native tek predložen — ADR 0014)                                  |
| Jaka strana       | Multi-asset/multi-chain portfelj, zreo send/contacts, **GTF Safe-pays** gasless | Passkey onboarding, **N accounts instant-mint**, SEPA fiat, runtime branding |
| Onboarding        | seed / private key / Ledger (bez passkeya)                                      | **passkey** (bez seeda)                                                      |
| Brand sustav      | manifest-driven _native identitet_ (faza 1)                                     | runtime hostname → CSS varijable (ADR 0015, gotovo)                          |

> Detalji feature pokrivenosti: [03 — Feature audit](03-feature-audit-revolut.md). Detalji brand sustava: [02](02-brand-config-sustav.md).

## Strateška odluka: fork frontend ili graditi na SDK-u?

Prior art daje jasan signal (detalji u [04](04-prior-art-landscape.md)):

```mermaid
flowchart TD
  Start{"Što gradiš?"}
  Start -->|"Samo logo + tvoj chain,<br/>cijeli Safe feature-set"| Fork["Fork monorepoa<br/>(Sonic, Flow, Eternal Safe)"]
  Start -->|"Diferenciran produkt<br/>(neobank, custom UX, policy)"| SDK["Build-fresh na Safe{Core} SDK<br/>(Onchain Den, Gnosis Pay, domovina)"]
  Start -->|"Trustless / offline / bez backenda"| Eternal["Eternal Safe-stil fork<br/>(uz gubitak funkcija)"]

  Fork -->|rizik| ForkRisk["⚠️ Kontinuirani rebase teret,<br/>GPL-3.0 obveza,<br/>Mantle je NAPUSTIO svoj fork"]
  SDK -->|prednost| SDKWin["✅ Mala površina, vlastiti tempo,<br/>put kojim su išli SVI grade produkti"]

  classDef risk fill:#fdecea,stroke:#c0392b,color:#611a15
  classDef win fill:#eafbea,stroke:#2f855a,color:#14331f
  class ForkRisk,Fork risk
  class SDKWin,SDK win
```

**Zaključak:** za brzi **branded Safe mobilni app** — Track A fork je OK (i danas smo ga opremili brand configom). Za **diferencirani neobank** — prior art + tvoj vlastiti **ADR 0014** (RN/Expo klijent nad domovina jezgrom) pokazuju na **build-on-SDK** put. To je svjesna odluka koju treba donijeti, ne default.

## Dva sloja brandinga (vrijedi za oba track-a)

Ključna distinkcija koja određuje što ide u binary, a što u runtime/config:

| Sloj                 | Primjeri                                                     | Promjenjivo u runtimeu?   | Po brandu =                    |
| -------------------- | ------------------------------------------------------------ | ------------------------- | ------------------------------ |
| **Native identitet** | ime, packageName, bundleId, scheme, EAS, **Firebase (push)** | Ne — zapečeno po binaryju | zaseban binary + store listing |
| **Runtime branding** | boje, typography, in-app logo, copy, backend URL             | Da — može i OTA           | isti kod, drugi manifest       |

Bitno za očekivanja: **jedan community = jedan binary + jedan store listing.** SaaS automatizira _proizvodnju_ tih binarya iz konfiguracije, ali ih ne može spojiti u jedan app u storeu (Apple/Google to traže).

## Povezano

- [[fork-overlay-strategy]] (memory) — git topologija forka, overlay pravila
- [[domovina-wallet-and-neobank-strategy]] (memory) — sažetak istraživanja
- [02 — Brand config sustav](02-brand-config-sustav.md)
- [04 — Prior art landscape](04-prior-art-landscape.md)
