# The quality gate. `make check` is the single definition of "done" — the
# pre-commit hook and CI both call it, so there is only ever one gate to trust.
.PHONY: install check lint fmt test secrets secrets-history run hooks branch-status harness-check check-frontend

BACKEND := backend
FRONTEND := frontend
# Recursive `=`, not `:=` — this shells out only when branch-status uses it,
# rather than on every make invocation.
CURRENT = $(shell git branch --show-current)

# Installs both halves, because `check` now gates both. `npm ci` rather than
# `npm install`: it installs exactly the committed lockfile and fails when
# package.json and package-lock.json disagree, which is the same reproducibility
# `uv sync` gives the backend. CI calls this target too, so there is one install
# path, not a local one and a CI one.
install:
	cd $(BACKEND) && uv sync
	cd $(FRONTEND) && npm ci

# `check-frontend` runs last: it is the slowest half (~13s against ~3s), so the
# cheap backend failures surface first. It also builds frontend/dist, and
# gitleaks' `dir` mode does not honour .gitignore — keeping it after `secrets`
# means the scan surface never depends on whether a build has run.
check: harness-check lint secrets test check-frontend

# Some rules are written in more than one place — the commit vocabulary in the
# hook and in both docs, rule 8's file list in AGENTS.md and in the guide. This
# fails when the copies disagree, so a doc cannot quietly describe a rule that
# is no longer enforced. Runs first: it is instant and needs no environment.
harness-check:
	@./scripts/harness-check.sh

lint:
	cd $(BACKEND) && uv run ruff check .
	cd $(BACKEND) && uv run ruff format --check .

fmt:
	cd $(BACKEND) && uv run ruff format .
	cd $(BACKEND) && uv run ruff check --fix .

test:
	cd $(BACKEND) && uv run pytest -q

# The frontend half of the gate: oxlint, the production build (which type-checks
# via `tsc -b`) and the Vitest suite — the frontend's own definition of done, as
# stated in frontend/AGENTS.md. Most of the repo's tests live here, so a `check`
# without them gates the minority of the suite.
#
# Missing dependencies fail loudly instead of skipping. A conditional skip was
# the obvious way to spare a contributor who has never run `npm install`, but it
# would arm itself on a fresh clone — the exact state where an unverified commit
# is most likely — and `secrets` below already states the principle: a gate that
# silently does nothing is worse than no gate, because it is trusted. So the
# gate stays mandatory and the error names its own fix.
check-frontend:
	@command -v npm >/dev/null 2>&1 || { \
		echo "ERROR: npm not installed — the frontend gate cannot run."; \
		echo "  install Node (the pinned version is in $(FRONTEND)/.nvmrc), then:"; \
		echo "    make install"; \
		exit 1; \
	}
	@[ -d $(FRONTEND)/node_modules ] || { \
		echo "ERROR: $(FRONTEND)/node_modules is missing — the frontend gate cannot run."; \
		echo "  fix: make install   (runs 'uv sync' and 'npm ci')"; \
		exit 1; \
	}
	cd $(FRONTEND) && npm run lint
	cd $(FRONTEND) && npm run build
	cd $(FRONTEND) && npm test

# Secret scanning. Fails loudly when gitleaks is missing rather than skipping:
# a gate that silently does nothing is worse than no gate, because it is
# trusted. Install: brew install gitleaks
secrets:
	@command -v gitleaks >/dev/null 2>&1 || { \
		echo "ERROR: gitleaks not installed — the secret scan cannot run."; \
		echo "  macOS: brew install gitleaks"; \
		echo "  other: https://github.com/gitleaks/gitleaks#installing"; \
		exit 1; \
	}
	gitleaks dir . --config .gitleaks.toml --redact --no-banner

# Scan the whole git history, not just the working tree. Slower; run it after
# importing code or if you suspect something was committed previously.
secrets-history:
	gitleaks git . --config .gitleaks.toml --redact --no-banner

run:
	cd $(BACKEND) && uv run start

# One-time: point git at the repo's tracked hooks.
hooks:
	git config core.hooksPath .githooks
	@echo "hooks active: pre-commit runs 'make check'; commit-msg validates the"
	@echo "commit format and the Change: trailer. See docs/git-guide.md."

# Audit branch state against origin/main, so cleanup is a read rather than an
# investigation.
#
# A branch is done in either of two ways, and the second one is the common case
# here. `0 ahead` means main literally contains its commits — that is what a
# fast-forward or a merge commit leaves behind. But rule 9 mandates *squash*
# merges, and a squash writes one new commit with a new hash: the branch keeps
# every original commit, ancestry is severed, and it reads as "5 ahead" forever.
# Judging by ahead-count alone, no branch merged by this repo's own workflow
# would ever be reported deletable — the target would never once do its job.
#
# So also compare the trees. `git diff --quiet` exits 0 when the branch's content
# is identical to main's, which means everything on it has landed however it got
# there. That test is about content, not history, so the squash cannot hide it.
branch-status:
	@git fetch --prune --quiet 2>/dev/null || true
	@printf '%-38s %8s %8s  %s\n' BRANCH BEHIND AHEAD STATE
	@git for-each-ref --format='%(refname:short)' refs/heads refs/remotes/origin \
		| grep -vE '^(origin/HEAD|origin/main|main)$$' | sort | while read -r b; do \
		counts=$$(git rev-list --left-right --count origin/main..."$$b" 2>/dev/null) || continue; \
		behind=$$(echo "$$counts" | cut -f1); ahead=$$(echo "$$counts" | cut -f2); \
		if [ "$$ahead" -eq 0 ]; then state='merged — safe to delete'; \
		elif git diff --quiet origin/main "$$b" 2>/dev/null; then state='squash-merged — safe to delete'; \
		else state='in progress'; fi; \
		[ "$$b" = "$(CURRENT)" ] && b="* $$b"; \
		printf '%-38s %8s %8s  %s\n' "$$b" "$$behind" "$$ahead" "$$state"; \
	done
	@echo
	@echo "open OpenSpec changes:"
	@ls -1 openspec/changes 2>/dev/null | grep -v '^archive$$' | sed 's/^/  /' \
		|| true
	@ls -1 openspec/changes 2>/dev/null | grep -qv '^archive$$' || echo "  (none)"
	@stashes=$$(git stash list | wc -l | tr -d ' '); \
		[ "$$stashes" = "0" ] || { echo; echo "$$stashes stash(es) — see docs/git-guide.md"; git stash list | sed 's/^/  /'; }
