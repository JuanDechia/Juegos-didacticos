# Antigravity IDE Hook Installation Guide (Windows)

This guide describes how to correctly set up the Multi-Resolution Context Pipeline hook for Antigravity IDE on Windows machines.

## The Problem

On Windows, Antigravity may run hook commands in a shell where the Python package console script `ctx` is not on the `PATH`. If `.agents/hooks.json` contains a bare command like `"command": "ctx hook"`, agent execution can fail completely with an error like:
`'ctx' is not recognized as an internal or external command`

When this happens, the agent execution fails before the agent can even attempt to fix it.

## Requirements & Two-Phase Setup

To avoid this failure mode, hook installation must be treated as a strict two-phase setup:

1. **Phase 1:** Install/verify the CLI and write a project-local hook wrapper script.
2. **Phase 2:** Enable `.agents/hooks.json` only *after* the wrapper is created and verified.

**CRITICAL:** Do **NOT** use a bare `ctx hook` command directly in `.agents/hooks.json`.

---

## Step 1: Create the Project-Local Hook Wrapper

Create a fail-open Windows batch wrapper at `.agents/ctx-hook.cmd`. This wrapper ensures we run from the project root and explicitly calls the Python virtual environment executable.

```bat
@echo off
setlocal
cd /d "%~dp0.."

if exist ".venv\Scripts\ctx.exe" (
  ".venv\Scripts\ctx.exe" hook
  exit /b 0
)

echo {}
exit /b 0
```

> **Note:** The script guarantees that it will exit with `0` and print valid JSON to `stdout`, satisfying the Antigravity hook contract even if the CLI is missing or uninstalled.

---

## Step 2: Configure Antigravity Hooks

After verifying the wrapper script works, configure the hook in `.agents/hooks.json`.

Antigravity expects hooks to be placed in `hooks.json` within your customization directory (e.g., `.agents/`). The schema maps top-level hook group names to event configurations.

We use **absolute paths** to invoke the wrapper to guarantee it runs correctly regardless of the shell's starting directory.

For example, assuming the workspace root is `C:\Users\angel\Juegos-didacticos`:

```json
{
  "context-pipeline": {
    "PostToolUse": [
      {
        "matcher": ".*",
        "hooks": [
          {
            "command": "C:\\Users\\angel\\Juegos-didacticos\\.agents\\ctx-hook.cmd"
          }
        ]
      }
    ],
    "PreInvocation": [
      {
        "command": "C:\\Users\\angel\\Juegos-didacticos\\.agents\\ctx-hook.cmd"
      }
    ]
  }
}
```

### Understanding the Antigravity Hook Schema

Based on the official Antigravity IDE documentation:

*   **File Location**: `.agents/hooks.json`
*   **Hook Definition**: Top-level keys are your custom hook names (e.g., `"context-pipeline"`). You do not nest them under a `hooks` key.
*   **PostToolUse**: Fires after a tool completes. It uses a `matcher` to specify which tools trigger it. `".*"` or `"*"` matches all tools. The handlers go inside a nested `hooks` array.
*   **PreInvocation**: Fires before the model is called. It does not use a `matcher` and defines handlers directly as an array of command objects.
*   **Input/Output Contract**: Hooks receive JSON on `stdin` and must output JSON on `stdout`. The wrapper script ensures that `stdout` is always a valid JSON object (`{}`).

## Troubleshooting

If `ctx health` reports exit code 1 due to `Antigravity hook`, check the following:
- Verify that `.agents/hooks.json` does not contain bare `"ctx hook"` commands.
- Ensure the wrapper `ctx-hook.cmd` exists and is referenced correctly by its absolute path.
- Ensure `.venv/Scripts/ctx.exe` exists and is functional.
