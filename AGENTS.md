# Agent Guidelines

## Context Pipeline First

Use the Multi-Resolution Context Pipeline for source discovery and source reading. The pipeline keeps agents focused on the task without flooding the context window.

The pipeline is now available as the global `ctx` CLI from the installable package in `packages/context-pipeline/`. The old `python scripts/...` entrypoints remain as compatibility wrappers, but new instructions and generated follow-up commands should prefer `ctx`.

Protected source roots are `app/` and `tests/`, but the source-reading rule applies to the whole workspace.

Do not use raw or native file readers to inspect workspace files. This includes `view_file`, `read_file`, `cat`, `type`, `Get-Content`, `sed`, custom `python -c open(...)` snippets, or any equivalent file-dumping command. Use `ctx read` for focused file reads instead.

Do not use broad raw source search against workspace files. This includes `grep`, `rg`, `Select-String`, `grep_search`, custom search loops, or equivalents. Use `ctx find` for literal or regex discovery instead.

The ban applies to source, tests, scripts, package files, templates, static assets, configuration, documentation, and generated maps/manifests when the goal is to inspect file contents. Shell or terminal tools are still allowed for running `ctx` commands, tests, builds, git/status checks, directory listings, and other non-source operational commands. The pipeline governs reading and discovery, not normal command execution.

### Fluent Read Workflow

- Task entry point: `ctx lens --task "describe the task" --limit 8`
- Symbol or code block: `ctx read <file> --symbol <name>`
- Known line range with map context: `ctx read <file> --start X --end Y --with-map`
- Literal or regex search: `ctx find --pattern "text or regex" --path <file-or-dir> --context N --limit N`
- Search follow-up: use the emitted command with `--expand-from <CTX_TOKEN>`
- Add focused context with `--include imports,decorators,neighbors,top-level,fixtures,routes,template-blocks`
- Refresh maps when needed: `ctx map`
- Check pipeline health: `ctx health`

### Provenance Rules

Valid workspace source reads come from one of these paths: symbol lookup, `--with-map`, a prior manifest grant, a search token, or an expansion token.

If a command prints `CTX_BLOCKED`, follow one of the suggested compliant commands instead of bypassing the pipeline.

If a command prints `CTX_DUPLICATE`, the exact range was already emitted in the session. Do not use `--force` unless the duplicate source text is truly needed.

`--allow-unsafe-read` is for debugging only. It is non-compliant and should not be used for normal task work.

### Editing

After gathering context, use the normal approved editing tool, such as `apply_patch`, for file changes. Do not use raw file-writing scripts to bypass editing conventions.

## Test File Policy

- Put durable automated tests in `tests/`.
- Put shared pytest fixtures in `tests/conftest.py`.
- Do not create test files at the repository root.
- Do not add implementation test files under `app/` unless they are real application templates/routes that are intentionally served.
- Put temporary probes, one-off scripts, local benchmarks, and exploratory validation in `scratch/`.
- Put visual prototypes and non-runtime HTML experiments in `prototypes/`.
- Before finishing a task, move useful regression coverage from `scratch/` into `tests/` and leave throwaway generated outputs untracked.

`pytest.ini` is configured to collect tests from `tests/` only. Keep that convention unless the project deliberately changes its test runner layout.

## Commit And Deploy Expectations

- Commit meaningful tests in `tests/` with the code change they protect.
- Commit useful development tools in `scratch/` or `prototypes/` only when they have ongoing value.
- Do not commit generated caches, coverage output, logs, media uploads, or temporary debug artifacts.
- Production Docker builds should rely on `.dockerignore` so development-only files are not copied into the runtime image.

## Project Skeleton Map

> [!IMPORTANT]
> Use this generated map before directory exploration.
> For task-oriented discovery, prefer `ctx lens --task "..." --limit 8`.
- `src/` — Frontend source code (React/Vite)
  - `src/assets/` — src/assets directory
  - `src/content/` — src/content directory
    - `src/content/lessons/` — src/content/lessons directory
    - `src/content/questionSets/` — src/content/questionSets directory
  - `src/core/` — src/core directory
  - `src/economy/` — src/economy directory
  - `src/education/` — src/education directory
  - `src/enemies/` — src/enemies directory
  - `src/environment/` — src/environment directory
    - `src/environment/materials/` — src/environment/materials directory
  - `src/gameplay/` — src/gameplay directory
  - `src/rounds/` — src/rounds directory
  - `src/ui/` — src/ui directory
  - `src/ui3d/` — src/ui3d directory
  - `src/utils/` — src/utils directory
  - `src/weapons/` — src/weapons directory
- `tests/` — Durable automated test files and pytest configurations

*Auto-generated by `ctx map`.*
