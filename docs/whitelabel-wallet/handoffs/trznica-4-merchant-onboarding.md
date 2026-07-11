# Tržnica 4 (M4) — merchant onboarding: novi trgovac bez diranja koda

> Handoff prompt za praznu Claude Code sesiju. Repo: `/Users/ms/git/safe-global/safe-wallet-monorepo`, grana `custom`.
> Prije početka pročitaj [handoffs/README.md](README.md) i [09 — Tržnica](../09-trznica-marketplace.md) (§3, §5).
> Preduvjet u repou: M2 mergean; M3 poželjan (onboarding tada uključuje i fiskalne podatke).

## Cilj

Novi trgovac dolazi na Tržnicu **bez commita**: katalog se seli iz `catalog/registry.ts` u
backend (M2 Worker) s adminskim unosom (obrazac ili YAML/JSON upload), app povlači i kešira
katalog (offline fallback na zadnju kopiju + bundled seed), a onboarding checklista pokriva
zakonski minimum: OIB, pravni podaci za izlog, Safe adresa (ili vođeno kreiranje Safe-a kroz
postojeći onboarding — faza 2 hosta), uvjeti dostave/povrata, predugovorne informacije (ZZP:
14 dana raskida, obrazac za raskid, od 2026. i online gumb za raskid), DAC7 podaci
(OIB, adresa, financijski identifikator).

## Kontekst

- Katalog tip-sustav već postoji (`catalog/types.ts`); ovaj handoff NE mijenja tipove nego izvor
  (config → API). `registry.ts` ostaje kao bundled seed/fallback — isti obrazac kao FF klubovi
  (registry + kasniji katalog na CDN-u).
- DAC7 (iz [09] §4): platforma se registrira kod Porezne kao operater platforme; godišnji izvještaj
  do 31.1.; izuzeće <30 prodaja i ≤2.000 € po prodavatelju. U ovoj fazi se gradi **evidencija**
  (podaci + kvartalni agregati po trgovcu), ne XML podnošenje (ručno, godišnje).
- Konsumer-zaštita copy blokovi su platformski predlošci koje trgovac popunjava — u appu se
  prikazuju na izlogu trgovca (MerchantStore "O trgovcu" sekcija se proširuje).

## Preduvjeti (ručni)

| Preduvjet                                                              | Zašto                  | Status |
| ---------------------------------------------------------------------- | ---------------------- | ------ |
| DAC7 registracija platforme kod Porezne (kad platforma pravno postoji) | operater platforme     | ⬜     |
| Odluka o kurirskim opcijama (BoxNow/HP/GLS) kao config polju           | trgovci ih već koriste | ⬜     |
| Admin autentikacija za unos kataloga (tko smije)                       | sigurnost              | ⬜     |

## Opseg

**In:** Worker: katalog CRUD + verzija/ETag; app: `catalog/remote.ts` (fetch + MMKV keš +
fallback na bundled registry, bez čekanja na mreži pri startu), proširen MerchantStore (uvjeti
povrata/dostave, predugovorne informacije), onboarding checklist dokument-generator (interni akt
predložak za M3, DAC7 evidencijska polja u merchant zapisu); testovi (offline-first ponašanje,
katalog invariant testovi se izvršavaju i nad remote payloadom).

**Out (svjesno):** self-serve merchant dashboard s analitikom (post-MVP), više-slika galerije i
varijante izvan veličine, pretraga/kategorije (dok je trgovaca < ~20), DAC7 XML automatizacija.

## Acceptance kriteriji

1. Novi (test) trgovac unesen kroz admin put vidljiv u appu bez rebuilda; nevaljan payload
   (invariant testovi kataloga) je odbijen na Workeru, ne u appu.
2. App bez mreže prikazuje zadnji keširani katalog; prvi start bez mreže prikazuje bundled seed.
3. Izlog trgovca prikazuje zakonski minimum (identitet, uvjeti, povrat 14 dana).
4. DAC7 evidencija po trgovcu (podaci + kvartalni agregati) postoji u order-booku.
5. Verify zelen; `safe`/`ff` netaknuti.

## Zapisnik izvršenja

(popunjava agent koji izvrši fazu)
