#!/bin/sh
# Has this branch's work already landed on the base ref?
#
# Prints the commit that carried it and exits 0; prints nothing and exits 1 if
# it has not landed. Used by `make branch-status`, and covered by
# scripts/test-branch-landed.sh — which exists because the obvious version of
# this check was wrong twice.
#
# The wrong answers, both of which look right on the day you write them:
#
#   ahead-count == 0   Only true for a fast-forward or a merge commit. Rule 9
#                      mandates squash merges, which write a new commit with a
#                      new hash and leave the branch's own commits in place, so
#                      the count never returns to zero.
#   identical trees    Holds only until `main` moves. The next merge that
#                      touches any file the branch also touched makes the trees
#                      differ, and a branch that landed weeks ago silently
#                      reverts to "unmerged".
#
# The right answer is patch-id. A squash commit's diff *is* the branch's
# cumulative diff, so the two share a patch-id, and that stays true however far
# the base moves afterwards. It is a statement about content, which is what
# "already landed" actually means.
#
# Pure POSIX sh and git plumbing: it runs in the gate, so no network and no
# language runtime.
set -eu

BRANCH=${1:?usage: branch-landed.sh <branch> [base-ref]}
BASE=${2:-origin/main}
# Bounded so the scan cannot grow without limit on a long-lived history.
MAX=${BRANCH_LANDED_MAX_COMMITS:-200}

merge_base=$(git merge-base "$BASE" "$BRANCH" 2>/dev/null) || exit 1

# The branch's cumulative diff — what it would contribute if merged.
bid=$(git diff "$merge_base" "$BRANCH" | git patch-id --stable | awk '{print $1}')
# An empty diff contributes nothing; the caller handles that as ancestry.
[ -n "$bid" ] || exit 1

hit=$(git rev-list --max-count="$MAX" "$BASE" | while read -r c; do
	cid=$(git show "$c" | git patch-id --stable | awk '{print $1}')
	if [ "$cid" = "$bid" ]; then
		echo "$c"
		break
	fi
done)

[ -n "$hit" ] || exit 1
echo "$hit"
