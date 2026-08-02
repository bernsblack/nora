#!/usr/bin/env bash
# SessionStart hook. Injects handoff/NEXT.md into the session before the first
# prompt, together with a staleness verdict computed from git rather than left
# to be reasoned about.
#
# Why a hook and not just an instruction: the root instructions file asks for
# the handoff to be read, which competes with everything else in that file. This
# makes it a fact instead of a request. It also turns the staleness check from a
# judgement (run git log, remember that one commit ahead is expected, decide)
# into arithmetic.
#
# Fails open. If jq is missing or anything goes wrong, the session starts
# normally and the instructions file is still there asking for the same thing.
set -u

repo_root="$(cd "$(dirname "$0")/../.." && pwd)"
next="$repo_root/handoff/NEXT.md"

[ -f "$next" ] || exit 0
command -v jq >/dev/null 2>&1 || exit 0

git_ok=0
git -C "$repo_root" rev-parse --git-dir >/dev/null 2>&1 && git_ok=1

verdict="No git repository, so the handoff could not be checked for staleness."

if [ "$git_ok" -eq 1 ]; then
  # The header line reads: **Written:** <when> at commit `abc1234`
  recorded="$(sed -n 's/.*at commit `\([0-9a-f]\{7,\}\)`.*/\1/p' "$next" | head -1)"

  if [ -z "$recorded" ]; then
    verdict="This handoff records no commit, which the convention requires. Treat it as unverified."
  elif ! git -C "$repo_root" rev-parse --verify --quiet "${recorded}^{commit}" >/dev/null 2>&1; then
    verdict="This handoff records commit ${recorded}, which is not in this repository. It may have been rewritten or the handoff may be from another branch. Verify before acting on it."
  else
    ahead="$(git -C "$repo_root" rev-list --count "${recorded}..HEAD" 2>/dev/null || echo "")"
    case "$ahead" in
      0)
        verdict="Fresh. HEAD is the commit this handoff was written at."
        ;;
      1)
        # Expected: the handoff is written before the commit that carries it.
        verdict="Fresh. HEAD is one commit past the handoff, which is the normal offset."
        ;;
      "")
        verdict="Could not compare the handoff's commit to HEAD. Treat it as unverified."
        ;;
      *)
        verdict="STALE. HEAD is ${ahead} commits past this handoff, so the work it describes may already be finished. Verify against git log and worklog/INDEX.md before acting on it."
        ;;
    esac
  fi

  dirty="$(git -C "$repo_root" status --porcelain 2>/dev/null | wc -l | tr -d ' ')"
  if [ "${dirty:-0}" -eq 1 ]; then
    verdict="${verdict} There is 1 uncommitted change in the working tree."
  elif [ "${dirty:-0}" -gt 1 ]; then
    verdict="${verdict} There are ${dirty} uncommitted changes in the working tree."
  fi
fi

{
  echo "# Handoff from the last session"
  echo
  echo "Read this before starting. ${verdict}"
  echo
  echo "---"
  echo
  cat "$next"
} | jq -Rs '{
  hookSpecificOutput: {
    hookEventName: "SessionStart",
    additionalContext: .
  }
}'

exit 0
