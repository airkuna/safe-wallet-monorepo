# identity-proxy

Cloudflare Worker koji drži Namestone API ključ i izlaže minimalni REST API za registraciju
i pretragu korisničkih imena (ENS offchain subnames, whitelabel faza 4). Ključ nikad ne
završava u binaryju aplikacije — mobilni klijent (`apps/mobile/src/custom/identity/proxyClient.ts`)
priča isključivo s ovim workerom.

## REST ugovor (dijeljen s mobilnim klijentom)

| Metoda | Ruta                             | Odgovor                                                             |
| ------ | -------------------------------- | ------------------------------------------------------------------- |
| GET    | `/api/availability?name=<u>`     | `200 { status: 'available' \| 'taken' \| 'reserved' \| 'invalid' }` |
| POST   | `/api/register` `{name,address}` | `201 { ensName }` · `409` zauzeto · `400` neispravno                |
| GET    | `/api/names?address=<0x…>`       | `200 { names: string[] }`                                           |

Pravila za imena su ista kao u klijentu: 3–32 znaka, mala slova a–z, znamenke i crtice
(bez crtice na početku/kraju), plus lista rezerviranih imena.

## Preduvjeti

- Namestone API ključ za parent domenu (https://namestone.com — "Get a key" za npr. `kuna.eth`).
- `wrangler` CLI prijavljen na Cloudflare account (`npx wrangler login`).

## Deploy

```bash
cd services/identity-proxy

# 1. Postavi tajni Namestone ključ (jednokratno po environmentu)
npx wrangler secret put NAMESTONE_API_KEY

# 2. Provjeri vars u wrangler.jsonc:
#    - DOMAIN mora odgovarati `identity.parentDomain` iz brand manifesta (npr. kuna.eth)
#    - RESERVED_NAMES opcionalno (zarezom odvojeno); prazno → default lista u kodu
#      (admin, support, help, safe, wallet, info, root, www)

# 3. Deploy
npx wrangler deploy
```

Nakon deploya URL workera (npr. `https://identity-proxy.<account>.workers.dev` ili custom
route poput `https://id.kuna.eth.limo` / `https://id.<brand-domena>`) upiši u brand manifest
kao `identity.registrationProxyUrl`.

### Custom domena (opcionalno)

U `wrangler.jsonc` dodaj:

```jsonc
"routes": [{ "pattern": "id.example.org", "custom_domain": true }]
```

## Lokalni razvoj

```bash
npx wrangler dev
# GET  http://localhost:8787/api/availability?name=ana
# POST http://localhost:8787/api/register  -d '{"name":"ana","address":"0x…"}'
# GET  http://localhost:8787/api/names?address=0x…
```

Za lokalni rad `wrangler dev` čita secret iz `.dev.vars` (gitignoran format):

```
NAMESTONE_API_KEY=ns_…
```

## Napomene

- **Nije yarn workspace** — direktorij `services/` namjerno nije u root `workspaces` globovima;
  worker se ne builda kroz turbo, deploya ga wrangler (esbuild).
- **CORS**: otvoren (`*`) — čitanje je javno, a registracija je kandidat za rate limiting.
  Per-IP limiter zahtijeva trajno stanje (KV/Durable Object/Cloudflare rate-limiting rules)
  pa je svjesno izostavljen u ovoj fazi; vidi komentar uz `handleRegister`.
- **Namestone endpointi** (provjereno na https://namestone.com/docs, 2026-07-11):
  `set-name`, `get-names`, `search-names` pod `https://namestone.com/api/public_v1/`,
  auth header `Authorization: <API key>`.
- `type-check` unutar ovog direktorija: `npm run type-check` (standalone tsconfig).
