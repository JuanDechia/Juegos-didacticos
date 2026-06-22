from __future__ import annotations

import argparse
import os
import sys

from . import core
from .config import load_config


def _configure(root: str | None = None, config_path: str | None = None):
    cfg = load_config(root, config_path)
    os.environ["CTXPIPE_ROOT"] = str(cfg.root)
    os.chdir(cfg.root)
    core.configure(str(cfg.root), cfg.protected_roots, cfg.output_dir)
    return cfg


def _run_module_main(module, argv):
    old_argv = sys.argv
    sys.argv = [old_argv[0]] + list(argv)
    try:
        result = module.main()
    finally:
        sys.argv = old_argv
    return 0 if result is None else int(result)


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(prog="ctx", description="Multi-Resolution Context Pipeline")
    parser.add_argument("--root", help="Project root")
    parser.add_argument("--config", help="Path to .ctxpipe.toml")
    sub = parser.add_subparsers(dest="command", required=True)

    init_parser = sub.add_parser("init", help="Initialize context pipeline files in a project")
    init_parser.add_argument("--force", action="store_true")
    init_parser.add_argument("--codex", action="store_true")
    init_parser.add_argument("--update-agents", action="store_true")

    map_parser = sub.add_parser("map", help="Generate .ai_map files")
    map_parser.add_argument("--check", action="store_true")

    lens_parser = sub.add_parser("lens", help="Recommend focused source entry points")
    lens_parser.add_argument("--task", required=True)
    lens_parser.add_argument("--limit", type=int, default=8)
    lens_parser.add_argument("--session")
    lens_parser.add_argument("--json", action="store_true")

    read_parser = sub.add_parser("read", help="Read focused source ranges")
    read_parser.add_argument("file_path", nargs="?")
    read_parser.add_argument("--start", type=int, default=1)
    read_parser.add_argument("--end", type=int)
    read_parser.add_argument("--symbol")
    read_parser.add_argument("-i", "--ignore-case", action="store_true")
    read_parser.add_argument("-m", "--with-map", action="store_true")
    read_parser.add_argument("--context", choices=["none", "breadcrumb", "manifest", "auto"], default="auto")
    read_parser.add_argument("--include", default="")
    read_parser.add_argument("--before", type=int, default=0)
    read_parser.add_argument("--after", type=int, default=0)
    read_parser.add_argument("--expand-from")
    read_parser.add_argument("--session")
    read_parser.add_argument("--json", action="store_true")
    read_parser.add_argument("--force", action="store_true")
    read_parser.add_argument("--allow-unsafe-read", action="store_true")
    read_parser.add_argument("--ignore-session-hint", action="store_true")
    read_parser.add_argument("--whole-if-small", type=int)
    read_parser.add_argument("--read", action="append", default=[])
    read_parser.add_argument("--file", dest="file_alias")
    read_parser.add_argument("--batch")

    find_parser = sub.add_parser("find", help="Find literals or regex patterns")
    find_parser.add_argument("--pattern", "-p", default=r"#[0-9a-fA-F]{3,8}")
    find_parser.add_argument("--path", nargs="+")
    find_parser.add_argument("--dir", nargs="+")
    find_parser.add_argument("--ext", "-e")
    find_parser.add_argument("--exclude", "-x", default="vendor,node_modules,.venv,.git,__pycache__")
    find_parser.add_argument("--limit-per-file", type=int, default=15)
    find_parser.add_argument("--limit-total", "-l", type=int, default=100)
    find_parser.add_argument("--limit", type=int)
    find_parser.add_argument("--context", type=int, default=2)
    find_parser.add_argument("--regex", action="store_true", default=True)
    find_parser.add_argument("--literal", dest="regex", action="store_false")
    find_parser.add_argument("--session")
    find_parser.add_argument("--ignore-session-hint", action="store_true")
    find_parser.add_argument("--emit-source", action="store_true")
    find_parser.add_argument("--allow-noisy-source", action="store_true")
    find_parser.add_argument("--emit-source-max-files", type=int, default=5)
    find_parser.add_argument("--emit-source-max-lines", type=int, default=120)
    find_parser.add_argument("--group-followups", action="store_true")
    find_parser.add_argument("--ignore-case", "-i", action="store_true")
    find_parser.add_argument("--json", "-j", action="store_true")
    find_parser.add_argument("--out", "-o")

    symbol_parser = sub.add_parser("symbol", help="Find a symbol range")
    symbol_parser.add_argument("file_path")
    symbol_parser.add_argument("symbol_name")
    symbol_parser.add_argument("-i", "--ignore-case", action="store_true")

    health_parser = sub.add_parser("health", help="Check pipeline health")
    health_parser.add_argument("--json", action="store_true")

    sub.add_parser("hook", help="Refresh maps if indexed files changed")
    sub.add_parser("mcp", help="Run stdio JSON-RPC MCP-style server")

    compliance_parser = sub.add_parser("compliance", help="Analyze context pipeline compliance")
    compliance_parser.add_argument("args", nargs=argparse.REMAINDER)

    args = parser.parse_args(argv)

    if args.command == "init":
        from .installer import init_project
        cfg = _configure(args.root, args.config)
        written = init_project(str(cfg.root), args.force, args.codex, args.update_agents)
        for path in written:
            print(f"ctx init wrote {path}")
        return 0

    cfg = _configure(args.root, args.config)

    if args.command == "map":
        from . import generator
        if args.check:
            from . import health
            return health.main(["--root", str(cfg.root)])
        generator.apply_config(cfg)
        generator.generate_maps()
        return 0
    if args.command == "lens":
        from . import lens
        lens_args = ["--task", args.task, "--limit", str(args.limit)]
        if args.session:
            lens_args += ["--session", args.session]
        if args.json:
            lens_args.append("--json")
        return _run_module_main(lens, lens_args)
    if args.command == "read":
        from . import read
        read_args = []
        if args.file_path:
            read_args.append(args.file_path)
        for name in ["start", "end", "symbol", "context", "include", "before", "after", "expand_from", "session", "whole_if_small", "batch"]:
            value = getattr(args, name)
            if value is not None and not (name in {"start", "before", "after"} and value in {1, 0}):
                read_args += ["--" + name.replace("_", "-"), str(value)]
        for spec in args.read:
            read_args += ["--read", spec]
        if args.file_alias:
            read_args += ["--file", args.file_alias]
        for flag in ["ignore_case", "with_map", "json", "force", "allow_unsafe_read", "ignore_session_hint"]:
            if getattr(args, flag):
                read_args.append("--" + flag.replace("_", "-"))
        return _run_module_main(read, read_args)
    if args.command == "find":
        from . import find_literals
        return find_literals.scan_literals(args) or 0
    if args.command == "symbol":
        from . import find_symbol
        find_symbol.find_symbol(args.file_path, args.symbol_name, args.ignore_case)
        return 0
    if args.command == "health":
        from . import health
        health_args = ["--root", str(cfg.root)]
        if args.json:
            health_args.append("--json")
        return health.main(health_args)
    if args.command == "hook":
        from . import hook
        return hook.main([])
    if args.command == "mcp":
        from . import mcp_server
        mcp_server.main()
        return 0
    if args.command == "compliance":
        from . import compliance
        return _run_module_main(compliance, args.args)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
