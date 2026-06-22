#!/usr/bin/env python3
"""Shared helpers for the Multi-Resolution Context Pipeline."""

from __future__ import annotations

import fnmatch
import hashlib
import json
import os
import re
import time
import uuid
from dataclasses import dataclass


PROTECTED_ROOTS = ("app/", "tests/")
OUTPUT_DIR = ".ai_map"
SESSION_DIR = os.path.join(OUTPUT_DIR, "sessions")
SESSION_HINT_TTL_SECONDS = 2 * 60 * 60
SESSION_HINT_FILENAME = ".current_context_session.json"


def configure(project_root: str | None = None, protected_roots: list[str] | tuple[str, ...] | None = None, output_dir: str | None = None) -> None:
    global PROTECTED_ROOTS, OUTPUT_DIR, SESSION_DIR
    if project_root:
        os.environ["CTXPIPE_ROOT"] = os.path.abspath(project_root)
    if protected_roots is not None:
        PROTECTED_ROOTS = tuple(root.replace("\\", "/").rstrip("/") + "/" for root in protected_roots)
    if output_dir:
        OUTPUT_DIR = output_dir
        SESSION_DIR = os.path.join(OUTPUT_DIR, "sessions")


@dataclass
class Range:
    start: int
    end: int
    reason: str = "source"

    def clamp(self, total_lines: int) -> "Range":
        start = max(1, min(self.start, total_lines or 1))
        end = max(start, min(self.end, total_lines or start))
        return Range(start, end, self.reason)

    def as_dict(self) -> dict:
        return {"start": self.start, "end": self.end, "reason": self.reason}


def normalize_path(path: str, base_dir: str | None = None) -> str:
    if not path:
        return ""
    normalized = path.replace("\\", "/").strip("\"'")
    root = base_dir or repo_root()
    if os.path.isabs(normalized):
        try:
            normalized = os.path.relpath(normalized, root).replace("\\", "/")
        except ValueError:
            pass
    if normalized.startswith("./"):
        normalized = normalized[2:]
    return normalized


def repo_root() -> str:
    return os.path.abspath(os.environ.get("CTXPIPE_ROOT") or os.getcwd())


def rel_path_for(path: str) -> str:
    return normalize_path(path, repo_root())


def is_manifest_path(path: str) -> bool:
    normalized = normalize_path(path)
    return normalized.endswith(".json") or ".ai_map/" in normalized or ".focus_maps/" in normalized


def is_protected_source(path: str) -> bool:
    normalized = rel_path_for(path).lower()
    return any(normalized.startswith(root) for root in PROTECTED_ROOTS)


def manifest_path_for(source_path: str) -> str:
    rel = rel_path_for(source_path)
    return os.path.join(OUTPUT_DIR, "manifests", rel + ".json").replace("\\", "/")


def load_manifest(source_path: str) -> tuple[dict | None, str | None]:
    manifest_path = manifest_path_for(source_path)
    if not os.path.exists(manifest_path):
        return None, manifest_path
    try:
        with open(manifest_path, "r", encoding="utf-8") as f:
            return json.load(f), manifest_path
    except Exception:
        return None, manifest_path


def read_lines(path: str) -> list[str]:
    with open(path, "r", encoding="utf-8") as f:
        return f.readlines()


