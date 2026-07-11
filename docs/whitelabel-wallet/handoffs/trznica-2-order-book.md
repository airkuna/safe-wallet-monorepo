# Tržnica 2 (M2) — backend order-book: narudžba stiže trgovcu automatski

> Handoff prompt za praznu Claude Code sesiju. Repo: `/Users/ms/git/safe-global/safe-wallet-monorepo`, grana `custom`.
> Prije početka pročitaj [handoffs/README.md](README.md) i [09 — Tržnica](../09-trznica-marketplace.md) (§3 arhitektura, §5 faze).
> Preduvjet u repou: M1 mergean (`apps/mobile/src/custom/marketplace/` postoji).

## Cilj

Narudžba iz Checkouta se, uz lokalni MMKV zapis, šalje na backend order-book; trgovac dobije
e-mail (kasnije push/dashboard) s referencom, stavkama i adresom dostave; app periodički povlači
status narudžbe (zaprimljena → plaćena → poslana) i prikazuje ga u Moje narudžbe. Share sheet iz
M1 ostaje kao fallback kad je backend nedostupan.

## Kontekst i izvori

- M1 stanje: `apps/mobile/src/custom/marketplace/` — `logic/order.ts` (OrderItem, BuyerInfo,
  totals, referenca), `state/useOrders.ts` (MMKV knjiga, status `pending|sent`),
  `screens/Checkout.tsx` (sprema narudžbu PRIJE predaje Send flowu), `screens/MojeNarudzbe.tsx`.
- Backend presedan u lozi: `mpt.domovina.ai` shared Worker (payment intents za on-ramp — v.
  [kunapay-2-fiat-onramp.md](kunapay-2-fiat-onramp.md) "Kontekst"). Order-book je isti oblik:
  mali Cloudflare Worker + KV/D1, host-agnostičan, CORS za app.
- Potvrda plaćanja: narudžba nosi `payerSafeAddress`, trgovčev Safe i točan EURe iznos —
  backend može detektirati uplatu praćenjem ERC-20 transfera na trgovčev Safe (Gnosis RPC ili
  Safe Transaction Service) i sam prebaciti status u "plaćena". MVP verzije: klijent javi tx
  hash nakon Send flowa (best effort), backend verificira onchain.

## Preduvjeti

**Ručni (vlasnik):**

| Preduvjet                                                              | Zašto                       | Status |
| ---------------------------------------------------------------------- | --------------------------- | ------ |
| Odluka o hostingu order-book Workera (domena, račun)                   | backend je izvan ovog repoa | ⬜     |
| E-mail kanal (npr. Cloudflare Email/Resend) + trgovčev e-mail potvrđen | notifikacija trgovcu        | ⬜     |
| Crošulja pristanak na kanal (umjesto/uz share sheet)                   | pilot dogovor               | ⬜     |

Bez preduvjeta: faza se izvršava s MSW mockovima do kraja; deploy Workera je ručni korak — zapiši u Zapisnik.

## Opseg

**In:** Worker (zaseban repo ili `services/`, odluka u sesiji) s `POST /orders`,
`GET /orders/{ref}`, e-mail notifikacijom i onchain verifikacijom uplate; app strana:
`custom/marketplace/api/` klijent + `useOrderSync` hook (submit pri checkoutu, poll statusa u
Moje narudžbe, graceful offline fallback na share sheet); proširenje `OrderStatus`; MSW testovi.

**Out (svjesno):** merchant dashboard UI (M4), fiskalizacija/računi (M3), push notifikacije,
košarica s više artikala odjednom (MVP je 1 proizvod po narudžbi — proširenje ide uz M4 katalog).

## Sigurnost / privatnost

- Order-book nosi osobne podatke kupca (adresa!) — endpoint autentikacija (barem API key po
  brandu + rate limit), TLS, minimalna retencija; GDPR: podaci se brišu na zahtjev trgovca/kupca.
- Nikakva sredstva ne prolaze kroz backend — on samo evidentira; invariant iz [09] §3 ostaje.

## Acceptance kriteriji

1. Checkout uz lokalni zapis šalje narudžbu na Worker; pad mreže ne blokira plaćanje (fallback
   flow = M1 ponašanje, vidljivo u testu).
2. Trgovac dobije e-mail s referencom, stavkama, iznosom, adresom i payer Safe adresom.
3. Kad EURe uplata s payer Safe-a sjedne na trgovčev Safe u točnom iznosu, status narudžbe
   postane "plaćena" bez ljudske intervencije; Moje narudžbe to prikaže.
4. `safe`/`ff` buildovi netaknuti; `node scripts/verify.mjs --changed --workspace=mobile` zelen.

## Zapisnik izvršenja

(popunjava agent koji izvrši fazu)
