# Secrets guide

**Normative.** Read before handling any credential, token, API key, or
connection string.

## What enforces this

`make check` runs two independent checks, and CI runs both again plus a history
scan. Neither may be silenced to get a commit through.

| Check | Catches | Blind to |
|---|---|---|
| **gitleaks** (`.gitleaks.toml`) | ~150 provider token formats, AWS key IDs, passwords inside connection URIs, high-entropy strings near key-shaped names | Anything in an allowlisted path; novel formats with low entropy |
| **ruff `S105`–`S107`** | String literals assigned to password-ish names, in arguments, and as defaults | Credentials in variables that aren't named like one |

`make secrets-history` scans every commit, not just the tip. Run it after
importing code from elsewhere.

## Where values belong

| File | Tracked | Contents |
|---|---|---|
| `config/.env` | yes | `APP_ENV` only. Never a credential. |
| `config/envs/.env.example` | yes | Empty keys. The template. |
| `config/envs/.env.testing` | yes | **Dummy values only.** CI needs it to boot. |
| `config/envs/.env.development` | **no** | Your local values. |
| `config/envs/.env.production` | **no** | Never on a developer machine. |

**The sharp edge:** the two tracked `.env` files are allowlisted by path in
`.gitleaks.toml`, because they exist to hold fake credentials and would
otherwise fail every scan. That means **the scanner will not save you there** —
a real password typed into `.env.testing` commits silently. It is the single
most likely way this project leaks a credential. Treat those two files as
public.

## Rules

1. Read config through `settings`, never `os.getenv` scattered through the code
   and never a literal in source.
2. Never log a credential. Structured logging (rule 4 in `AGENTS.md`) sends
   `extra=` fields to the log file — a token there is a token on disk. Log
   identifiers, never values.
3. Never put a credential in a commit message, a branch name, a test fixture, a
   docstring, or a code comment. gitleaks scans all of them; the point is that
   it should never need to fire.
4. Never add a path to the `.gitleaks.toml` allowlist to make a scan pass. The
   allowlist exists for files whose contents are provably fake. Widening it is a
   change to the security posture and needs human review.
5. `# nosec`, `# noqa: S105`, and `--no-verify` are not remedies. If a check is
   wrong, say why and ask.

## If a secret was committed

Removing it in a later commit does **not** unleak it — it is in the history, in
every clone, and in any fork or CI cache.

1. **Rotate the credential immediately.** This is the only step that actually
   fixes anything; everything below is cleanup.
2. Tell the user. Do not quietly rewrite history.
3. Only then consider scrubbing history (`git filter-repo`), which rewrites every
   commit hash and breaks every existing clone. A human decides this, never an
   agent.

## Adding a scanner rule

New credential shape that gitleaks misses? Add a `[[rules]]` block to
`.gitleaks.toml` with a `regex`, a `secretGroup`, and a `rules.allowlist` for
known-fake values. Verify it both ways before committing: it must fire on a
planted example and stay silent on the clean tree.
