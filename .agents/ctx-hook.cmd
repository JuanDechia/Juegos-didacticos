@echo off
setlocal

REM -----------------------------------------------------------------------
REM ctx-hook.cmd  --  Antigravity IDE hook wrapper for the ctx map-refresh.
REM
REM Fail-open design:
REM   * Always exits with code 0 so a broken ctx never blocks agent startup.
REM   * Always emits exactly {} to stdout (valid JSON, as required by the
REM     Antigravity hook I/O contract for PostToolUse / PreInvocation).
REM   * ctx output (including any "AI map unchanged" banner) goes to stderr
REM     so it never corrupts the JSON channel.
REM
REM Recovery note:
REM   If this hook somehow breaks agent startup, disable it by either:
REM     (a) Renaming .agents\hooks.json  ->  .agents\hooks.json.disabled
REM     (b) Setting the hook group "enabled": false in hooks.json
REM -----------------------------------------------------------------------

REM Resolve repo root: the .agents\ folder is one level below the repo root.
REM %~dp0 expands to the directory of THIS script, which is .agents\.
set "REPO_ROOT=%~dp0.."

REM Resolve the expected venv ctx path relative to the repo root.
set "CTX_EXE=%REPO_ROOT%\.venv\Scripts\ctx.exe"

if exist "%CTX_EXE%" (
    REM Run ctx hook; redirect its stdout to stderr so only {} reaches stdout.
    "%CTX_EXE%" hook 1>&2
    REM Always succeed and emit the required empty JSON object.
    echo {}
    exit /b 0
)

REM ctx not found -- log to stderr, still emit valid JSON and exit cleanly.
echo ctx-hook: "%CTX_EXE%" not found; skipping context refresh 1>&2
echo {}
exit /b 0
