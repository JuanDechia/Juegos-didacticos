#!/usr/bin/env python3
"""Tiny stdio JSON-RPC wrapper for context pipeline tools.

This intentionally avoids external dependencies. It supports newline-delimited
JSON requests with shape:
  {"id": 1, "method": "read_symbol", "params": {...}}
"""

import json
import os
import sys

from . import core as ctx
from . import find_literals
from . import find_symbol
from . import lens


def _response(request_id, result=None, error=None):
    payload = {"jsonrpc": "2.0", "id": request_id}
    if error:
        payload["error"] = {"code": -32000, "message": str(error)}
    else:
        payload["result"] = result
    return payload


def read_manifest(file: str, session: str = "default") -> dict:
    manifest, manifest_path = ctx.load_manifest(file)
    if not manifest:
        return {"status": "missing", "file": ctx.rel_path_for(file), "manifest": manifest_path}
    ctx.append_event(session, {"type": "manifest", "file": ctx.rel_path_for(file), "path": manifest_path})
    return {
        "status": "ready",
        "file": ctx.rel_path_for(file),
        "manifest": manifest_path,
        "text": ctx.compact_manifest_text(manifest_path, manifest),
    }


def read_range(file: str, start: int, end: int, session: str = "default", include: str = "", expand_from: str | None = None) -> dict:
    manifest, _ = ctx.load_manifest(file)
    lines = ctx.read_lines(file)
    base = [ctx.Range(start, min(end, len(lines)), "range")]
    if expand_from:
        grant = ctx.find_grant(session, expand_from)
        if not grant:
            return {"status": "blocked", "reason": "unknown_expand_token", "token": expand_from}
        base = [ctx.Range(r["start"], r["end"], r.get("reason", "grant")) for r in grant.get("ranges", [])]
    ranges = ctx.include_ranges(file, base, include.split(",") if include else [], manifest)
    if ctx.is_protected_source(file) and not (expand_from or ctx.has_manifest_grant(session, file)):
        return {"status": "blocked", "reason": "missing_manifest_or_provenance", "suggested": ctx.suggested_commands(file, start, end)}
    token = ctx.token_for(file, ranges, "mcp_range", session)
    text, metadata = ctx.render_source(file, ranges)
    ctx.append_event(session, ctx.grant_event(file, ranges, "mcp_range", token))
    ctx.record_read(session, file, ranges, token, metadata)
    return {"status": "ready", "token": token, "text": text, "metadata": metadata}


def read_symbol(file: str, symbol: str, session: str = "default", include: str = "") -> dict:
    matches = find_symbol.find_symbol_live(file, symbol)
    if not matches:
        return {"status": "missing", "file": ctx.rel_path_for(file), "symbol": symbol}
    _, _, start, end = matches[0]
    manifest, _ = ctx.load_manifest(file)
    ranges = ctx.include_ranges(file, [ctx.Range(start, end, "symbol")], include.split(",") if include else [], manifest)
    token = ctx.token_for(file, ranges, "mcp_symbol", session)
    text, metadata = ctx.render_source(file, ranges)
    ctx.append_event(session, ctx.grant_event(file, ranges, "mcp_symbol", token))
    ctx.record_read(session, file, ranges, token, metadata)
    return {
        "status": "ready",
        "token": token,
        "text": ctx.breadcrumb_text(file, manifest, start, end, symbol) + "\n" + text,
        "metadata": metadata,
    }


def read_imports(file: str, session: str = "default") -> dict:
    ranges = ctx.import_ranges(file, ctx.read_lines(file))
    token = ctx.token_for(file, ranges, "mcp_imports", session)
    text, metadata = ctx.render_source(file, ranges)
    ctx.append_event(session, ctx.grant_event(file, ranges, "mcp_imports", token))
    ctx.record_read(session, file, ranges, token, metadata)
    return {"status": "ready", "token": token, "text": text, "metadata": metadata}


def search(pattern: str, path: str = "app", session: str = "default", context: int = 2, limit: int = 20, regex: bool = False) -> dict:
    class Args:
        pass
    args = Args()
    args.pattern = pattern
    args.path = path
    args.dir = path
    args.ext = None
    args.exclude = "vendor,node_modules,.venv,.git,__pycache__"
    args.limit_per_file = limit
    args.limit_total = limit
    args.limit = limit
    args.context = context
    args.regex = regex
    args.ignore_case = False
    args.json = True
    args.out = None
    args.session = session
    from io import StringIO
    from contextlib import redirect_stdout
    buf = StringIO()
    with redirect_stdout(buf):
        find_literals.scan_literals(args)
    return {"status": "ready", "json_text": buf.getvalue()}


def task_lens(task: str, limit: int = 8) -> dict:
    return {"status": "ready", "results": lens.recommend(task, limit)}


METHODS = {
    "read_manifest": read_manifest,
    "read_symbol": read_symbol,
    "read_range": read_range,
    "search": search,
    "task_lens": task_lens,
    "read_imports": read_imports,
}


def handle(request: dict) -> dict:
    method = request.get("method")
    params = request.get("params") or {}
    if method not in METHODS:
        return _response(request.get("id"), error=f"Unknown method: {method}")
    try:
        return _response(request.get("id"), result=METHODS[method](**params))
    except Exception as exc:
        return _response(request.get("id"), error=exc)


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(errors="replace")
    for line in sys.stdin:
        if not line.strip():
            continue
        try:
            request = json.loads(line)
            print(json.dumps(handle(request)), flush=True)
        except Exception as exc:
            print(json.dumps(_response(None, error=exc)), flush=True)


if __name__ == "__main__":
    main()
