#!/usr/bin/env python3
"""Compare visible context efficiency across Codex agent sessions.

This script analyzes what entered the conversation through messages and tool
outputs. It cannot inspect private model attention, but it reconstructs the
visible context the agent accumulated well enough for A/B comparisons.
"""

import argparse
import json
import os
import re
from datetime import datetime, timezone

from . import compliance as analyze_compliance
from . import core as ctx


SOURCE_HEADER_RE = re.compile(r"--- File: (?P<file>.+?) \(Lines (?P<start>\d+) to (?P<end>\d+) of (?P<total>\d+)\)(?: \[(?P<reason>[^\]]+)\])? ---")


DEFAULT_RELEVANT_PATTERNS = [
    "app/routes/billing.py",
    "app/models/billing.py",
    "app/templates/partials/billing/*",
    "app/templates/pages/billing/*",
    "tests/test_billing.py",
    "app/models/organization.py",
    "app/routes/settings.py",
    "app/routes/auth.py",
    "app/decorators.py",
    "app/__init__.py",
    "app/models/base.py",
    "app/supabase_client.py",
    "tests/conftest.py",
    "tests/test_models.py",
    "tests/test_chat_tabs.py",
    "tests/test_course_progress.py",
]


def estimate_tokens(text):
    return ctx.estimate_tokens(text or "")


def parse_timestamp(value):
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def find_codex_session(identifier):
    found = analyze_compliance.find_codex_session(identifier)
    if not found:
        raise FileNotFoundError(f"Codex session not found for '{identifier}'")
    return found


def iter_codex_records(path):
    with open(path, "r", encoding="utf-8") as f:
        for idx, line in enumerate(f, 1):
            try:
                record = json.loads(line)
            except json.JSONDecodeError:
                continue
            payload = record.get("payload") or {}
            item = payload.get("item") if isinstance(payload, dict) and "item" in payload else payload
            yield idx, record, item if isinstance(item, dict) else {}


def command_from_item(item):
    if item.get("type") != "function_call":
        return None, {}
    name = item.get("name")
    args = analyze_compliance._parse_codex_arguments(item.get("arguments"))
    if name == "shell_command":
        return args.get("command") or "", args
    return name or "", args


def raw_reader_file(command):
    if not command:
        return None
    patterns = [
        r"Get-Content\s+(?:-LiteralPath\s+)?['\"]?(?P<file>[^'\"\s|]+)",
        r"\bcat\s+['\"]?(?P<file>[^'\"\s|]+)",
        r"\btype\s+['\"]?(?P<file>[^'\"\s|]+)",
        r"\bsed\s+.*?\s+['\"]?(?P<file>[^'\"\s|]+)$",
    ]
    for pattern in patterns:
        match = re.search(pattern, command, re.IGNORECASE)
        if match:
            return ctx.normalize_path(match.group("file"))
    return None


def text_from_message(item):
    if item.get("type") != "message":
        return ""
    parts = []
    for part in item.get("content") or []:
        if isinstance(part, dict):
            text = part.get("text") or part.get("input_text") or part.get("output_text")
            if text:
                parts.append(text)
    return "\n".join(parts)


def output_from_item(item):
    if item.get("type") != "function_call_output":
        return ""
    output = item.get("output")
    if isinstance(output, (dict, list)):
        return json.dumps(output, ensure_ascii=False)
    return str(output or "")


def extract_source_blocks(text):
    blocks = []
    lines = (text or "").splitlines()
    i = 0
    while i < len(lines):
        match = SOURCE_HEADER_RE.match(lines[i])
        if not match:
            i += 1
            continue
        file_path = ctx.normalize_path(match.group("file"))
        start = int(match.group("start"))
        end = int(match.group("end"))
        reason = match.group("reason") or "source"
        block_lines = [lines[i]]
        i += 1
        while i < len(lines):
            if SOURCE_HEADER_RE.match(lines[i]):
                break
            if lines[i].startswith("CTX_BUDGET") or lines[i].startswith("CTX_"):
                break
            block_lines.append(lines[i])
            i += 1
        content = "\n".join(block_lines)
        blocks.append({
            "file": file_path,
            "start": start,
            "end": end,
            "reason": reason,
            "line_count": max(0, end - start + 1),
            "chars": len(content),
            "tokens": estimate_tokens(content),
            "content": content,
        })
    return blocks


