# Tržnica — ugrađeni marketplace za hrvatske MSP-ove

Host feature-pack (gated brand manifestom `features.marketplace`) koji wallet pretvara u
izlog + naplatu za male hrvatske trgovce: katalog-as-config, checkout s podacima za dostavu,
plaćanje EURe **izravno na trgovčev Safe** kroz postojeći Send flow (EIP-681 prefill, risk
provjera se ne zaobilazi), lokalna knjiga narudžbi (MMKV) + share narudžbe trgovcu.

Pilot trgovac: **Crošulja** (crosulja.hr, MARCIDEA d.o.o.) — 5 modela košulja sa šahovnicom.

| Putanja    | Sadržaj                                                             |
| ---------- | ------------------------------------------------------------------- |
| `catalog/` | Trgovac-as-data registar (tipovi, Crošulja podaci, valuta-config)   |
| `logic/`   | Narudžbena aritmetika (centi/BigInt, bez floata), referenca, poruka |
| `state/`   | Lokalne narudžbe (MMKV, izvan Redux šavova)                         |
| `screens/` | Trznica hub, MerchantStore, ProductDetail, Checkout, MojeNarudzbe   |
| `theme/`   | Per-merchant boje (točkasto, ne kroz Tamagui tokene)                |

Plan, regulatorni okvir (Fiskalizacija 2.0, DAC7, MiCA granice) i faze M2–M5:
[docs/whitelabel-wallet/09-trznica-marketplace.md](../../../../../docs/whitelabel-wallet/09-trznica-marketplace.md).

Invariant: **novac nikad ne prolazi kroz platformu** i **adrese se nikad ne izmišljaju** —
trgovac bez upisanog Safe-a ima pregledan katalog, ali onemogućeno plaćanje.
