#!/usr/bin/env python3
"""Health checks for the Multi-Resolution Context Pipeline."""

from __future__ import annotations

import json
import os
import subprocess
import sys

from . import core as ctx
from . import generator


ROOT = os.path.abspath(os.environ.get("CTXPIPE_ROOT") or os.getcwd())


def _rel(path: str) -> str:
    try:
        return os.path.relpath(path, ROOT).replace("\\", "/")
    except ValueError:
        return path


def _load_json(path: str):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def _codex_hook_commands() -> list[str]:
    """Extract command strings from .codex/hooks.json (Codex schema)."""
    hooks = _load_json(os.path.join(ROOT, ".codex", "hooks.json")) or {}
    commands = []
    for hook_group in hooks.get("hooks", {}).values():
        for entry in hook_group:
            for hook in entry.get("hooks", []):
                command = hook.get("command")
                if command:
                    commands.append(command)
    return commands


def _antigravity_hook_commands() -> list[str]:
    """Extract command strings from .agents/hooks.json (Antigravity schema).

    Antigravity schema: top-level keys are hook-group names (not a wrapping
    "hooks" object).  Each group maps event names to handler arrays.

    PostToolUse entries: [{"matcher": "...", "hooks": [{"command": "..."}]}]
    PreInvocation / PostInvocation / Stop entries: [{"command": "..."}] directly.
    """
    payload = _load_json(os.path.join(ROOT, ".agents", "hooks.json")) or {}
    commands = []
    for group_cfg in payload.values():
        if not isinstance(group_cfg, dict):
            continue
        # Skip the optional top-level "enabled" boolean
        for event_name, handlers in group_cfg.items():
            if event_name == "enabled" or not isinstance(handlers, list):
                continue
            for handler in handlers:
                if not isinstance(handler, dict):
                    continue
                # Pattern A: handler has an inner "hooks" array (PostToolUse / PreToolUse)
                if "hooks" in handler:
                    for hook in handler["hooks"]:
                        cmd = hook.get("command")
                        if cmd:
                            commands.append(cmd)
                else:
                    # Pattern B: handler is the hook directly (PreInvocation etc.)
                    cmd = handler.get("command")
                    if cmd:
                        commands.append(cmd)
    return commands


def _antigravity_checks() -> dict:
    """Return a dict of Antigravity-specific health facts."""
    agents_dir = os.path.join(ROOT, ".agents")
    hooks_path = os.path.join(agents_dir, "hooks.json")
    wrapper_path = os.path.join(agents_dir, "ctx-hook.cmd")
    venv_ctx_path = os.path.join(ROOT, ".venv", "Scripts", "ctx.exe")

    hooks_exist = os.path.isfile(hooks_path)
    wrapper_exists = os.path.isfile(wrapper_path)
    venv_ctx_exists = os.path.isfile(venv_ctx_path)

    commands = _antigravity_hook_commands()
    # A healthy Antigravity hook must reference the wrapper script, not bare "ctx hook".
    uses_wrapper = bool(commands) and all(
        ("ctx-hook.cmd" in cmd or "ctx-hook.sh" in cmd)
        for cmd in commands
    )
    has_bare_ctx_hook = any(cmd.strip() == "ctx hook" for cmd in commands)

    return {
        "antigravity_hooks_json_exists": hooks_exist,
        "antigravity_wrapper_exists": wrapper_exists,
        "antigravity_venv_ctx_exists": venv_ctx_exists,
        "antigravity_hook_commands": commands,
        "antigravity_hook_uses_wrapper": uses_wrapper,
        "antigravity_hook_has_bare_ctx": has_bare_ctx_hook,
    }


def _tracked(path: str) -> bool | None:
    try:
        result = subprocess.run(
            [
                "git",
                "-c",
                f"safe.directory={ROOT.replace(os.sep, '/')}",
                "ls-files",
                "--error-unmatch",
                path,
            ],
            cwd=ROOT,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=False,
        )
    except Exception:
        return None
    return result.returncode == 0


def _manifest_source(path: str) -> str | None:
    manifest = _load_json(path)
    if not isinstance(manifest, dict):
        return None
    source = manifest.get("file_path")
    if not source:
        return None
    return os.path.join(ROOT, source)


def _stale_manifests() -> list[str]:
    manifests_dir = os.path.join(ROOT, generator.MANIFESTS_DIR)
    stale = []
    if not os.path.isdir(manifests_dir):
        return stale
    for root, _, files in os.walk(manifests_dir):
        for file in files:
            if not file.endswith(".json"):
                continue
            path = os.path.join(root, file)
            source = _manifest_source(path)
            if source and not os.path.exists(source):
                stale.append(_rel(path))
    return sorted(stale)


def _stale_maps() -> list[str]:
    maps_dir = os.path.join(ROOT, generator.MAPS_DIR)
    if not os.path.isdir(maps_dir):
        return []

    expected = set()
    if os.path.isdir(os.path.join(ROOT, generator.MANIFESTS_DIR)):
        for root, _, files in os.walk(os.path.join(ROOT, generator.MANIFESTS_DIR)):
            if any(file.endswith(".json") for file in files):
                rel_dir = os.path.relpath(root, os.path.join(ROOT, generator.MANIFESTS_DIR))
                if rel_dir == ".":
                    key = "root"
                else:
                    key = generator._dir_to_map_key(rel_dir.replace("\\", "/"))
                expected.add(f"{key}_map.json")

    stale = []
    for file in os.listdir(maps_dir):
        if file.endswith("_map.json") and file not in expected:
            stale.append(_rel(os.path.join(maps_dir, file)))
    return sorted(stale)


