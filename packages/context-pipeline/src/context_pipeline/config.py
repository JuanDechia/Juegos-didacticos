from __future__ import annotations

import os
import tomllib
from dataclasses import dataclass, field
from pathlib import Path


DEFAULT_OUTPUT_DIR = ".ai_map"
DEFAULT_PROTECTED_ROOTS = ["app/", "tests/"]
DEFAULT_TARGET_DIRS = ["app", "scripts", "tests"]
DEFAULT_ROOT_FILES = ["config.py", "requirements.txt", "run.py", "wsgi.py"]
DEFAULT_EXCLUDED_DIRS = ["__pycache__", "vendor", "node_modules", ".git", ".ai_map", "scratch", "prototypes"]


DEFAULT_DESCRIPTIONS = {
    ".": "Project root configuration and entry points",
    "scripts": "Developer tools and workflow scripts",
    "tests": "Durable automated test files and pytest configurations",
    "app": "Application source root",
}


@dataclass
class PipelineConfig:
    root: Path
    config_path: Path | None = None
    output_dir: str = DEFAULT_OUTPUT_DIR
    protected_roots: list[str] = field(default_factory=lambda: list(DEFAULT_PROTECTED_ROOTS))
    target_dirs: list[str] = field(default_factory=lambda: list(DEFAULT_TARGET_DIRS))
    root_files: list[str] = field(default_factory=lambda: list(DEFAULT_ROOT_FILES))
    excluded_dirs: list[str] = field(default_factory=lambda: list(DEFAULT_EXCLUDED_DIRS))
    command_style: str = "ctx"
    descriptions: dict[str, str] = field(default_factory=lambda: dict(DEFAULT_DESCRIPTIONS))

    @property
    def manifests_dir(self) -> str:
        return os.path.join(self.output_dir, "manifests")

    @property
    def maps_dir(self) -> str:
        return os.path.join(self.output_dir, "maps")


def resolve_root(root: str | None = None) -> Path:
    selected = root or os.environ.get("CTXPIPE_ROOT") or os.getcwd()
    return Path(selected).resolve()


def default_config_path(root: Path) -> Path:
    return root / ".ctxpipe.toml"


def load_config(root: str | None = None, config_path: str | None = None) -> PipelineConfig:
    resolved_root = resolve_root(root)
    path = Path(config_path).resolve() if config_path else default_config_path(resolved_root)
    payload = {}
    if path.exists():
        with path.open("rb") as f:
            payload = tomllib.load(f)

    project = payload.get("project", {})
    ignore = payload.get("ignore", {})
    commands = payload.get("commands", {})
    descriptions = dict(DEFAULT_DESCRIPTIONS)
    descriptions.update(payload.get("descriptions", {}))

    return PipelineConfig(
        root=resolved_root,
        config_path=path if path.exists() else None,
        output_dir=project.get("output_dir", DEFAULT_OUTPUT_DIR),
        protected_roots=list(project.get("protected_roots", DEFAULT_PROTECTED_ROOTS)),
        target_dirs=list(project.get("target_dirs", DEFAULT_TARGET_DIRS)),
        root_files=list(project.get("root_files", DEFAULT_ROOT_FILES)),
        excluded_dirs=list(ignore.get("dirs", DEFAULT_EXCLUDED_DIRS)),
        command_style=commands.get("style", "ctx"),
        descriptions=descriptions,
    )


def _toml_array(values: list[str]) -> str:
    return "[" + ", ".join(f'"{value}"' for value in values) + "]"


def render_default_toml(config: PipelineConfig | None = None) -> str:
    cfg = config or PipelineConfig(root=Path.cwd())
    lines = [
        "[project]",
        f'output_dir = "{cfg.output_dir}"',
        f"protected_roots = {_toml_array(cfg.protected_roots)}",
        f"target_dirs = {_toml_array(cfg.target_dirs)}",
        f"root_files = {_toml_array(cfg.root_files)}",
        "",
        "[ignore]",
        f"dirs = {_toml_array(cfg.excluded_dirs)}",
        "",
        "[commands]",
        f'style = "{cfg.command_style}"',
        "",
        "[descriptions]",
    ]
    for key, value in sorted(cfg.descriptions.items()):
        escaped = value.replace("\\", "\\\\").replace('"', '\\"')
        lines.append(f'"{key}" = "{escaped}"')
    return "\n".join(lines) + "\n"


def write_default_config(root: str | None = None, force: bool = False) -> Path:
    resolved_root = resolve_root(root)
    path = default_config_path(resolved_root)
    if path.exists() and not force:
        return path
    cfg = PipelineConfig(root=resolved_root)
    
    # Auto-detect Node/Vite projects
    if (resolved_root / "package.json").exists():
        cfg.protected_roots = ["src/", "tests/"]
        cfg.target_dirs = ["src", "public", "scripts", "tests"]
        cfg.root_files = ["package.json", "vite.config.ts", "tsconfig.json", "eslint.config.js"]
        cfg.descriptions = {
            ".": "Project root configuration and entry points",
            "src": "Frontend source code",
            "public": "Static public assets",
            "scripts": "Developer tools and workflow scripts",
            "tests": "Durable automated test files and pytest configurations",
        }
        
    path.write_text(render_default_toml(cfg), encoding="utf-8")
    return path
