#!/usr/bin/env bash
# SessionEnd hook. Writes a mechanical breadcrumb to handoff/log/ when a session
# ends with work that was never handed off.
#
# This is deliberately NOT a handoff. SessionEnd cannot inject context and has no
# decision control, so it cannot ask anything of the model: by the time it runs,
# the model is out of the loop. It records facts only, and the file it writes
# says so, because a file that looks like a handoff and contains no judgement is
# what erodes trust in the real ones.
#
# Its one job: after an ungraceful exit, leave evidence that work happened after
# the last /goodbye.
#
# SessionEnd hooks share a 1.5 second budget and are not guaranteed to run on a
# crash, so everything here is a couple of git calls and nothing else.
set -u

repo_root="$(cd "$(dirname "$0")/../.." && pwd)"
next="$repo_root/handoff/NEXT.md"
log_dir="$repo_root/handoff/log"

git -C "$repo_root" rev-parse --git-dir >/dev/null 2>&1 || exit 0
[ -d "$log_dir" ] || exit 0

head_hash="$(git -C "$repo_root" rev-parse --short HEAD 2>/dev/null || echo unknown)"
dirty="$(git -C "$repo_root" status --porcelain 2>/dev/null || true)"
dirty_count="$(printf '%s' "$dirty" | grep -c . || true)"

# Only leave a breadcrumb when there is something to say. A session that ends
# clean and up to date, including every /clear, writes nothing.
ahead=0
if [ -f "$next" ]; then
  recorded="$(sed -n 's/.*at commit `\([0-9a-f]\{7,\}\)`.*/\1/p' "$next" | head -1)"
  if [ -n "$recorded" ] && git -C "$repo_root" rev-parse --verify --quiet "${recorded}^{commit}" >/dev/null 2>&1; then
    ahead="$(git -C "$repo_root" rev-list --count "${recorded}..HEAD" 2>/dev/null || echo 0)"
  fi
fi

if [ "${dirty_count:-0}" -eq 0 ] && [ "${ahead:-0}" -le 1 ]; then
  exit 0
fi

stamp="$(date '+%Y-%m-%d-%H%M')"
out="$log_dir/${stamp}-auto.md"

{
  echo "# Session ended without a handoff"
  echo
  echo "Written by the SessionEnd hook, not by \`/goodbye\`. **Facts only, no judgement:**"
  echo "nothing here knows what was being attempted or what should happen next."
  echo
  echo "- **When:** $(date '+%Y-%m-%d %H:%M')"
  echo "- **HEAD:** \`${head_hash}\`"
  echo "- **Commits past the last handoff:** ${ahead}"
  echo "- **Uncommitted files:** ${dirty_count}"
  if [ "${dirty_count:-0}" -gt 0 ]; then
    echo
    echo '```text'
    printf '%s\n' "$dirty"
    echo '```'
  fi
  echo
  echo "Read \`git log\` and the active \`worklog/*/plan.md\` to work out what this was."
} > "$out" 2>/dev/null

exit 0