def extract_ctx_counts(text):
    counts = {}
    markers = []
    for line in (text or "").splitlines():
        if not line.startswith("CTX_"):
            continue
        kind = line.split()[0]
        counts[kind] = counts.get(kind, 0) + 1
        markers.append(line)
    return counts, markers


def is_relevant_file(file_path, patterns):
    normalized = ctx.normalize_path(file_path)
    return any(ctx.glob_matches(normalized, [pattern]) for pattern in patterns)


def analyze_session(identifier, relevant_patterns=None):
    path = find_codex_session(identifier)
    relevant_patterns = relevant_patterns or DEFAULT_RELEVANT_PATTERNS

    metrics = {
        "id": identifier,
        "path": path,
        "records": 0,
        "duration_seconds": None,
        "first_timestamp": None,
        "last_timestamp": None,
        "message_count": 0,
        "tool_call_count": 0,
        "tool_output_count": 0,
        "shell_command_count": 0,
        "pipeline_command_count": 0,
        "raw_reader_command_count": 0,
        "raw_search_command_count": 0,
        "total_visible_chars": 0,
        "total_visible_tokens": 0,
        "tool_output_chars": 0,
        "tool_output_tokens": 0,
        "source_chars": 0,
        "source_tokens": 0,
        "source_lines": 0,
        "manifest_tokens": 0,
        "manifest_lines": 0,
        "relevant_source_tokens": 0,
        "irrelevant_source_tokens": 0,
        "relevant_source_lines": 0,
        "irrelevant_source_lines": 0,
        "unique_source_files": [],
        "unique_relevant_files": [],
        "unique_irrelevant_files": [],
        "duplicate_source_blocks": 0,
        "noisy_search_emissions": 0,
        "session_missing_warnings": 0,
        "ctx_counts": {},
        "commands": [],
        "source_blocks": [],
    }

    seen_ranges = set()
    source_files = set()
    relevant_files = set()
    irrelevant_files = set()
    first_ts = None
    last_ts = None
    raw_reader_files_by_call = {}

    for _, record, item in iter_codex_records(path):
        metrics["records"] += 1
        ts = parse_timestamp(record.get("timestamp"))
        if ts:
            first_ts = ts if first_ts is None or ts < first_ts else first_ts
            last_ts = ts if last_ts is None or ts > last_ts else last_ts

        message_text = text_from_message(item)
        if message_text:
            metrics["message_count"] += 1
            metrics["total_visible_chars"] += len(message_text)
            metrics["total_visible_tokens"] += estimate_tokens(message_text)

        command, args = command_from_item(item)
        if command is not None:
            metrics["tool_call_count"] += 1
            metrics["commands"].append(command)
            if item.get("name") == "shell_command":
                metrics["shell_command_count"] += 1
                reader_file = raw_reader_file(command)
                if reader_file and item.get("call_id"):
                    raw_reader_files_by_call[item.get("call_id")] = reader_file
                if any(part in command for part in ("context_lens.py", "surgical_read.py", "ai_find_literals.py")):
                    metrics["pipeline_command_count"] += 1
                if re.search(r"\b(cat|type|sed)\s+|Get-Content\b|python\s+-c\s+.*open\(", command, re.I):
                    metrics["raw_reader_command_count"] += 1
                if re.search(r"\b(rg|grep)\s+|Select-String\b", command, re.I) and "ai_find_literals.py" not in command:
                    metrics["raw_search_command_count"] += 1

        output_text = output_from_item(item)
        if output_text:
            metrics["tool_output_count"] += 1
            output_tokens = estimate_tokens(output_text)
            metrics["tool_output_chars"] += len(output_text)
            metrics["tool_output_tokens"] += output_tokens
            metrics["total_visible_chars"] += len(output_text)
            metrics["total_visible_tokens"] += output_tokens

            counts, _ = extract_ctx_counts(output_text)
            for kind, count in counts.items():
                metrics["ctx_counts"][kind] = metrics["ctx_counts"].get(kind, 0) + count

            blocks = extract_source_blocks(output_text)
            raw_file = raw_reader_files_by_call.pop(item.get("call_id"), None)
            if not blocks and raw_file:
                stripped_output = output_text.strip()
                if stripped_output:
                    raw_lines = stripped_output.splitlines()
                    blocks = [{
                        "file": raw_file,
                        "start": 1,
                        "end": len(raw_lines),
                        "reason": "raw-reader",
                        "line_count": len(raw_lines),
                        "chars": len(stripped_output),
                        "tokens": estimate_tokens(stripped_output),
                        "content": stripped_output,
                    }]

            for block in blocks:
                is_manifest = block["file"].endswith(".json") or ".ai_map/" in block["file"]
                if is_manifest:
                    metrics["manifest_tokens"] += block["tokens"]
                    metrics["manifest_lines"] += block["line_count"]
                    continue
                key = (block["file"], block["start"], block["end"])
                if key in seen_ranges:
                    metrics["duplicate_source_blocks"] += 1
                seen_ranges.add(key)
                source_files.add(block["file"])
                relevant = is_relevant_file(block["file"], relevant_patterns)
                block["relevant"] = relevant
                metrics["source_blocks"].append(block)
                metrics["source_chars"] += block["chars"]
                metrics["source_tokens"] += block["tokens"]
                metrics["source_lines"] += block["line_count"]
                if relevant:
                    relevant_files.add(block["file"])
                    metrics["relevant_source_tokens"] += block["tokens"]
                    metrics["relevant_source_lines"] += block["line_count"]
                else:
                    irrelevant_files.add(block["file"])
                    metrics["irrelevant_source_tokens"] += block["tokens"]
                    metrics["irrelevant_source_lines"] += block["line_count"]

    if first_ts and last_ts:
        metrics["first_timestamp"] = first_ts.isoformat()
        metrics["last_timestamp"] = last_ts.isoformat()
        metrics["duration_seconds"] = round((last_ts - first_ts).total_seconds(), 3)

    metrics["unique_source_files"] = sorted(source_files)
    metrics["unique_relevant_files"] = sorted(relevant_files)
    metrics["unique_irrelevant_files"] = sorted(irrelevant_files)
    metrics["noisy_search_emissions"] = metrics["ctx_counts"].get("CTX_SEARCH_NOISY", 0)
    metrics["session_missing_warnings"] = metrics["ctx_counts"].get("CTX_SESSION_MISSING", 0)
    metrics["context_density"] = round(metrics["relevant_source_tokens"] / metrics["source_tokens"], 4) if metrics["source_tokens"] else None
    metrics["pipeline_command_ratio"] = round(metrics["pipeline_command_count"] / metrics["shell_command_count"], 4) if metrics["shell_command_count"] else None
    return metrics


