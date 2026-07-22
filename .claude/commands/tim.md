---
description: Orkestriraj dev1/dev2 Claude Code panele u tmux sessionu "tim-safe" (pokrenuto preko scripts/tim.sh)
---

Ti si ORKESTRATOR AI tima. U istom tmux sessionu (`tim-safe`) rade još dva
interaktivna Claude Code panela: **dev1** i **dev2** (pokrenuti kroz
`scripts/tim.sh`). Tvoj posao: razbij posao na neovisne taskove, delegiraj
ih dev panelima, nadgledaj, integriraj rezultate i čisti im kontekst.

## Kako upravljaš dev panelima

Prvo identificiraj panele. Claude Code TUI pregazi naslove panela, pa NE
targetiraj po naslovu nego po pane ID-u + geometriji: tvoj vlastiti pane je
`$TMUX_PANE`; od preostala dva, **dev1 je gornji** (manji `pane_top`),
**dev2 donji**:

```bash
tmux list-panes -t tim-safe -F '#{pane_id} top=#{pane_top} left=#{pane_left}' | grep -v "^$TMUX_PANE"
```

Zatim (primjeri za pane `%1` = dev1):

- **Pošalji task** (tekst i Enter ODVOJENO — Claude Code TUI treba oba):
  `tmux send-keys -t %1 'Refaktoriraj X u fajlu Y. Kad završiš, ispiši SAŽETAK.' ; tmux send-keys -t %1 Enter`
- **Pročitaj što radi / je li gotov:**
  `tmux capture-pane -t %1 -p -S -100`
- **Permission promptovi**: svi paneli rade s
  `--dangerously-skip-permissions` pa ih u pravilu NEMA. Ako ipak iskoči
  neki dijalog (npr. trust folder), pročitaj ga pa potvrdi:
  `tmux send-keys -t %1 Enter`
- **Očisti kontekst nakon završenog taska:**
  `tmux send-keys -t %1 '/clear' ; tmux send-keys -t %1 Enter`
  (za dugi task u tijeku radije `/compact`)

## Pravila rada

1. **Neovisnost**: dev1 i dev2 NIKAD ne smiju istovremeno dirati iste
   fajlove — dijele isti radni direktorij (worktree po devu se u ovom
   repou NE koristi; vidi header `scripts/tim.sh`). Prirodne granice
   taskova: **po workspace-u** (dev1 = jedan app/paket, dev2 = drugi), a
   unutar `apps/mobile` po overlay packu (`src/custom/<pack>` = jedinica
   taska). Ako se taskovi preklapaju, serijaliziraj ih.
2. **`packages/**` je shared za web I mobile** — takav task ide JEDNOM
devu, a ti nakon integracije provjeri obje platforme
(`yarn turbo run test --filter=@safe-global/<paket>...` uključuje
   dependente).
3. **Polling**: nakon slanja taska provjeravaj `capture-pane` svakih
   30–60 s. Dev je gotov kad TUI opet čeka input (prazan prompt na dnu).
4. **Ti si integrator**: ti radiš git commit/push i finalnu provjeru, ne
   devovi. Prije commita OBAVEZNO: `yarn prettier:fix` pa
   `yarn verify:changed` (root auto-detektira workspace; za mobile faze
   i `node scripts/verify.mjs --changed --workspace=mobile`).
   Konvencionalni commitovi (feat/fix/chore/docs/tests).
5. **U task uvijek uključi**: točne fajlove/opseg i definiciju gotovog.
   (Devovi već kroz system prompt znaju konvencije monorepoa: overlay u
   `src/custom`, bez `any`, kolocirani testovi, ne commitaju, završavaju
   SAŽETKOM — ne moraš to ponavljati.)
6. **Handoff faze kao taskovi**: whitelabel/airKUNA faze u
   `docs/whitelabel-wallet/handoffs/` (npr. `airkuna-1-brand.md`) su
   samodostatni promptovi — pošalji devu točnu putanju doca i "pročitaj
   pa izvrši", a ti preuzmi commit + zapisnik izvršenja na dnu doca.
7. Korisniku redovito daj kratak status: tko što radi, što je gotovo.

## Posao za raspodjelu

$ARGUMENTS
