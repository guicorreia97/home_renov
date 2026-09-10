#!/bin/sh
# Fails when the harness contradicts itself.
#
# Several rules are written in more than one place — the commit vocabulary lives
# in the hook that enforces it and in the two docs that describe it, and rule 8's
# file list lives in AGENTS.md and in the git guide. Copies drift silently: the
# docs still read as if they were true, and nothing disagrees until someone
# trusts the wrong one. This is the gate that disagrees.
#
# Pure POSIX sh and coreutils on purpose — it runs in the pre-commit hook and in
# CI, so it must not need a Python environment or network access.
set -eu

cd "$(dirname "$0")/.."

HOOK=.githooks/commit-msg
GUIDE=docs/git-guide.md
SKILL=.agents/skills/commit-messages/SKILL.md
AGENTS=AGENTS.md

fail=0
bad() { printf 'harness-check: %s\n' "$1" >&2; fail=1; }

# Tokens inside backticks, from the marker line through the line that ends the
# sentence. Both lists wrap across lines, so this cannot be a single grep.
md_tokens() {
	awk -v pat="$2" '
		!on && $0 ~ pat { on = 1 }
		on { print; if ($0 ~ /\.[[:space:]]*$/) exit }
	' "$1" | grep -o '`[A-Za-z.][A-Za-z.*/_-]*`' | tr -d '`' | sort -u | tr '\n' ' '
}

# A shell alternation ("feat|fix|...") as a sorted, space-separated list.
sh_tokens() {
	grep -o "^$2=\"[^\"]*\"" "$1" | sed "s/^$2=\"//;s/\"$//" |
		tr '|' '\n' | sort -u | tr '\n' ' '
}

same() { # label, expected-source, a, b
	[ "$3" = "$4" ] && return 0
	bad "$1 disagree.
    $2
      $3
    differs from
      $4"
}

# 1. Commit types: enforced in the hook, described in both docs.
h=$(sh_tokens "$HOOK" TYPES)
same "commit types in $HOOK and $GUIDE" "edit both in the same commit" \
	"$h" "$(md_tokens "$GUIDE" '^\\*\\*Types:\\*\\*')"
same "commit types in $HOOK and $SKILL" "edit both in the same commit" \
	"$h" "$(md_tokens "$SKILL" '^\\*\\*Types:\\*\\*')"

# 2. Commit scopes: same three places.
h=$(sh_tokens "$HOOK" SCOPES)
same "commit scopes in $HOOK and $GUIDE" "edit both in the same commit" \
	"$h" "$(md_tokens "$GUIDE" '^\\*\\*Scopes')"
same "commit scopes in $HOOK and $SKILL" "edit both in the same commit" \
	"$h" "$(md_tokens "$SKILL" '^\\*\\*Scopes')"

# 3. Rule 8's file list. AGENTS.md is canonical; the guide restates it.
same "rule 8 file lists in $AGENTS and $GUIDE" "$AGENTS is canonical" \
	"$(md_tokens "$AGENTS" '^8\\. \\*\\*Never modify')" \
	"$(md_tokens "$GUIDE" '^\\*\\*Rule 8 —')"

# 4. Every doc a guide points at must exist. A dangling pointer sends an agent
#    looking for a convention that is no longer written down anywhere.
for f in $(grep -rho '`docs/[a-z-]*\.md`' "$AGENTS" README.md docs/*.md \
	.agents/skills/*/SKILL.md .claude/agents/*.md 2>/dev/null |
	tr -d '`' | sort -u); do
	[ -f "$f" ] || bad "$f is referenced but does not exist"
done

# 5. The required status check is the workflow's job name. Compared offline
#    against the value recorded in the guide, since CI has no gh credentials.
job=$(sed -n 's/^    name: \(.*\)$/\1/p' .github/workflows/check.yml)
grep -q "Status check \`$job\`" "$GUIDE" ||
	bad "the workflow job is named '$job' but $GUIDE does not document it as the
    required status check. Branch protection matches on this exact string; a
    check that never reports leaves every PR pending, not failed."

# 6. The harness's own logic, not just its prose. `branch-landed.sh` decides
#    whether a branch can be deleted, and it shipped wrong twice — both times
#    passing a manual check on the day, because the failure only appears one
#    merge later. Its test is hermetic and takes about a second, so the gate
#    runs it rather than trusting that it still works.
./scripts/test-branch-landed.sh || fail=1

[ "$fail" -eq 0 ] || exit 1
echo "harness-check: docs, hook and AGENTS.md agree"
