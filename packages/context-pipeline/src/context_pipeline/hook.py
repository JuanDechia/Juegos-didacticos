#!/usr/bin/env python3
"""Debounced hook wrapper for the AI map generator."""

from __future__ import annotations

import hashlib
import json
import os
import subprocess
import sys

from . import generator


def state_path():
    return os.path.join(generator.OUTPUT_DIR, "hook_state.json")


def _iter_indexed_files():
    excluded = generator.EXCLUDED_DIRS
    extensions = generator.INDEXED_EXTENSIONS

    for target_dir in generator.TARGET_DIRS:
        if not os.path.isdir(target_dir):
            continue
        for root, dirs, files in os.walk(target_dir):
            dirs[:] = sorted(d for d in dirs if d not in excluded)
            for file in sorted(files):
                if os.path.splitext(file)[1].lower() in extensions:
                    yield os.path.join(root, file)

    for file in generator.ROOT_FILES:
        if os.path.isfile(file):
            yield file


def _fingerprint():
    digest = hashlib.sha256()
    count = 0
    for path in sorted(_iter_indexed_files(), key=lambda p: p.replace("\\", "/").lower()):
        try:
            stat = os.stat(path)
        except OSError:
            continue
        rel_path = os.path.relpath(path, ".").replace("\\", "/")
        digest.update(rel_path.encode("utf-8", errors="surrogateescape"))
        digest.update(b"\0")
        digest.update(str(stat.st_size).encode("ascii"))
        digest.update(b"\0")
        digest.update(str(stat.st_mtime_ns).encode("ascii"))
        digest.update(b"\0")
        count += 1
    return {"fingerprint": digest.hexdigest(), "file_count": count}


def _read_state():
    try:
        with open(state_path(), "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def _write_state(state):
    path = state_path()
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(state, f, indent=2, sort_keys=True)


def main(argv=None):
    config = generator.configure_from_project()
    os.chdir(config.root)
    current = _fingerprint()
    previous = _read_state()
    if previous == current:
        print(
            "AI map unchanged; skipping refresh "
            f"({current['file_count']} indexed files)."
        )
        return 0

    result = subprocess.run([sys.executable, "-m", "context_pipeline.cli", "map"], check=False)
    if result.returncode == 0:
        _write_state(current)
    return result.returncode


if __name__ == "__main__":
    raise SystemExit(main())
