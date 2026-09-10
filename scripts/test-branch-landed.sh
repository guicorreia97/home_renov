#!/bin/sh
# Covers scripts/branch-landed.sh against the way this repo actually merges.
#
# This test exists because the check it covers shipped broken twice. Both bugs
# passed a manual look on the day: the branch really had landed, and the tool
# really did say so — because `main` had not moved yet. The regression only
# appears one merge later, which is exactly the kind of thing a human stops
# re-checking and a test never does.
#
# Builds a throwaway repo in a temp dir: hermetic, offline, no fixtures to rot.
set -eu

cd "$(dirname "$0")"
SCRIPT="$(pwd)/branch-landed.sh"

TMP=$(mktemp -d)
# Runs in the gate, so clean up on failure too.
trap 'rm -rf "$TMP"' EXIT INT TERM

fail=0
bad() {
	printf 'test-branch-landed: FAIL %s\n' "$1" >&2
	fail=1
}

cd "$TMP"
git init --quiet -b main .
git config user.email test@example.com
git config user.name test
git config commit.gpgsign false

commit() { # file, content, message
	printf '%s\n' "$2" >"$1"
	git add "$1"
	git commit --quiet --no-verify -m "$3"
}

commit shared.txt "base" "initial"

# A branch with more than one commit — a squash collapses them, which is the
# whole reason ancestry stops working.
git switch --quiet -c feature/work
commit shared.txt "base
feature line" "feat: first half"
commit other.txt "feature file" "feat: second half"

# Squash-merge it the way the workflow (and GitHub) does: one new commit, new
# hash, branch left intact and still "ahead".
git switch --quiet main
git merge --squash feature/work >/dev/null 2>&1
git commit --quiet --no-verify -m "feat: the whole thing (#1)"
SQUASH=$(git rev-parse HEAD)

# 1. The basic case: it landed, and we can name the commit that carried it.
got=$("$SCRIPT" feature/work main 2>/dev/null || true)
[ "$got" = "$SQUASH" ] ||
	bad "a squash-merged branch was not detected.
    expected $SQUASH
    got      '${got:-<nothing>}'"

# 2. The regression that shipped. Move main on, touching the *same file* the
#    branch touched — this is what makes a tree comparison diverge and wrongly
#    report the branch as unmerged.
commit shared.txt "base
feature line
later unrelated work" "chore: later change to the same file"
commit unrelated.txt "more" "chore: another change"

got=$("$SCRIPT" feature/work main 2>/dev/null || true)
[ "$got" = "$SQUASH" ] ||
	bad "a landed branch stopped being detected once main moved past it.
    This is the bug this file exists to catch: the check must compare content
    by patch-id, not compare trees.
    expected $SQUASH
    got      '${got:-<nothing>}'"

# 3. The other direction matters just as much: a branch with real unlanded work
#    must never be reported as safe to delete.
git switch --quiet -c feature/unmerged
commit novel.txt "genuinely new" "feat: not merged anywhere"
if "$SCRIPT" feature/unmerged main >/dev/null 2>&1; then
	bad "an unmerged branch was reported as landed — this would lose work."
fi

[ "$fail" -eq 0 ] || exit 1
echo "test-branch-landed: squash detection survives a moving main"