def estimate_tokens(text: str) -> int:
    return max(1, (len(text) + 3) // 4)


def token_for(file_path: str, ranges: list[Range], reason: str, session_id: str) -> str:
    payload = {
        "file": rel_path_for(file_path),
        "ranges": [r.as_dict() for r in ranges],
        "reason": reason,
        "session": session_id,
        "time": int(time.time() // 60),
    }
    digest = hashlib.sha1(json.dumps(payload, sort_keys=True).encode("utf-8")).hexdigest()
    return "ctx_" + digest[:12]


def session_path(session_id: str) -> str:
    safe = re.sub(r"[^A-Za-z0-9_.-]+", "_", session_id or "default")
    return os.path.join(SESSION_DIR, safe + ".jsonl")


def is_default_session(session_id: str | None) -> bool:
    return not session_id or session_id == "default"


def resolve_session_id(provided: str | None = None, *, adopt_hint: bool = True) -> str:
    if provided:
        return provided
    env_session = os.environ.get("CTX_SESSION_ID")
    if env_session:
        return env_session
    if adopt_hint:
        hint = read_session_hint()
        if hint:
            return hint["session"]
    return "default"


def new_task_session_id(task: str | None = None, prefix: str = "ctx") -> str:
    words = re.findall(r"[A-Za-z0-9]+", task or "")
    slug = "-".join(word.lower() for word in words[:5]) or "task"
    return f"{prefix}-{slug}-{uuid.uuid4().hex[:8]}"


def resolve_task_session_id(provided: str | None = None, task: str | None = None) -> str:
    session = resolve_session_id(provided, adopt_hint=False)
    if not is_default_session(session):
        return session
    return new_task_session_id(task)


def session_hint_path() -> str:
    return os.environ.get("CTX_SESSION_HINT_FILE") or os.path.join(SESSION_DIR, SESSION_HINT_FILENAME)


def write_session_hint(session_id: str, task: str | None = None, source: str = "context_lens") -> dict:
    hint = {
        "session": session_id,
        "task": task or "",
        "source": source,
        "cwd": os.getcwd(),
        "timestamp": time.time(),
        "expires_at": time.time() + SESSION_HINT_TTL_SECONDS,
    }
    try:
        path = session_hint_path()
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(hint, f, indent=2, sort_keys=True)
    except Exception:
        pass
    return hint


def read_session_hint(now: float | None = None) -> dict | None:
    path = session_hint_path()
    if not os.path.exists(path):
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            hint = json.load(f)
    except Exception:
        return None
    session = hint.get("session")
    if not session or is_default_session(session):
        return None
    expires_at = float(hint.get("expires_at") or 0)
    if expires_at and expires_at < (now or time.time()):
        return None
    return hint


def session_missing_hint(session_id: str | None, reason: str = "default_session") -> dict | None:
    if not is_default_session(session_id):
        return None
    hint = read_session_hint()
    if not hint:
        return None
    current = hint.get("session")
    suggested = f"--session {current}"
    return {
        "current": current,
        "task": hint.get("task", ""),
        "reason": reason,
        "suggested": suggested,
    }


def session_missing_marker(hint: dict, command_hint: str | None = None) -> str:
    task = json.dumps(hint.get("task") or "")
    suggested = json.dumps(command_hint or hint.get("suggested") or "")
    return (
        f"CTX_SESSION_MISSING current={hint.get('current')} task={task} "
        f"reason={hint.get('reason', 'default_session')} suggested={suggested}"
    )


def read_session(session_id: str) -> list[dict]:
    path = session_path(session_id)
    if not os.path.exists(path):
        return []
    events = []
    try:
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                try:
                    events.append(json.loads(line))
                except json.JSONDecodeError:
                    continue
    except Exception:
        return []
    return events


def append_event(session_id: str, event: dict) -> None:
    try:
        os.makedirs(SESSION_DIR, exist_ok=True)
        event = dict(event)
        event.setdefault("timestamp", time.time())
        with open(session_path(session_id), "a", encoding="utf-8") as f:
            f.write(json.dumps(event, sort_keys=True) + "\n")
    except Exception:
        return


def grant_event(file_path: str, ranges: list[Range], reason: str, token: str, compliant: bool = True) -> dict:
    return {
        "type": "grant",
        "token": token,
        "file": rel_path_for(file_path),
        "ranges": [r.as_dict() for r in ranges],
        "reason": reason,
        "compliant": compliant,
    }


def recommendation_event(file_path: str, task: str | None, reason: str | None, score: int | None = None) -> dict:
    event = {
        "type": "recommendation",
        "file": rel_path_for(file_path),
        "task": task or "",
        "reason": reason or "",
    }
    if score is not None:
        event["score"] = int(score)
    return event


def find_recommendation(session_id: str, file_path: str) -> dict | None:
    rel = rel_path_for(file_path)
    for event in reversed(read_session(session_id)):
        if event.get("type") == "recommendation" and event.get("file") == rel:
            return event
    return None


def relevance_marker(event: dict | None) -> str | None:
    if not event:
        return None
    reason = str(event.get("reason") or "").replace("\n", " ").strip()
    task = str(event.get("task") or "").replace("\n", " ").strip()
    score = event.get("score")
    score_part = f" score={score}" if score is not None else ""
    return (
        f"CTX_RELEVANCE file={event.get('file')}{score_part} "
        f"reason={json.dumps(reason[:180])} task={json.dumps(task[:180])}"
    )


def find_grant(session_id: str, token: str) -> dict | None:
    for event in reversed(read_session(session_id)):
        if event.get("type") == "grant" and event.get("token") == token:
            return event
    return None


def session_ids_by_recency(limit: int | None = None) -> list[str]:
    if not os.path.isdir(SESSION_DIR):
        return []
    candidates = []
    for name in os.listdir(SESSION_DIR):
        if not name.endswith(".jsonl"):
            continue
        path = os.path.join(SESSION_DIR, name)
        session_id = name[:-6]
        try:
            mtime = os.path.getmtime(path)
        except OSError:
            mtime = 0
        candidates.append((mtime, session_id))
    ordered = [session for _, session in sorted(candidates, key=lambda item: (-item[0], item[1]))]
    return ordered[:limit] if limit else ordered


def find_grant_owners(token: str, *, preferred_sessions: list[str] | None = None, limit: int | None = None) -> list[dict]:
    if not token:
        return []

    ordered_sessions = []
    seen_sessions = set()

    for session_id in preferred_sessions or []:
        if session_id and session_id not in seen_sessions:
            ordered_sessions.append(session_id)
            seen_sessions.add(session_id)

    for session_id in session_ids_by_recency(limit=limit):
        if session_id not in seen_sessions:
            ordered_sessions.append(session_id)
            seen_sessions.add(session_id)

    owners = []
    seen_owners = set()
    for session_id in ordered_sessions:
        grant = find_grant(session_id, token)
        if not grant:
            continue
        owner_key = (session_id, grant.get("file"), json.dumps(grant.get("ranges", []), sort_keys=True))
        if owner_key in seen_owners:
            continue
        seen_owners.add(owner_key)
        owners.append({"session": session_id, "grant": grant})
    return owners


def has_manifest_grant(session_id: str, file_path: str) -> bool:
    rel = rel_path_for(file_path)
    for event in reversed(read_session(session_id)):
        if event.get("type") == "manifest" and event.get("file") == rel:
            return True
    return False


def range_signature(file_path: str, ranges: list[Range]) -> str:
    normalized = merge_ranges(ranges)
    payload = {
        "file": rel_path_for(file_path),
        "ranges": [(r.start, r.end, r.reason) for r in normalized],
    }
    return hashlib.sha1(json.dumps(payload, sort_keys=True).encode("utf-8")).hexdigest()


def prior_read(session_id: str, file_path: str, ranges: list[Range]) -> dict | None:
    sig = range_signature(file_path, ranges)
    for event in reversed(read_session(session_id)):
        if event.get("type") == "read" and event.get("signature") == sig:
            return event
    return None


def prior_read_ranges(session_id: str, file_path: str) -> list[Range]:
    rel = rel_path_for(file_path)
    ranges: list[Range] = []
    for event in read_session(session_id):
        if event.get("type") != "read" or event.get("file") != rel:
            continue
        for item in event.get("ranges", []):
            try:
                ranges.append(Range(int(item["start"]), int(item["end"]), item.get("reason", "prior")))
            except (KeyError, TypeError, ValueError):
                continue
    return merge_ranges(ranges)


def subtract_prior_ranges(requested_ranges: list[Range], prior_ranges: list[Range]) -> list[Range]:
    missing: list[Range] = []
    for requested in merge_ranges(requested_ranges):
        segments = [(requested.start, requested.end)]
        for prior in prior_ranges:
            next_segments = []
            for start, end in segments:
                if prior.end < start or prior.start > end:
                    next_segments.append((start, end))
                    continue
                if prior.start > start:
                    next_segments.append((start, prior.start - 1))
                if prior.end < end:
                    next_segments.append((prior.end + 1, end))
            segments = next_segments
            if not segments:
                break
        for start, end in segments:
            if start <= end:
                missing.append(Range(start, end, requested.reason))
    return merge_ranges(missing)


def overlap_status(requested_ranges: list[Range], missing_ranges: list[Range]) -> str:
    requested = merge_ranges(requested_ranges)
    missing = merge_ranges(missing_ranges)
    if not requested:
        return "none"
    if not missing:
        return "exact"
    if range_signature("__range__", requested) == range_signature("__range__", missing):
        return "none"
    return "partial"


def format_ranges(ranges: list[Range]) -> str:
    return ",".join(f"{r.start}-{r.end}" for r in merge_ranges(ranges)) or "none"


def record_read(session_id: str, file_path: str, ranges: list[Range], token: str, metadata: dict) -> None:
    append_event(session_id, {
        "type": "read",
        "signature": range_signature(file_path, ranges),
        "file": rel_path_for(file_path),
        "ranges": [r.as_dict() for r in merge_ranges(ranges)],
        "token": token,
        "metadata": metadata,
    })


def structural_items(manifest: dict | None) -> list[dict]:
    if not manifest:
        return []
    items = []

    def add(kind: str, name: str, start: int | None, end: int | None, parent: str | None = None) -> None:
        if start is None:
            return
        items.append({
            "kind": kind,
            "name": name,
            "start": int(start),
            "end": int(end or start),
            "parent": parent,
        })

    for cls in _as_list(manifest.get("classes")):
        cls_name = cls.get("name", "Unknown")
        add("class", cls_name, cls.get("start_line"), cls.get("end_line"))
        for method in _as_list(cls.get("methods")):
            add("method", method.get("name", "Unknown"), method.get("start_line"), method.get("end_line"), cls_name)

    for key, kind, name_key in [
        ("functions", "function", "name"),
        ("objects", "object", "name"),
        ("alpine_components", "alpine_component", "name"),
        ("alpine_methods", "alpine_method", "name"),
        ("alpine_properties", "alpine_property", "name"),
        ("jinja_blocks", "jinja_block", "name"),
        ("headings", "heading", "text"),
    ]:
        for item in _as_list(manifest.get(key)):
            add(kind, item.get(name_key, "Unknown"), item.get("start_line") or item.get("line"), item.get("end_line") or item.get("line"))
            if key == "objects":
                for method in _as_list(item.get("methods")):
                    add("method", method.get("name", "Unknown"), method.get("start_line"), method.get("end_line"), item.get("name"))

    for section in _as_list(manifest.get("sections")):
        add("css_section", section.get("name", "Unknown"), section.get("start_line"), section.get("end_line"))
        for selector in _as_list(section.get("selectors")):
            add("css_selector", selector.get("selector", "Unknown"), selector.get("start_line"), selector.get("end_line"), section.get("name"))

    for landmark in _as_list(manifest.get("landmarks")):
        line = landmark.get("line") or landmark.get("start_line")
        add("landmark", landmark.get("id") or landmark.get("name", "Unknown"), line, line)

    return sorted(items, key=lambda x: (x["start"], x["end"], x["kind"]))


def _as_list(value) -> list:
    if isinstance(value, list):
        return value
    if isinstance(value, dict):
        return list(value.values())
    return []


def compact_manifest_text(manifest_path: str, manifest: dict | None, limit: int = 14) -> str:
    if not manifest:
        return f"CTX_MANIFEST_MISSING path={manifest_path}"
    lines = [
        f"CTX_MANIFEST file={manifest.get('file_path', 'Unknown')} path={manifest_path}",
        f"Source File: {manifest.get('file_path', 'Unknown')}",
        f"Language: {str(manifest.get('language', 'Unknown')).upper()}",
        "--- Compact Structural Map ---",
    ]
    items = structural_items(manifest)
    for item in items[:limit]:
        parent = f" parent={item['parent']}" if item.get("parent") else ""
        lines.append(f"  - {item['kind']} {item['name']} lines {item['start']}-{item['end']}{parent}")
    if len(items) > limit:
        lines.append(f"  ... and {len(items) - limit} more structural items")
    return "\n".join(lines)


def breadcrumb_text(file_path: str, manifest: dict | None, start: int, end: int, symbol_name: str | None = None) -> str:
    items = structural_items(manifest)
    owner = None
    previous = None
    next_item = None
    for item in items:
        if item["start"] <= start <= item["end"]:
            if owner is None or (item["end"] - item["start"]) <= (owner["end"] - owner["start"]):
                owner = item
        if item["end"] < start:
            previous = item
        if item["start"] > end and next_item is None:
            next_item = item
    imports = import_ranges(file_path, read_lines(file_path))
    import_hint = f"{imports[0].start}-{imports[-1].end}" if imports else "none"
    lines = [
        "CTX_BREADCRUMB",
        f"  symbol={symbol_name or 'range'} file={rel_path_for(file_path)} lines={start}-{end}",
        f"  owner={_item_label(owner)}",
        f"  previous={_item_label(previous)}",
        f"  next={_item_label(next_item)}",
        f"  imports_or_header={import_hint}",
        f"  suggested: ctx read {rel_path_for(file_path)} --expand-from <TOKEN> --include imports,neighbors",
    ]
    return "\n".join(lines)


def _item_label(item: dict | None) -> str:
    if not item:
        return "none"
    parent = f"{item['parent']}." if item.get("parent") else ""
    return f"{item['kind']} {parent}{item['name']} ({item['start']}-{item['end']})"


def merge_ranges(ranges: list[Range]) -> list[Range]:
    if not ranges:
        return []
    ordered = sorted(ranges, key=lambda r: (r.start, r.end, r.reason))
    merged = [ordered[0]]
    for current in ordered[1:]:
        last = merged[-1]
        if current.start <= last.end + 1:
            reasons = last.reason if current.reason in last.reason.split("+") else last.reason + "+" + current.reason
            merged[-1] = Range(last.start, max(last.end, current.end), reasons)
        else:
            merged.append(current)
    return merged


def apply_padding(ranges: list[Range], before: int, after: int, total_lines: int) -> list[Range]:
    padded = [Range(r.start - before, r.end + after, r.reason).clamp(total_lines) for r in ranges]
    return merge_ranges(padded)


def import_ranges(file_path: str, lines: list[str]) -> list[Range]:
    ext = os.path.splitext(file_path)[1].lower()
    ranges: list[Range] = []
    if ext == ".py":
        start = None
        end = None
        in_multiline = False
        for idx, line in enumerate(lines, 1):
            stripped = line.strip()
            if not stripped or stripped.startswith("#"):
                if start is None:
                    continue
                if in_multiline:
                    end = idx
                    continue
                break
            if stripped.startswith("import ") or stripped.startswith("from "):
                start = start or idx
                end = idx
                if "(" in stripped and ")" not in stripped:
                    in_multiline = True
                continue
            if in_multiline:
                end = idx
                if ")" in stripped:
                    in_multiline = False
                continue
            if start is not None:
                break
            if stripped:
                break
        if start and end:
            ranges.append(Range(start, end, "imports"))
    elif ext in (".html", ".htm"):
        pattern = re.compile(r"<(?:script|link)\b|<style\b|(?:src|href)=", re.I)
        ranges.extend(Range(i, i, "imports") for i, line in enumerate(lines, 1) if pattern.search(line))
    elif ext == ".css":
        for i, line in enumerate(lines, 1):
            stripped = line.strip()
            if stripped.startswith("@import") or ":root" in stripped:
                ranges.append(Range(i, min(len(lines), i + 20 if ":root" in stripped else i), "imports"))
    elif ext == ".md":
        if lines and lines[0].strip() == "---":
            for i in range(2, len(lines) + 1):
                if lines[i - 1].strip() == "---":
                    ranges.append(Range(1, i, "imports"))
                    break
    return merge_ranges(ranges)


def decorator_range(file_path: str, lines: list[str], start: int) -> list[Range]:
    ext = os.path.splitext(file_path)[1].lower()
    if ext != ".py" or start <= 1:
        return []
    idx = start - 1
    first = None
    while idx >= 1:
        stripped = lines[idx - 1].strip()
        if stripped.startswith("@"):
            first = idx
            idx -= 1
            continue
        if not stripped:
            idx -= 1
            continue
        break
    return [Range(first, start - 1, "decorators")] if first else []


def top_level_range(manifest: dict | None, total_lines: int) -> list[Range]:
    items = structural_items(manifest)
    if not items:
        return [Range(1, min(total_lines, 40), "top-level")]
    first_start = max(1, items[0]["start"] - 1)
    if first_start <= 1:
        return []
    return [Range(1, min(first_start, 80), "top-level")]


def neighbor_ranges(manifest: dict | None, start: int, end: int) -> list[Range]:
    items = structural_items(manifest)
    previous = None
    next_item = None
    for item in items:
        if item["end"] < start:
            previous = item
        if item["start"] > end and next_item is None:
            next_item = item
    ranges = []
    if previous:
        ranges.append(Range(previous["start"], previous["end"], "neighbors"))
    if next_item:
        ranges.append(Range(next_item["start"], next_item["end"], "neighbors"))
    return ranges


def template_block_ranges(manifest: dict | None, base_ranges: list[Range]) -> list[Range]:
    if not manifest:
        return []
    ranges: list[Range] = []
    for block in _as_list(manifest.get("jinja_blocks")):
        try:
            start = int(block.get("start_line") or block.get("line"))
            end = int(block.get("end_line") or start)
        except (TypeError, ValueError):
            continue
        for base in base_ranges:
            if start <= base.end and end >= base.start:
                ranges.append(Range(start, end, "template-blocks"))
                break
    return ranges


def pattern_ranges(lines: list[str], pattern: str, reason: str, context: int = 0) -> list[Range]:
    rx = re.compile(pattern)
    ranges = []
    total = len(lines)
    for idx, line in enumerate(lines, 1):
        if rx.search(line):
            ranges.append(Range(idx - context, idx + context, reason).clamp(total))
    return merge_ranges(ranges)


def include_ranges(file_path: str, base_ranges: list[Range], include: list[str], manifest: dict | None, lines: list[str] | None = None) -> list[Range]:
    lines = lines if lines is not None else read_lines(file_path)
    total = len(lines)
    ranges = list(base_ranges)
    normalized = {item.strip() for item in include if item.strip()}
    if "imports" in normalized:
        ranges.extend(import_ranges(file_path, lines))
    if "decorators" in normalized:
        for base in base_ranges:
            ranges.extend(decorator_range(file_path, lines, base.start))
    if "neighbors" in normalized:
        for base in base_ranges:
            ranges.extend(neighbor_ranges(manifest, base.start, base.end))
    if "top-level" in normalized:
        ranges.extend(top_level_range(manifest, total))
    if "fixtures" in normalized:
        ranges.extend(pattern_ranges(lines, r"^\s*@pytest\.fixture\b|^\s*def\s+\w+\s*\(", "fixtures", 1))
    if "routes" in normalized:
        ranges.extend(pattern_ranges(lines, r"@\w+\.route\(|@.*Blueprint.*route\(", "routes", 2))
    if "template-blocks" in normalized:
        block_ranges = template_block_ranges(manifest, base_ranges)
        ranges.extend(block_ranges)
        if not block_ranges:
            ranges.extend(pattern_ranges(lines, r"{%\s*(block|macro)\b|{%\s*end(block|macro)\b", "template-blocks", 2))
    return merge_ranges([r.clamp(total) for r in ranges])


def render_source(file_path: str, ranges: list[Range], max_lines: int = 300, lines: list[str] | None = None) -> tuple[str, dict]:
    lines = lines if lines is not None else read_lines(file_path)
    total = len(lines)
    output = []
    emitted_lines = 0
    truncated = False
    for r in merge_ranges([item.clamp(total) for item in ranges]):
        start, end = r.start, r.end
        if emitted_lines + (end - start + 1) > max_lines:
            end = start + max(0, max_lines - emitted_lines) - 1
            truncated = True
        if end < start:
            break
        output.append(f"--- File: {file_path} (Lines {start} to {end} of {total}) [{r.reason}] ---")
        for i in range(start - 1, end):
            output.append(f"{i + 1}: {lines[i].rstrip()}")
        emitted_lines += end - start + 1
        if emitted_lines >= max_lines:
            truncated = truncated or end < total
            break
    if truncated:
        output.append(f"--- [Context output truncated at {max_lines} emitted lines] ---")
    text = "\n".join(output)
    metadata = {
        "file": rel_path_for(file_path),
        "ranges": [r.as_dict() for r in merge_ranges(ranges)],
        "emitted_lines": emitted_lines,
        "estimated_tokens": estimate_tokens(text),
        "coverage_percent": round((emitted_lines / total) * 100, 2) if total else 0,
        "truncated": truncated,
    }
    return text, metadata


def budget_marker(metadata: dict, token: str, marker: str = "CTX_BUDGET") -> str:
    return (
        f"{marker} token={token} file={metadata.get('file')} "
        f"lines={metadata.get('emitted_lines')} est_tokens={metadata.get('estimated_tokens')} "
        f"coverage={metadata.get('coverage_percent')}% truncated={str(metadata.get('truncated')).lower()}"
    )


def authorized_by_grant(grant: dict | None, file_path: str, ranges: list[Range]) -> bool:
    if not grant:
        return False
    if grant.get("file") != rel_path_for(file_path):
        return False
    granted = [Range(r["start"], r["end"], r.get("reason", "grant")) for r in grant.get("ranges", [])]
    for requested in ranges:
        if not any(g.start <= requested.start and requested.end <= g.end for g in granted):
            return False
    return True


def suggested_commands(file_path: str, start: int, end: int) -> list[str]:
    rel = rel_path_for(file_path)
    manifest = manifest_path_for(rel)
    return [
        f"ctx read {manifest}",
        f"ctx read {rel} --start {start} --end {end} --with-map",
        f"ctx read {rel} --symbol <symbol_name>",
    ]


def source_candidates_for_task(task: str, limit: int = 8) -> list[dict]:
    stopwords = {
        "across", "agent", "agents", "audit", "behavior", "behaviour", "code", "create",
        "files", "for", "from", "implementation", "make", "models", "only", "plan",
        "project", "related", "routes", "services", "source", "templates", "tests",
        "the", "this", "with", "and",
    }
    structural_terms = {"routes", "route", "models", "model", "services", "service", "templates", "template", "tests", "test"}
    raw_terms = []
    for token in re.findall(r"[A-Za-z_][A-Za-z0-9_/-]+", task or ""):
        for part in re.split(r"[-/_]+", token.lower()):
            if len(part) > 2:
                raw_terms.append(part)
    terms = [term for term in raw_terms if term not in stopwords]
    if not terms:
        terms = [term for term in raw_terms if term not in structural_terms]
    manifests_root = os.path.join(repo_root(), OUTPUT_DIR, "manifests")
    candidates = []
    if not os.path.exists(manifests_root):
        return []
    for root, _, files in os.walk(manifests_root):
        for name in files:
            if not name.endswith(".json"):
                continue
            manifest_file = os.path.join(root, name)
            try:
                with open(manifest_file, "r", encoding="utf-8") as f:
                    manifest = json.load(f)
            except Exception:
                continue
            rel = normalize_path(os.path.relpath(manifest_file, manifests_root))[:-5]
            if rel.startswith("scripts/") and not any(term in {"script", "scripts", "tool", "tools", "pipeline"} for term in terms):
                continue
            haystack = [rel.lower(), str(manifest.get("docstring", "")).lower()]
            haystack.extend((item["name"] or "").lower() for item in structural_items(manifest))
            matched_terms = [term for term in terms if any(term in h for h in haystack)]
            domain_matches = [term for term in matched_terms if term not in structural_terms]
            if matched_terms and domain_matches:
                path_matches = [term for term in domain_matches if term in rel.lower()]
                score = len(domain_matches) * 3 + len(matched_terms) + len(path_matches) * 2
                candidates.append({
                    "file": rel,
                    "score": score,
                    "reason": ", ".join(matched_terms)[:120],
                    "suggested": f"ctx read {manifest_path_for(rel)}",
                })
    return sorted(candidates, key=lambda x: (-x["score"], x["file"]))[:limit]


def glob_matches(root: str, patterns: list[str]) -> bool:
    normalized = rel_path_for(root)
    return any(fnmatch.fnmatch(normalized, pattern) for pattern in patterns)
