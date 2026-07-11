# Tržnica 3 (M3) — račun + fiskalizacija kao servis (u ime i za račun trgovca)

> Handoff prompt za praznu Claude Code sesiju. Repo: `/Users/ms/git/safe-global/safe-wallet-monorepo`, grana `custom`.
> Prije početka pročitaj [handoffs/README.md](README.md) i [09 — Tržnica](../09-trznica-marketplace.md) — **posebno §4 (regulatorni okvir) i otvorena pitanja na dnu §4**. Ovo NIJE pravni savjet; faza ima tvrde ručne preduvjete.
> Preduvjet u repou: M2 mergean (backend order-book postoji).

## Cilj

Za svaku plaćenu narudžbu backend generira **račun trgovca** (PDF + podaci) sa svim obveznim
elementima (OIB, numeracija broj/poslovni prostor/naplatni uređaj iz trgovčevog internog akta,
PDV raščlamba ili klauzula čl. 90 za paušalce, JIR + ZKI + QR) i **fiskalizira ga prema
Fiskalizaciji 2.0** (B2C fiskalna poruka u CIS); račun se e-mailom šalje kupcu i trgovcu, a
kupcu je vidljiv u Moje narudžbe. Kupac s OIB-om pravne osobe → eRačun put (može ostati "javi
se trgovcu" za MVP ove faze).

## Pravna osnova (iz researcha 2026-07-11, provjeriti prije koda)

- Porezna Q&A #57: softver smije izdavati račune "u ime i za račun" trgovca uz strogu
  segregaciju po OIB-u. Q&A #23: trgovac u **FiskAplikaciji** (ePorezna) ovlasti platformu da
  fiskalizira **platforminim certifikatom**; alternativa je trgovčev FINA fiskal .pfx u vaultu
  (Solo model, dokazan u produkciji).
- Od 1.1.2026. B2C fiskalizacija vrijedi za **sve** načine plaćanja; stablecoin plaćanje ide kao
  "ostalo" (⚠ nepotvrđeno — mišljenje Porezne je ručni preduvjet).
- **Ne gradi se direktna CIS integracija u ovoj fazi**: proxy kroz postojeći servis
  (kandidati: FiskalAPI — developer-first, "30 min integracija"; Minimax API — fiskalizacija
  računa iz vanjskih programa; Solo API). Odluka u sesiji na temelju cijene/API-ja, zapiši u Zapisnik.

## Preduvjeti

**Ručni (vlasnik + trgovac) — bez njih se faza radi samo do mock/test granice:**

| Preduvjet                                                                                      | Zašto                      | Status |
| ---------------------------------------------------------------------------------------------- | -------------------------- | ------ |
| Pisano mišljenje Porezne: klasifikacija stablecoin plaćanja u fiskalnoj poruci                 | ⚠ iz [09] §4              | ⬜     |
| Odluka certifikat-model: platformin cert + FiskAplikacija ovlaštenja ILI trgovčev .pfx vault   | pravna osnova potpisivanja | ⬜     |
| Trgovac (Crošulja/MARCIDEA): poslovni prostor "internetska trgovina" u ePoreznoj + interni akt | obveznik = trgovac         | ⬜     |
| Račun kod odabranog fiskalizacijskog API providera (test okruženje)                            | proxy umjesto CIS-a        | ⬜     |
| Dogovor o KPD šifri proizvoda (košulje)                                                        | obvezan element od 2026.   | ⬜     |

## Opseg

**In:** backend modul (uz M2 Worker): generiranje računa (predložak s obveznim elementima,
numeracija per trgovac iz configa, PDV/čl. 90 varijante), integracija s odabranim fiskalizacijskim
API-jem (JIR/ZKI/QR natrag u order-book), e-mail dostava, storno/promjena načina plaćanja flow
(najosnovnije); app strana: prikaz računa (PDF link + JIR/QR) u Moje narudžbe; testovi s mock
providerom (nikad pravi CIS u testu).

**Out (svjesno):** vlastita CIS integracija i status informacijskog posrednika (post-MVP odluka),
B2B eRačun izdavanje (2027. obveza za paušalce; za d.o.o. kupce dokumentirati ručni put),
eIzvještavanje automatizacija (provider je obično pokriva), DAC7 (M4).

## Acceptance kriteriji

1. Plaćena narudžba → račun sa svim obveznim elementima + JIR/ZKI/QR (test okruženje providera),
   segregiran po OIB-u trgovca; kupac i trgovac ga dobiju e-mailom.
2. Paušalni trgovac (config flag) → račun bez PDV-a s klauzulom čl. 90; PDV obveznik → raščlamba.
3. Checkout `invoiceNote` copy u appu se ažurira: račun stiže automatski, ne "izdaje trgovac".
4. Nijedan tajni materijal (cert, API ključ) u repou; verify zelen.

## Zapisnik izvršenja

(popunjava agent koji izvrši fazu)
