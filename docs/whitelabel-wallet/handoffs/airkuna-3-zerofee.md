# airKUNA 3 (A3) — zero-fee slanje ("Bez naknade" UX + relay odluka)

> Handoff prompt za praznu Claude Code sesiju. Repo: `/Users/ms/git/safe-global/safe-wallet-monorepo`, grana `custom`.
> Prije početka pročitaj [handoffs/README.md](README.md) i **obavezno** [15 — airKUNA wallet](../15-airkuna-wallet.md) §6 (zero-fee strategija) — opcija A vs B odluka se donosi **u ovoj fazi**, na temelju nalaza iz koraka 1.

## Cilj

Slanje (uključivo donacije) na airkuna buildu je za korisnika besplatno gdje god je to moguće:
kad je relay dostupan, on je **default** put izvršenja s jasnim "Bez naknade" indikatorom; kad
nije, korisnik dobiva pošten copy da signer plaća gas. Nikakav marketing "0%" se ne tvrdi u UI-ju
kad put nije aktivan.

## Kontekst i izvori

- **Relayed execution već postoji u forku** (upstream PR #8156, v. [14 — Upstream dnevnik](../14-upstream-sync-dnevnik.md)) — A3 ga NE implementira, samo ga čini defaultom i vidljivim:
  - `src/services/tx-execution/relayExecutor.ts` — `executeRelayTx` (CGW relay mutation);
  - `src/features/ExecuteTx/hooks/useRequiresRelay.ts` — **jedini izvor istine za relay gating**: `isRelayEnabled = hasFeature(chain, FEATURES.RELAYING)`, kvota preko `useRelayGetRelaysRemainingV1Query`;
  - `src/features/ExecuteTx/components/ReviewAndExecute/helpers.ts` — `getExecutionMethod` (prioriteti relay/ledger/WC/PK);
  - `src/features/HowToExecuteSheet/` — postojeći UI za odabir puta (`RelayAvailable`/`RelayUnavailable` komponente);
  - relayed **aktivacija** Safea: `src/features/CreateSafe/hooks/useActivateSafe.ts` (hardening faza).
- [15 — airKUNA wallet](../15-airkuna-wallet.md) §6: opcija A = CGW relay (`RELAYING` na Gnosisu), opcija B = vlastiti relayer `pay.domovina.ai /api/relay` (5 tx/dan/signer, Turnstile, POST potpisanog SafeTx-a). Marketing granice (mpt.hr): "nije licencirana platna usluga", Monerium = regulirani sloj.
- Chain config provjera: CGW `/v1/chains/100` (`features` array) na gatewayu koji airkuna manifest koristi (`backend.cgwBaseUrl` ili Safe default) — v. i [14] Implikacije §3 (`SEND_TRANSFERS` provjera, isti postupak).
- Donations gate (za brand-uvjetovano ponašanje ako se odluči tako): `src/custom/donations/isDonationsBrand.ts` (A2).

## Preduvjeti

**Ručni:** nikakvi za opciju A. Za opciju B: potvrda vlasnika da relayer `pay.domovina.ai /api/relay` prima SafeTx s ove aplikacije (allowlist/Turnstile ključ) — **ako korak 1 pokaže da je B nužna, stani i zapiši u Zapisnik; ne implementiraj B bez te potvrde.**

**Automatski:** A2 mergean (donacijski flow postoji pa se "Bez naknade" ima gdje vidjeti); upstream relay infrastruktura (gore).

## Opseg

**In:**

- Istraga: `RELAYING` status za Gnosis (100) na relevantnom CGW-u — dokumentiran nalaz.
- Ako relay postoji: default izvršenja = relay kad je `isRelayAvailable` (kvota > 0), "Bez naknade" indikator u confirm/execute UI-ju, pošten fallback copy kad relay nije dostupan (kvota potrošena / feature isključen).
- Testovi za odabir puta i copy.

**Out (svjesno):**

- Implementacija opcije B (vlastiti relayer klijent) — samo ako A padne I vlasnik potvrdi; inače ostaje dokumentirana odluka u Zapisniku.
- Diranje `relayExecutor.ts` / `useRequiresRelay.ts` semantike — konzumiraju se, ne mijenjaju.
- GTF Safe-pays (`txRequiresRelay` put) — već radi, ne dirati.
- Marketing tekstovi izvan appa (mpt.hr/store listing) — samo in-app copy.

## Točne datoteke i šavovi

Točan skup ovisi o nalazu koraka 1; očekivani minimum (thin seams, upstream datoteke):

| Datoteka                                                         | Izmjena                                                                                                                                                                      |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/features/HowToExecuteSheet/HowToExecuteSheet.container.tsx` | default selekcija = relay kad je `isRelayAvailable` (danas je default vjerojatno PK — provjeri i zabilježi)                                                                  |
| `src/features/ExecuteTx/...` (confirm/review UI)                 | "Bez naknade" badge/tekst kad je odabrani put relay; pošten copy inače (novi mali komponent u `src/custom/donations/` ili generički u `src/custom/` — odaberi minimalni šav) |
| kolocirani testovi                                               | default-put logika (relay dostupan/nedostupan/kvota 0), copy prisutnost                                                                                                      |

**Odluka u fazi:** default-na-relay može biti (a) samo za airkuna/donations brandove (gate preko `isDonationsBrand()` ili novi `features` flag) ili (b) globalno za sve brandove kad je relay dostupan. Preporuka: **(b) globalno** — relay je korisniku uvijek bolji kad postoji, a `useRequiresRelay` već štiti kvotom; ako review pokaže rizik za stock ponašanje (`safe` brand UX se mijenja!), spusti na (a) i zabilježi. `safe` brand regression je odlučujući kriterij.

## Koraci

1. **Istraga (dokumentiraj u Zapisnik prije koda):**

   ```bash
   curl -s https://safe-client.safe.global/v1/chains/100 | jq '.features'
   ```

   (+ isti upit na `backend.cgwBaseUrl` iz airkuna manifesta ako je postavljen). Traži `RELAYING` i usput potvrdi `SEND_TRANSFERS` ([14] Implikacije §3). Provjeri i kvotu: `GET /v1/chains/100/relay/{safeAddress}` semantika kroz postojeći `useRelayGetRelaysRemainingV1Query`.
   - `RELAYING` prisutan → nastavi korake 2–4 (opcija A).
   - Odsutan → **stani**: zapiši nalaz, opcije (B relayer / pošten copy bez 0% tvrdnje) i vrati odluku vlasniku. Faza se tada zatvara samo s poštenim copyjem (korak 3 bez "Bez naknade" tvrdnje).

2. **Default na relay:** u `HowToExecuteSheet.container.tsx` (i gdje god se inicijalni `ExecutionMethod` bira) postavi relay kao predodabrani put kad je `isRelayAvailable` iz `useRequiresRelay`. Ne zaobilazi `getExecutionMethod` — samo promijeni _requested_ default; postojeći prioriteti (GTF force-relay, ledger, WC) ostaju.

3. **Copy:** "Bez naknade" (sentence case, bez emojija, HR za airkuna-vidljive stringove) uz relay opciju/confirm; fallback: jasan tekst da mrežnu naknadu plaća korisnikov ključ (postojeći fee prikaz ostaje). Stringovi u pack `strings.ts` ako su brand-gated, inače uz komponentu.

4. **Testovi:** kolocirani testovi za default selekciju (relay dostupan / kvota 0 / feature isključen → očekivani put), copy render u oba stanja; postojeći HowToExecuteSheet/ExecuteTx testovi moraju ostati zeleni bez izmjena semantike (osim defaulta, što se u njima eksplicitno asserta).

5. **Predaja:** A3 ✅ u airKUNA tablici u `handoffs/README.md`, Zapisnik (nalaz iz koraka 1, odluka a/b iz tablice šavova, status opcije B), commit `feat(mobile): zero-fee send default + bez naknade copy`, push na `origin custom`.

## Kriteriji prihvaćanja

- [ ] Zapisnik sadrži dokumentiran `RELAYING`/`SEND_TRANSFERS` nalaz za Gnosis (100) s datumom i gatewayem.
- [ ] Kad je relay dostupan: predodabrani put izvršenja je relay, "Bez naknade" vidljivo; korisnik i dalje može ručno izabrati drugi put.
- [ ] Kad relay nije dostupan (kvota/feature): pošten copy, nikakva "0%" tvrdnja u UI-ju.
- [ ] `safe` brand ponašanje: bez regresije (ili je promjena defaulta svjesno globalna i pokrivena testovima — v. odluku u tablici šavova).
- [ ] Opcija B nije implementirana bez potvrde vlasnika; status zapisan.
- [ ] `node scripts/verify.mjs --changed --workspace=mobile` čist.

## Zapisnik izvršenja

_(prazno — popunjava agent koji izvrši fazu)_
