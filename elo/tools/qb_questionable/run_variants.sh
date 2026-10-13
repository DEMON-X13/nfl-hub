#!/bin/bash
# runs elo/build.py --offline once per quarterback-rule variant in the worktree, restoring elo/data first
set -u
WT=${QB_WORKTREE:?a git worktree of the repo with switch.diff applied and elo/cache linked}
W=${QB_WORK:-$(cd "$(dirname "$0")" && pwd)/work}
cd "$WT"
for spec in "baseline|" "limited|Limited" "didnot|Did Not" "limited_didnot|Limited,Did Not"; do
  tag=${spec%%|*}; val=${spec#*|}
  rm -rf "$WT/elo/data" && mkdir "$WT/elo/data" && cp -a "$W/pristine_data/." "$WT/elo/data/"
  echo "=== $tag ELO_QB_Q_OUT='$val' $(date -u +%H:%M:%S)"
  ELO_QB_Q_OUT="$val" ELO_WF_DUMP="$W/$tag" python3 "$WT/elo/build.py" --offline > "$W/$tag.log" 2>&1
  echo "exit $? $(date -u +%H:%M:%S)"
  cp "$WT/elo/data/model.json" "$W/${tag}_model.json"
done
rm -rf "$WT/elo/data" && mkdir "$WT/elo/data" && cp -a "$W/pristine_data/." "$WT/elo/data/"
echo done
