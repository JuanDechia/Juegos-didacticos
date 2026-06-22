## Context Pipeline First

Use the Multi-Resolution Context Pipeline for source discovery and focused source reading.

### Fluent Read Workflow

- Task entry point: `ctx lens --task "describe the task" --limit 8`
- Symbol or code block: `ctx read <file> --symbol <name>`
- Known line range with map context: `ctx read <file> --start X --end Y --with-map`
- Literal or regex search: `ctx find --pattern "text or regex" --path <file-or-dir> --context N --limit N`
- Search follow-up: use the emitted command with `--expand-from <CTX_TOKEN>`
- Session handling is automatic after `ctx lens`; add `--session` only when resuming an older session, disambiguating a token, or running deterministic tests/CI.

### Provenance Rules

If a command prints `CTX_BLOCKED`, follow one of the suggested compliant commands instead of bypassing the pipeline.

If a command prints `CTX_DUPLICATE`, the exact range was already emitted in the session. Do not use `--force` unless the duplicate source text is truly needed.