def _home_codex_leftovers() -> list[str]:
    home = os.path.expanduser("~")
    codex_home = os.path.join(home, ".codex")
    candidates = [
        os.path.join(codex_home, "AGENTS.md"),
        os.path.join(codex_home, "config.toml.headroom-backup"),
        os.path.join(codex_home, "config.toml.before-headroom-unroot-20260614-122414"),
    ]
    leftovers = [path for path in candidates if os.path.exists(path)]
    try:
        for name in os.listdir(codex_home):
            lowered = name.lower()
            if any(term in lowered for term in ("headroom", "rtk", "serena")):
                full = os.path.join(codex_home, name)
                if full not in leftovers:
                    leftovers.append(full)
    except Exception:
        pass
    return sorted(_rel(path) if path.startswith(ROOT) else path for path in leftovers)


def _session_summary() -> dict:
    hint = ctx.read_session_hint()
    default_path = os.path.join(ROOT, ctx.session_path("default"))
    default_size = os.path.getsize(default_path) if os.path.exists(default_path) else 0
    session_dir = os.path.join(ROOT, ctx.SESSION_DIR)
    session_count = 0
    if os.path.isdir(session_dir):
        session_count = len([name for name in os.listdir(session_dir) if name.endswith(".jsonl")])
    return {
        "current_hint": hint.get("session") if hint else None,
        "default_session_bytes": default_size,
        "session_files": session_count,
    }


def collect_health() -> dict:
    generator.configure_from_project(ROOT)
    codex_commands = _codex_hook_commands()
    js_available, js_reason = generator.js_analyzer_status()
    antigravity = _antigravity_checks()
    return {
        # --- Codex hook facts (kept for backward compatibility) ---
        "hook_commands": codex_commands,
        "hook_uses_wrapper": bool(codex_commands) and all(
            ("ctx hook" in command or "ai_map_hook.py" in command)
            for command in codex_commands
        ),
        # --- Antigravity hook facts ---
        **antigravity,
        # --- Shared pipeline facts ---
        "hook_state_exists": os.path.exists(os.path.join(ROOT, generator.OUTPUT_DIR, "hook_state.json")),
        "js_analyzer_available": js_available,
        "js_analyzer_reason": js_reason,
        "stale_manifests": _stale_manifests(),
        "stale_maps": _stale_maps(),
        "agents_md_tracked": _tracked("AGENTS.md"),
        "home_codex_leftovers": _home_codex_leftovers(),
        "session": _session_summary(),
    }


def main(argv=None) -> int:
    import argparse
    parser = argparse.ArgumentParser(description="Check Multi-Resolution Context Pipeline health.")
    parser.add_argument("--json", action="store_true", help="Emit JSON")
    parser.add_argument("--root", help="Project root")
    args = parser.parse_args(argv)
    global ROOT
    if args.root:
        ROOT = os.path.abspath(args.root)
        os.environ["CTXPIPE_ROOT"] = ROOT
    health = collect_health()
    if args.json:
        print(json.dumps(health, indent=2))
        return 0
    print("AI Map Health")
    print("")
    print("  [Codex hook]")
    print(f"    Hook wrapper active : {health['hook_uses_wrapper']}")
    print(f"    Hook commands       : {health['hook_commands'] or '<none>'}")
    print("")
    print("  [Antigravity hook]")
    print(f"    hooks.json exists   : {health['antigravity_hooks_json_exists']}")
    print(f"    ctx-hook.cmd exists : {health['antigravity_wrapper_exists']}")
    print(f"    .venv/ctx.exe found : {health['antigravity_venv_ctx_exists']}")
    print(f"    Uses wrapper (cmd)  : {health['antigravity_hook_uses_wrapper']}")
    print(f"    Bare 'ctx hook' cmd : {health['antigravity_hook_has_bare_ctx']}")
    print(f"    Hook commands       : {health['antigravity_hook_commands'] or '<none>'}")
    print("")
    print("  [Pipeline]")
    print(f"    Hook state exists   : {health['hook_state_exists']}")
    print(f"    JS analyzer         : {health['js_analyzer_available']}")
    if not health["js_analyzer_available"]:
        print(f"    JS analyzer reason  : {health['js_analyzer_reason']}")
    print(f"    AGENTS.md tracked   : {health['agents_md_tracked']}")
    print(f"    Stale manifests     : {len(health['stale_manifests'])}")
    for path in health["stale_manifests"][:10]:
        print(f"      - {path}")
    print(f"    Stale maps          : {len(health['stale_maps'])}")
    for path in health["stale_maps"][:10]:
        print(f"      - {path}")
    print(f"    Home Codex leftovers: {len(health['home_codex_leftovers'])}")
    for path in health["home_codex_leftovers"][:10]:
        print(f"      - {path}")
    print("")
    print("  [Session]")
    print(f"    Current hint        : {health['session']['current_hint'] or '<none>'}")
    print(f"    Default session size: {health['session']['default_session_bytes']} bytes")
    print(f"    Session files       : {health['session']['session_files']}")

    antigravity_unhealthy = (
        not health["antigravity_hooks_json_exists"]
        or not health["antigravity_wrapper_exists"]
        or not health["antigravity_venv_ctx_exists"]
        or not health["antigravity_hook_uses_wrapper"]
        or health["antigravity_hook_has_bare_ctx"]
    )
    pipeline_unhealthy = (
        bool(health["stale_manifests"])
        or bool(health["stale_maps"])
        or bool(health["home_codex_leftovers"])
        or health["agents_md_tracked"] is False
    )
    return 1 if (antigravity_unhealthy or pipeline_unhealthy) else 0


if __name__ == "__main__":
    raise SystemExit(main())
