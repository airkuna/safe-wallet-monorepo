#!/usr/bin/env bash
# tim.sh — "AI tim" oneliner: 1 tmux session s 3 Claude Code panela, 100% YOLO.
#
#   ┌───────────────┬───────────────┐
#   │  orkestrator  │     dev1      │
#   │   (fable)     ├───────────────┤
#   │               │  dev2 (opus)  │
#   └───────────────┴───────────────┘
#
# Pokretanje (prazan iTerm2 window):
#   cd ~/git/safe-global/safe-wallet-monorepo && ./scripts/tim.sh
#
# U lijevom panelu (orkestrator) utipkaj:  /tim <opis posla>
# — slash komanda (.claude/commands/tim.md) uči orkestratora kako slati
# taskove dev panelima, čitati im output i čistiti im kontekst.
#
# Modeli se mogu overrideati env varijablama:
#   TIM_MODEL_ORCH=opus TIM_MODEL_DEV=sonnet ./scripts/tim.sh
#
# SVI paneli rade s --dangerously-skip-permissions (ništa ne pita) — po
# eksplicitnoj odluci vlasnika repoa. Za oprezniji mod makni tu zastavicu
# ili je zamijeni s --permission-mode acceptEdits.
#
# Zašto NE `claude --tmux` / `--worktree`: --tmux traži --worktree i radi
# jedan session po worktree-u (iTerm2 native panes), a ne ovaj 3-panel
# layout kojim orkestrator upravlja preko tmux send-keys.
#
# Worktree po devu NE koristimo ni u ovom repou, ali iz drugih razloga
# nego u domovina.ai (tamo: relativni pubspec path): Yarn 4 monorepo
# traži puni `yarn install` po worktree-u (multi-GB node_modules, minute),
# ff pack je git submodule (apps/mobile/src/custom/ff → treba `git
# submodule update --init` po worktree-u), a gitignirani per-checkout
# fajlovi (apps/mobile/.env.local, brand/manifests/ simlinkovi) u svježem
# worktree-u ne postoje. Izolaciju čuva pravilo "disjunktni fajlovi" u
# /tim komandi (.claude/commands/tim.md).
#
# Session je "tim-safe" (ne "tim") da ne kolidira s domovina timom kad
# rade paralelno. Ponovno pokretanje istog onelinera samo se attacha.
# Gašenje svega: tmux kill-session -t tim-safe
set -euo pipefail

SESSION=tim-safe
MODEL_ORCH="${TIM_MODEL_ORCH:-fable}"
MODEL_DEV="${TIM_MODEL_DEV:-opus}"
cd "$(cd "$(dirname "$0")/.." && pwd)"

command -v tmux >/dev/null 2>&1 || { echo "tmux fali — instaliram (brew)…"; brew install tmux; }
command -v claude >/dev/null 2>&1 || { echo "GREŠKA: 'claude' CLI nije u PATH-u"; exit 1; }

if tmux has-session -t "$SESSION" 2>/dev/null; then
  echo "Session '$SESSION' već postoji — attacham."
  exec tmux attach -t "$SESSION"
fi

# Uloga dev panela ide u system prompt (--append-system-prompt) da je
# orkestrator ne mora ponavljati u svakom tasku.
dev_prompt() {
  printf 'Ti si %s — izvršni developer u AI timu za safe-wallet-monorepo (Yarn 4 monorepo: apps/web = Next.js, apps/mobile = Expo/Tamagui, packages/* = shared kod koji dira OBJE platforme). Taskove ti šalje orkestrator (drugi Claude Code session u istom tmuxu). Radi TOČNO opisani task, ništa šire. Konvencije: mobile customizacije idu u apps/mobile/src/custom (overlay; upstream fajlove diraj samo kroz minimalne seamove), nikad `any` tip, novi kod ima kolocirani *.test.ts(x). Verificiraj s `yarn verify:changed` (mobile faze: `node scripts/verify.mjs --changed --workspace=mobile`). NE commitaj, NE pushaj, NE deployaj — to radi orkestrator. Kad završiš, ispiši kratki SAŽETAK: što je promijenjeno (fajlovi) i kako je verificirano.' "$1"
}

# tmux [new-session|split-window] spaja višestruke argumente razmakom u
# JEDAN shell string, pa svaki arg mora biti shell-quoted (printf %q) —
# inače se --append-system-prompt tekst raspadne na riječi.
q() { printf '%q ' "$@"; }
CMD_ORCH=$(q claude --dangerously-skip-permissions \
  --model "$MODEL_ORCH" -n orkestrator)
CMD_DEV1=$(q claude --dangerously-skip-permissions \
  --model "$MODEL_DEV" -n dev1 --append-system-prompt "$(dev_prompt dev1)")
CMD_DEV2=$(q claude --dangerously-skip-permissions \
  --model "$MODEL_DEV" -n dev2 --append-system-prompt "$(dev_prompt dev2)")

# Pane ID-evi (%N) su stabilni neovisno o base-index konfiguraciji korisnika.
P_ORCH=$(tmux new-session -d -s "$SESSION" -c "$PWD" -P -F '#{pane_id}' "$CMD_ORCH")
P_DEV1=$(tmux split-window -h -t "$P_ORCH" -c "$PWD" -P -F '#{pane_id}' "$CMD_DEV1")
P_DEV2=$(tmux split-window -v -t "$P_DEV1" -c "$PWD" -P -F '#{pane_id}' "$CMD_DEV2")

tmux select-pane -t "$P_ORCH" -T orkestrator
tmux select-pane -t "$P_DEV1" -T dev1
tmux select-pane -t "$P_DEV2" -T dev2

# Border prikazuje pane_id + naslov. NAPOMENA: Claude Code TUI zna
# pregaziti pane_title, ali -n ime ostaje vidljivo u samom TUI prompt
# boxu; za targetiranje se svejedno koristi pane_id + geometrija
# (orkestrator = lijevi stupac; vidi .claude/commands/tim.md).
tmux set -t "$SESSION" pane-border-status top
tmux set -t "$SESSION" pane-border-format ' #{pane_id} #{pane_title} '
tmux set -t "$SESSION" mouse on

tmux select-pane -t "$P_ORCH"

if [ -t 0 ]; then
  exec tmux attach -t "$SESSION"
else
  echo "Session '$SESSION' spreman — attachaj s: tmux attach -t $SESSION"
fi