def compact_metrics(metrics):
    return {
        "id": metrics["id"],
        "path": metrics["path"],
        "duration_seconds": metrics["duration_seconds"],
        "tool_call_count": metrics["tool_call_count"],
        "shell_command_count": metrics["shell_command_count"],
        "pipeline_command_count": metrics["pipeline_command_count"],
        "pipeline_command_ratio": metrics["pipeline_command_ratio"],
        "raw_reader_command_count": metrics["raw_reader_command_count"],
        "raw_search_command_count": metrics["raw_search_command_count"],
        "total_visible_tokens": metrics["total_visible_tokens"],
        "tool_output_tokens": metrics["tool_output_tokens"],
        "source_tokens": metrics["source_tokens"],
        "source_lines": metrics["source_lines"],
        "manifest_tokens": metrics["manifest_tokens"],
        "manifest_lines": metrics["manifest_lines"],
        "context_density": metrics["context_density"],
        "relevant_source_tokens": metrics["relevant_source_tokens"],
        "irrelevant_source_tokens": metrics["irrelevant_source_tokens"],
        "unique_source_file_count": len(metrics["unique_source_files"]),
        "unique_relevant_file_count": len(metrics["unique_relevant_files"]),
        "unique_irrelevant_file_count": len(metrics["unique_irrelevant_files"]),
        "duplicate_source_blocks": metrics["duplicate_source_blocks"],
        "noisy_search_emissions": metrics["noisy_search_emissions"],
        "session_missing_warnings": metrics["session_missing_warnings"],
        "ctx_counts": metrics["ctx_counts"],
    }


