# backend/config — agent notes

Scoped rules for this folder. The root `AGENTS.md` still applies; this adds what
is only true here. `CLAUDE.md` is a symlink to this file.

## Env files: what is tracked and what is not

`.gitignore` in this folder ignores every env file, then names two exceptions:

```
# Per-environment files hold real credentials — never tracked.
envs/.env*

# Exceptions: the template, and dummy testing values so CI can boot the app.
!envs/.env.example
!envs/.env.testing
```

| File | Tracked? | Why |
|---|---|---|
| `envs/.env.example` | **yes** | The template. Dummy values only. |
| `envs/.env.testing` | **yes** | `make test` boots the app with it. Dummy values only. |
| `envs/.env.development` | no | Ignored by `envs/.env*`. |
| `envs/.env.<anything else>` | no | Ignored by `envs/.env*`. |
| `.env` | **yes** | Selects `APP_ENV`. Holds no credentials — keep it that way. |

The two negated files are ordinary tracked files: `git add` stages them without
complaint. So a real credential written into `.env.example` or `.env.testing`
**will be committed silently** — the ignore rule deliberately exempts them, and
`make check` does not stop it either, because both paths are allowlisted in
`.gitleaks.toml`. These two files are the one place in the repo where the
tooling cannot save you. Read them before you edit them; keep every value fake.

To add a real environment: create `envs/.env.<name>` and leave it untracked. It
is ignored automatically. Never `git add -f` a file under `envs/`.

## Settings

- Add configuration as a typed field on `Settings` in `settings.py`. Read it
  through the `settings` singleton — never `os.getenv` elsewhere in the app.
- **A new field without a default breaks every environment that lacks it**,
  including a teammate's untracked `.env.development`. Give a default when the
  value is optional; when it is genuinely required, add it to `.env.example` and
  `.env.testing` in the same commit and say so in the commit body.
- Derived values belong in a `@property` (see `data_path`), not in a field —
  they are not read from the environment.

## Paths resolve against the working directory

`settings.py` builds `config/.env` and `config/envs/.env.<APP_ENV>` as
**relative** paths, so every backend command must run from `backend/`. The
`Makefile` handles this; running `pytest` from the repo root does not.

If `config/envs/.env.<APP_ENV>` is missing, the module raises `FileNotFoundError`
at **import time** — the app does not boot and there is no clean startup error.
A confusing import-time crash in a new environment is almost always this.
