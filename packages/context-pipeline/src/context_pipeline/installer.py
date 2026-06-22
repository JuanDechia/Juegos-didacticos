from __future__ import annotations

import json
import os
import shutil
from importlib import resources
from pathlib import Path

from .config import load_config, write_default_config


def _template_text(name: str) -> str:
    return resources.files("context_pipeline.templates").joinpath(name).read_text(encoding="utf-8")


def _replace_section(content: str, heading: str, replacement: str) -> str:
    marker = heading.strip()
    start = content.find(marker)
    if start == -1:
        return content.rstrip() + "\n\n" + replacement.rstrip() + "\n"
    next_start = content.find("\n## ", start + len(marker))
    if next_start == -1:
        return content[:start].rstrip() + "\n\n" + replacement.rstrip() + "\n"
    return content[:start].rstrip() + "\n\n" + replacement.rstrip() + "\n" + content[next_start:]


def update_agents(root: Path) -> Path:
    path = root / "AGENTS.md"
    existing = path.read_text(encoding="utf-8") if path.exists() else "# Agent Guidelines\n"
    section = _template_text("AGENTS.pipeline.md")
    path.write_text(_replace_section(existing, "## Context Pipeline First", section), encoding="utf-8")
    return path


def _replace_legacy_hook_commands(value):
    if isinstance(value, dict):
        replaced = {}
        for key, item in value.items():
            if key == "command" and isinstance(item, str) and "scripts/ai_map_hook.py" in item:
                replaced[key] = "ctx hook"
            else:
                replaced[key] = _replace_legacy_hook_commands(item)
        return replaced
    if isinstance(value, list):
        return [_replace_legacy_hook_commands(item) for item in value]
    return value


def _default_hooks() -> dict:
    return json.loads(_template_text("hooks.codex.json"))


def _has_ctx_hook(entries: list[dict]) -> bool:
    for entry in entries:
        for hook in entry.get("hooks", []):
            if hook.get("command") == "ctx hook":
                return True
    return False


def _ensure_hook_group(payload: dict, name: str, default_entries: list[dict]) -> None:
    hooks = payload.setdefault("hooks", {})
    entries = hooks.setdefault(name, [])
    if not _has_ctx_hook(entries):
        entries.extend(default_entries)


def update_codex_hooks(root: Path) -> Path:
    codex_dir = root / ".codex"
    codex_dir.mkdir(exist_ok=True)
    path = codex_dir / "hooks.json"
    defaults = _default_hooks()
    if path.exists():
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            backup = path.with_suffix(path.suffix + ".bak")
            shutil.copy2(path, backup)
            payload = {}
    else:
        payload = {}
    payload = _replace_legacy_hook_commands(payload)
    for group, entries in defaults["hooks"].items():
        _ensure_hook_group(payload, group, entries)
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    return path


def init_project(root: str | None = None, force: bool = False, codex: bool = False, update_agents_file: bool = False) -> list[Path]:
    cfg = load_config(root)
    root_path = cfg.root
    written = [write_default_config(str(root_path), force=force)]
    if update_agents_file:
        written.append(update_agents(root_path))
    if codex:
        written.append(update_codex_hooks(root_path))
    return written
