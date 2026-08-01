#!/usr/bin/env bash
# Wires the version-controlled claude/ directory into Claude Code by symlinking
# claude/skills -> .claude/commands, claude/rules -> .claude/rules, and
# claude/agents -> .claude/agents. Directory-style skills
# (claude/skills/<name>/SKILL.md) are additionally linked one by one into
# .claude/skills/ so they auto-activate.
#
# Runs from the pnpm "prepare" hook, which fires on a fresh clone and on any
# install that actually does work. pnpm skips it when the install is a complete
# no-op, so `pnpm run prepare` is the manual path after pulling a harness
# change. Idempotent, and never fails the install, because .claude/ is
# gitignored local state and a broken symlink is not worth blocking work over.
#
# The harness lives in claude/ and is committed. .claude/ is generated. That
# split is the point: every rule, agent and skill is a reviewable diff rather
# than untracked local state that drifts per machine.
#
# Adapted from equip-platform/scripts/setup-claude.sh.
set -u

repo_root="$(cd "$(dirname "$0")/.." && pwd)"

mkdir -p "$repo_root/.claude" 2>/dev/null || exit 0

link_if_absent() {
  target="$1"
  linkpath="$2"
  # Only link when the tracked source exists, and never clobber something a
  # human put there deliberately.
  if [ -e "$target" ] && [ ! -e "$linkpath" ] && [ ! -L "$linkpath" ]; then
    ln -s "$target" "$linkpath" 2>/dev/null || true
  fi
}

link_if_absent "$repo_root/claude/skills" "$repo_root/.claude/commands"
link_if_absent "$repo_root/claude/rules" "$repo_root/.claude/rules"
link_if_absent "$repo_root/claude/agents" "$repo_root/.claude/agents"

# Directory-style skills: claude/skills/<name>/SKILL.md -> .claude/skills/<name>
for skill_dir in "$repo_root"/claude/skills/*/; do
  [ -f "$skill_dir/SKILL.md" ] || continue
  mkdir -p "$repo_root/.claude/skills" 2>/dev/null || break
  link_if_absent "${skill_dir%/}" "$repo_root/.claude/skills/$(basename "$skill_dir")"
done

exit 0
