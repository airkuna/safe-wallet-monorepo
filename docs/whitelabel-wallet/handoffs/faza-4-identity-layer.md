# Faza 4 — Identity layer: send po usernameu

> Handoff prompt za praznu Claude Code sesiju. Repo: `/Users/ms/git/safe-global/safe-wallet-monorepo`, grana `custom`.
> Prije početka pročitaj [handoffs/README.md](README.md), [03 — Feature audit](../03-feature-audit-revolut.md) i **obavezno** [04 — Prior art](../04-prior-art-landscape.md).
> Preduvjeti: faze 2 i 3 mergeane (username se dodjeljuje pri kreiranju računa; linkovi iz faze 3 nose username).

## Kontekst

Ovo je **najveći gap i najveći ROI** cijelog MVP-a (jedini red matrice u [03] označen **GAP** za oba codebasea). U svim uspješnim neobank self-custody walletima (Daimo, Sling, Base App, Kresus, Peanut — detalji u [04]) korisnik šalje na **ljudsko ime**, nikad na hex. Univerzalno pravilo prior arta: **nikad ne pokazuj hex adresu pošiljatelju.**

Preporučeni pristup iz KB-a: **ENS offchain subnames** (Namestone ili Durin) — besplatan `ime.brand.eth` po korisniku, gasless, CCIP-Read (ERC-3668) čitljiv iz svakog ENS-aware klijenta. Brand domena (npr. `airkuna.eth`) mora biti registrirana i delegirana offchain resolveru — to je **ručni preduvjet** (zapiši u Zapisnik ako nije napravljeno; za razvoj koristi Namestone sandbox/testnet).

## Cilj

Korisnik pri kreiranju računa bira `@ime` → dobiva `ime.<brand-ens-domena>`. U Send flowu tipka `@ime` ili `ime.brand.eth` → resolva se u adresu, UI pokazuje ime + avatar, hex je skriven (dostupan tek na eksplicitni tap "show address").

## Ključne ulazne točke

- Send wizard: `apps/mobile/src/features/Send/` — polje primatelja (tu ulazi username lookup)
- Address book: `apps/mobile/src/features/AddressBook/` — postojeći per-chain CRUD kontakti; prikaz imena umjesto adrese vjerojatno već djelomično postoji (reuse obrazac)
- Create flow (faza 2): `apps/mobile/src/features/CreateSafe/` — tu se dodaje odabir usernamea
- ENS resolucija: provjeri što monorepo već ima (potraži `ens` po `packages/utils` i `apps/mobile` — web vjerojatno ima ENS lookup; mobile možda ima disabled flag). Ako postoji shared util, reuse.
- Namestone API: https://namestone.com — REST API za set/get subname (API key po domeni); Durin (https://durin.dev) je alternativa s L2 registryjem. Odluku dokumentiraj.
- Brand manifest (`apps/mobile/brand/schema.js`): dodaj `identity` polje (ENS parent domena, resolver endpoint) — per-brand konfiguracija, konzumira se kroz `useBrand()` iz faze 1.

## Zadaci

1. **Recon + regression checklist:** Send wizard recipient path (LSP `findReferences`), postojeća ENS podrška u repou, AddressBook prikaz imena. Checklist mora pokriti: send na golu adresu (mora i dalje raditi!), kontakte, QR/link put iz faze 3.
2. **Dizajn odluka (zapiši):** Namestone vs Durin vs vlastiti minimalni directory API. Kriterij MVP-a: bez vlastitog backenda ako je moguće → Namestone managed API je default. Registracija usernamea ide **kroz klijenta s API keyem preko proxyja** — API key NE smije u binary; ako proxy ne postoji, minimalni Cloudflare Worker proxy je prihvatljiv dio faze (zapiši endpoint u manifest `identity` polje).
3. **Modul `apps/mobile/src/custom/identity/`** (overlay): `resolveUsername(input, chainId)` (CCIP-Read ENS lookup — ethers `provider.resolveName` to već podržava), `registerUsername(name, address)` (proxy poziv), `reverseLookup(address)` (adresa → ime, za activity feed), s cacheiranjem u store (novi slice, nova datoteka).
4. **Create flow integracija:** korak "Odaberi svoje ime" (dostupnost provjeri debounceano; validacija: mala slova, bez razmaka; rezervirana imena lista u manifestu).
5. **Send integracija:** recipient polje prihvaća `@ime` / `ime.domena.eth` → resolve → potvrda pokazuje ime+adresu (skraćenu); spremi u AddressBook automatski nakon prvog senda (postojeći CRUD).
6. **"Nikad hex" pass:** u MVP ekranima (Send confirm, TxHistory, Share) gdje postoji ime (kontakt ili reverse lookup) pokazuj ime; hex tek na tap. Overlay/thin-seam pristup — ne prepravljaj shared komponente in-place.
7. **Testovi:** unit za resolve/register/reverse (MSW za CCIP-Read i proxy API; nikad ne mockati ethers direktno), component test za username korak, regression test da gola adresa i dalje prolazi Send.
8. **Dokumentacija:** matrica u `03-feature-audit-revolut.md` (red "Send po username": ❌ → ✅ mobile), `02-brand-config-sustav.md` (novo `identity` polje), Zapisnik s ručnim preduvjetima (ENS domena, Namestone key, proxy deploy).

## Acceptance kriteriji

- [ ] Novi račun dobiva `ime.<brand-domena>`; ime je resolvabilno standardnim ENS lookupom (provjeri i kroz javni ENS alat, ne samo naš kod).
- [ ] Send na `@ime` radi end-to-end na testnetu; send na golu 0x adresu radi nepromijenjeno.
- [ ] Nigdje u MVP flowu korisnik ne mora vidjeti hex (Send confirm pokazuje ime; hex na tap).
- [ ] API key za registraciju nije u appu ni u repou (proxy + env/secret).
- [ ] `yarn verify:changed` čist; identity modul potpuno pokriven testovima.

## Ograničenja

- Bez vlastite baze korisnika u ovoj fazi — ENS offchain subnames SU directory.
- Claim linkovi za ne-korisnike (Peanut-stil escrow) su **post-MVP** — zapiši kao sljedeći korak, ne implementiraj.
- Username je per-brand namespace; multi-chain: subname resolva istu adresu na svim mrežama (Safe adresa je per-chain — za MVP veži username na primarnu mrežu branda iz manifesta i to jasno zapiši).

## Predaja

Označi fazu 4 ✅ u `handoffs/README.md`, popuni Zapisnik, commitaj (`feat(mobile): username identity via ens offchain subnames`) i pushaj na `origin custom`.

## Zapisnik izvršenja

_(prazno — popunjava agent koji izvrši fazu)_
