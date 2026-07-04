# Whitelabel Wallet — Knowledge Base

> Datum: 2026-07-04 · Grana: `custom` (airkuna fork) · Jezik: HR
> Trajni zapis strateškog i arhitekturalnog znanja o gradnji **N brandiranih community self-custody walleta** iz jedne brand-agnostičke kodne baze.

Ova knowledge baza dokumentira **zašto** i **kako** gradimo whitelabel wallet platformu — odvojeno od [`docs/codebase-audit/`](../codebase-audit/00-pregled.md) koji pokriva **kvalitetu koda** (any, TODO, version drift, testovi, sigurnost). Ova pokriva **produkt i arhitekturu**.

## Sadržaj

| Dok                                                              | Tema                                                                                                                   |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| [01 — Vizija i strategija](01-vizija-i-strategija.md)            | Cilj (N community walleta), dva track-a (Safe fork vs domovina wallet), build-vs-fork odluka                           |
| [02 — Brand config sustav](02-brand-config-sustav.md)            | Manifest-driven brand config koji smo izgradili (faza 1, commit `f7cb87d44`); native vs runtime slojevi; SaaS pipeline |
| [03 — Feature audit (Revolut-like)](03-feature-audit-revolut.md) | Koliko je "Revolut-like" wallet već gotov (~80%), matrica sposobnosti, ključni gap = identitet primatelja              |
| [04 — Prior art landscape](04-prior-art-landscape.md)            | Tko još forka Safe, neobank self-custody wallete, P2P-send obrasci, reusable OSS                                       |

## Kontekst u jednoj slici

```mermaid
flowchart TB
  subgraph Cilj["🎯 Cilj: N brandiranih community walleta"]
    direction LR
    B1[Brand A]
    B2[Brand B]
    Bn[Brand N]
  end

  subgraph Kod["🧱 Brand-agnostička kodna baza (samo funkcionalnost)"]
    K1[Money-movement jezgra]
    K2[Gasless / Safe-pays]
    K3[Accounts model]
  end

  subgraph Config["⚙️ Vanjska konfiguracija (branding kao podatak)"]
    C1[Identitet: ime, package, bundleId, Firebase]
    C2[Vizual: boje, typography, logo]
    C3[Backend, feature flagovi]
  end

  Config -->|manifest po brandu| Kod
  Kod --> Cilj

  classDef goal fill:#e8f0ff,stroke:#2e5791,color:#0b2447
  classDef code fill:#eafbea,stroke:#2f855a,color:#14331f
  classDef cfg fill:#fff4e6,stroke:#c05621,color:#3d1e00
  class Cilj goal
  class Kod code
  class Config cfg
```

## Ključni zaključci (TL;DR)

1. **~80% "Revolut-like" walleta već postoji** — razdvojeno na dva tvoja codebasea (Safe mobile fork + `pay.domovina.ai/wallet`). Vidi [03](03-feature-audit-revolut.md).
2. **Jedini pravi gap = ljudski-čitljiv primatelj** (username/ENS/link umjesto 0x). Prior art jednoglasno kaže da je to najvažnija stvar. Vidi [04](04-prior-art-landscape.md).
3. **Nitko product-grade ne forka Safe frontend** — svi grade na Safe{Core} SDK-u. `domovina/wallet` je već na tom putu. Vidi [01](01-vizija-i-strategija.md).
4. **Brand config faza 1 je isporučena** — manifest-driven _identitet_ na mobileu. Vizual (boje/typography) i backend su faza 2. Vidi [02](02-brand-config-sustav.md).