def print_report(results, show_files=False):
    print("# Context Efficiency Report")
    print("")
    for metrics in results:
        compact = compact_metrics(metrics)
        print(f"## {metrics['id']}")
        print(f"Path: {metrics['path']}")
        print(f"Duration: {compact['duration_seconds']} sec")
        print(f"Tool calls: {compact['tool_call_count']} total, {compact['shell_command_count']} shell")
        print(f"Pipeline commands: {compact['pipeline_command_count']} ({compact['pipeline_command_ratio']})")
        print(f"Raw readers/searches: {compact['raw_reader_command_count']} readers, {compact['raw_search_command_count']} searches")
        print(f"Visible tokens: {compact['total_visible_tokens']} total, {compact['tool_output_tokens']} tool-output")
        print(f"Source read: {compact['source_lines']} lines, {compact['source_tokens']} tokens")
        print(f"Manifest/map context: {compact['manifest_lines']} lines, {compact['manifest_tokens']} tokens")
        print(f"Context density: {compact['context_density']} relevant-source-token ratio")
        print(f"Relevant/irrelevant source tokens: {compact['relevant_source_tokens']} / {compact['irrelevant_source_tokens']}")
        print(f"Unique source files: {compact['unique_source_file_count']} ({compact['unique_relevant_file_count']} relevant, {compact['unique_irrelevant_file_count']} irrelevant)")
        print(f"Duplicate source blocks: {compact['duplicate_source_blocks']}")
        print(f"Noisy search emissions: {compact['noisy_search_emissions']}")
        print(f"Session missing warnings: {compact['session_missing_warnings']}")
        print(f"CTX counts: {json.dumps(compact['ctx_counts'], sort_keys=True)}")
        if show_files:
            print("Relevant files:")
            for file_path in metrics["unique_relevant_files"]:
                print(f"  - {file_path}")
            print("Irrelevant files:")
            for file_path in metrics["unique_irrelevant_files"]:
                print(f"  - {file_path}")
        print("")

    if len(results) >= 2:
        print("## Comparison")
        baseline = compact_metrics(results[0])
        for metrics in results[1:]:
            current = compact_metrics(metrics)
            print(f"{results[0]['id']} -> {metrics['id']}")
            for key in [
                "duration_seconds",
                "tool_call_count",
                "source_tokens",
                "context_density",
                "raw_reader_command_count",
                "raw_search_command_count",
                "duplicate_source_blocks",
            ]:
                print(f"  {key}: {baseline.get(key)} -> {current.get(key)}")


def main():
    parser = argparse.ArgumentParser(description="Analyze visible context efficiency for Codex session JSONL files.")
    parser.add_argument("sessions", nargs="+", help="Codex thread ids/fragments or direct session JSONL paths")
    parser.add_argument("--json", action="store_true", help="Emit JSON")
    parser.add_argument("--show-files", action="store_true", help="Show unique relevant/irrelevant source files")
    parser.add_argument("--relevant", help="Comma-separated fnmatch patterns for relevant files")
    args = parser.parse_args()

    relevant = [p.strip() for p in args.relevant.split(",")] if args.relevant else DEFAULT_RELEVANT_PATTERNS
    results = [analyze_session(session, relevant) for session in args.sessions]
    if args.json:
        print(json.dumps([compact_metrics(r) for r in results], indent=2))
    else:
        print_report(results, show_files=args.show_files)


if __name__ == "__main__":
    main()
