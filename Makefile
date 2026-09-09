# The quality gate. `make check` is the single definition of "done" — the
# pre-commit hook and CI both call it, so there is only ever one gate to trust.
.PHONY: install check lint fmt test secrets secrets-history run hooks branch-status

BACKEND := backend
CURRENT := $(shell git branch --show-current)

install:
	cd $(BACKEND) && uv sync

check: lint secrets test

lint:
	cd $(BACKEND) && uv run ruff check .
	cd $(BACKEND) && uv run ruff format --check .

fmt:
	cd $(BACKEND) && uv run ruff format .
	cd $(BACKEND) && uv run ruff check --fix .

test:
	cd $(BACKEND) && uv run pytest -q

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
# investigation. A branch with 0 ahead is fully contained in main and can go.
branch-status:
	@git fetch --prune --quiet 2>/dev/null || true
	@printf '%-38s %8s %8s  %s\n' BRANCH BEHIND AHEAD STATE
	@git for-each-ref --format='%(refname:short)' refs/heads refs/remotes/origin \
		| grep -vE '^(origin/HEAD|origin/main|main)$$' | sort | while read -r b; do \
		counts=$$(git rev-list --left-right --count origin/main..."$$b" 2>/dev/null) || continue; \
		behind=$$(echo "$$counts" | cut -f1); ahead=$$(echo "$$counts" | cut -f2); \
		if [ "$$ahead" -eq 0 ]; then state='merged — safe to delete'; else state='in progress'; fi; \
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
