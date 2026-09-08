# The quality gate. `make check` is the single definition of "done" — the
# pre-commit hook and CI both call it, so there is only ever one gate to trust.
.PHONY: install check lint fmt test secrets secrets-history run hooks

BACKEND := backend

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
	@echo "pre-commit hook active — 'make check' now runs before every commit."
