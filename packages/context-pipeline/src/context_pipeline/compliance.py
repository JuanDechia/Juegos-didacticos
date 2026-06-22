#!/usr/bin/env python3
"""Audit transcript compliance with the Multi-Resolution Context Pipeline."""

import json
import os
import re
import shlex
import sys


if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


def normalize_path(p):
    p = (p or "").replace("\\", "/").lower().strip('"\'')
    if p.startswith("./"):
        p = p[2:]
    return p


def parse_range(text):
    match = re.search(r"(\d+)-(\d+)", text or "")
    if not match:
        return None
    return int(match.group(1)), int(match.group(2))


def range_contains(granted, requested):
    if not granted or not requested:
        return False
    return granted[0] <= requested[0] and requested[1] <= granted[1]


def ranges_overlap(a, b):
    if not a or not b:
        return False
    return a[0] <= b[1] and b[0] <= a[1]


def extract_ctx_markers(content, step):
    markers = []
    for line in (content or "").splitlines():
        if not line.startswith("CTX_"):
            continue
        kind = line.split()[0]
        token_match = re.search(r"token=([A-Za-z0-9_-]+)", line)
        file_match = re.search(r"file=([^\s]+)", line)
        range_match = re.search(r"(?:range|ranges)=([0-9,-]+)", line)
        ranges = []
        if range_match:
            for part in range_match.group(1).split(","):
                parsed = parse_range(part)
                if parsed:
                    ranges.append(parsed)
        markers.append({
            "step": step,
            "kind": kind,
            "token": token_match.group(1) if token_match else None,
            "file": normalize_path(file_match.group(1)) if file_match else None,
            "ranges": ranges,
            "line": line,
        })
    return markers


def extract_surgical_target(cmd):
    try:
        tokens = shlex.split(cmd, posix=False)
    except ValueError:
        tokens = cmd.split()
    script_index = None
    for idx, token in enumerate(tokens):
        if "surgical_read.py" in token:
            script_index = idx
            break
    if script_index is None:
        return None
    options_with_values = {
        "--session", "--start", "--end", "--symbol", "--include", "--before",
        "--after", "--expand-from", "--context", "--batch", "--read", "--file",
    }
    idx = script_index + 1
    while idx < len(tokens):
        token = tokens[idx].strip('"\'')
        if token in options_with_values:
            idx += 2
            continue
        if token.startswith("--"):
            idx += 1
            continue
        if token.startswith("-"):
            idx += 1
            continue
        return token
    return None


def _parse_codex_arguments(arguments):
    if isinstance(arguments, dict):
        return arguments
    if not isinstance(arguments, str):
        return {}
    try:
        return json.loads(arguments)
    except Exception:
        return {}


def _tool_args_for_codex(name, arguments):
    args = _parse_codex_arguments(arguments)
    if name == "shell_command":
        command = args.get("command") or ""
        return {"CommandLine": command}
    if name == "view_file":
        return {"AbsolutePath": args.get("path") or args.get("AbsolutePath") or ""}
    if name in {"grep_search", "search"}:
        return {"Query": args.get("query") or args.get("pattern"), "SearchPath": args.get("path") or args.get("SearchPath")}
    return args


def load_codex_session(path):
    steps = []
    pending_call = None
    step_index = 0
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            try:
                record = json.loads(line)
            except json.JSONDecodeError:
                continue
            payload = record.get("payload") or {}
            item = payload.get("item") if isinstance(payload, dict) and "item" in payload else payload
            if not isinstance(item, dict):
                continue

            item_type = item.get("type")
            if item_type == "function_call":
                name = item.get("name")
                args = _tool_args_for_codex(name, item.get("arguments"))
                codex_name = name
                if name == "shell_command":
                    codex_name = "run_command"
                pending_call = {
                    "name": codex_name,
                    "args": args,
                    "codex_name": name,
                    "call_id": item.get("call_id"),
                }
                step_index += 1
                steps.append({
                    "step_index": step_index,
                    "type": "TOOL_CALL",
                    "content": "",
                    "tool_calls": [pending_call],
                    "codex_item_type": item_type,
                })
            elif item_type == "function_call_output":
                output = item.get("output")
                if isinstance(output, (dict, list)):
                    content = json.dumps(output, ensure_ascii=False)
                else:
                    content = str(output or "")
                if pending_call:
                    steps.append({
                        "step_index": step_index,
                        "type": "TOOL_OUTPUT",
                        "content": content,
                        "tool_calls": [],
                        "call_id": item.get("call_id"),
                    })
                else:
                    step_index += 1
                    steps.append({
                        "step_index": step_index,
                        "type": "TOOL_OUTPUT",
                        "content": content,
                        "tool_calls": [],
                    })
            elif item_type == "message":
                text_parts = []
                for part in item.get("content") or []:
                    if isinstance(part, dict):
                        text = part.get("text") or part.get("input_text") or part.get("output_text")
                        if text:
                            text_parts.append(text)
                if text_parts:
                    step_index += 1
                    steps.append({
                        "step_index": step_index,
                        "type": "MESSAGE",
                        "content": "\n".join(text_parts),
                        "tool_calls": [],
                    })
    return steps


def find_codex_session(identifier):
    if os.path.isfile(identifier):
        return identifier
    sessions_root = os.path.join(os.path.expanduser("~"), ".codex", "sessions")
    if not os.path.exists(sessions_root):
        return None
    matches = []
    for root, _, files in os.walk(sessions_root):
        for name in files:
            if not name.endswith(".jsonl"):
                continue
            path = os.path.join(root, name)
            if identifier in name:
                matches.append(path)
    if not matches:
        return None
    matches.sort(key=lambda p: os.path.getmtime(p), reverse=True)
    return matches[0]


def load_antigravity_steps(conv_id):
    path = f"C:\\Users\\angel\\.gemini\\antigravity-ide\\brain\\{conv_id}\\.system_generated\\logs\\transcript.jsonl"
    with open(path, "r", encoding="utf-8") as f:
        return [json.loads(line) for line in f]


def load_steps(identifier, source="auto"):
    if source in {"auto", "codex"}:
        codex_path = find_codex_session(identifier)
        if codex_path:
            return load_codex_session(codex_path), codex_path, "codex"
        if source == "codex":
            raise FileNotFoundError(f"Codex session not found for '{identifier}'")
    if source in {"auto", "antigravity"}:
        return load_antigravity_steps(identifier), identifier, "antigravity"
    raise ValueError(f"Unknown source: {source}")


def analyze(steps):
    view_file_calls = []
    run_command_calls = []
    grep_search_calls = []
    grep_matched_ranges = {}
    manifests_read = {}
    source_reads = []
    ctx_grants = {}
    ctx_markers = []
    blocked = []
    duplicates = []
    unsafe = []
    budgets = []
    auto_maps = []
    tool_counts = {}
    shell_commands = []
    ai_pipeline_commands = 0
    raw_reader_patterns = [
        r"\bcat\s+",
        r"\btype\s+",
        r"Get-Content\b",
        r"\bsed\s+",
        r"python\s+-c\s+.*open\(",
    ]
    raw_search_patterns = [
        r"\brg\s+",
        r"\bgrep\s+",
        r"Select-String\b",
    ]
    raw_reader_calls = []
    raw_search_calls = []

    start_re = re.compile(r"--start\s+(\d+)")
    end_re = re.compile(r"--end\s+(\d+)")

    for d in steps:
        step = d.get("step_index")
        content = d.get("content") or ""
        for marker in extract_ctx_markers(content, step):
            ctx_markers.append(marker)
            if marker["kind"] in {"CTX_GRANT", "CTX_SEARCH", "CTX_UNSAFE_GRANT"} and marker["token"]:
                ctx_grants[marker["token"]] = marker
            elif marker["kind"] == "CTX_BLOCKED":
                blocked.append(marker)
            elif marker["kind"] in {"CTX_DUPLICATE", "CTX_PARTIAL_DUPLICATE"}:
                duplicates.append(marker)
            elif marker["kind"] == "CTX_UNSAFE_GRANT":
                unsafe.append(marker)
            elif marker["kind"] == "CTX_BUDGET":
                budgets.append(marker)
            elif marker["kind"] == "CTX_AUTO_MAP":
                auto_maps.append(marker)

        if d.get("step_type") == "GREP_SEARCH" or d.get("type") == "GREP_SEARCH":
            grep_search_calls.append((step, None, None))
            for line in content.splitlines():
                try:
                    obj = json.loads(line.strip())
                except Exception:
                    obj = {}
                file_path = normalize_path(obj.get("File") or "")
                line_number = obj.get("Line") or obj.get("LineNumber")
                if file_path and line_number:
                    grep_matched_ranges.setdefault(file_path, []).append((step, (max(1, int(line_number) - 2), int(line_number) + 2)))

        for tc in d.get("tool_calls") or []:
            name = tc.get("name")
            args = tc.get("args") or {}
            tool_counts[name] = tool_counts.get(name, 0) + 1
            if name == "view_file":
                view_file_calls.append((step, args.get("AbsolutePath") or ""))
            elif name == "grep_search":
                grep_search_calls.append((step, args.get("Query"), args.get("SearchPath")))
            elif name == "run_command":
                cmd = (args.get("CommandLine") or "").strip('"\'')
                run_command_calls.append((step, cmd))
                shell_commands.append(cmd)
                if any(part in cmd for part in ("context_lens.py", "surgical_read.py", "ai_find_literals.py")):
                    ai_pipeline_commands += 1
                if any(re.search(pattern, cmd, re.IGNORECASE) for pattern in raw_reader_patterns):
                    raw_reader_calls.append((step, cmd))
                if any(re.search(pattern, cmd, re.IGNORECASE) for pattern in raw_search_patterns):
                    # Do not count rg/grep inside a quoted prompt passed to context_lens.
                    if not any(part in cmd for part in ("context_lens.py", "ai_find_literals.py")):
                        raw_search_calls.append((step, cmd))
                if "ai_find_literals.py" in cmd:
                    grep_search_calls.append((step, "ai_find_literals.py", cmd))
                if "surgical_read.py" not in cmd:
                    continue
                target_raw = extract_surgical_target(cmd)
                if not target_raw:
                    continue
                target = normalize_path(target_raw)
                requested = None
                start_match = start_re.search(cmd)
                end_match = end_re.search(cmd)
                if start_match and end_match:
                    requested = (int(start_match.group(1)), int(end_match.group(1)))
                if "manifests/" in target:
                    actual = target.replace(".ai_map/manifests/", "")
                    if actual.endswith(".json"):
                        actual = actual[:-5]
                    manifests_read[actual] = step
                else:
                    source_reads.append({
                        "step": step,
                        "file": target,
                        "range": requested,
                        "cmd": cmd,
                        "symbol": "--symbol" in cmd,
                        "with_map": "--with-map" in cmd or " -m" in cmd,
                        "expand": "--expand-from" in cmd,
                        "unsafe": "--allow-unsafe-read" in cmd,
                    })

    violations = []
    successes = []
    for read in source_reads:
        file_path = read["file"]
        protected = file_path.startswith("app/") or file_path.startswith("tests/")
        if not protected:
            successes.append(f"Read non-protected file at Step {read['step']}: {read['cmd']}")
            continue
        if read["symbol"]:
            successes.append(f"Step {read['step']}: valid symbol lookup exception for {file_path}.")
            continue
        if read["with_map"]:
            successes.append(f"Step {read['step']}: with-map satisfied manifest context for {file_path}.")
            continue
        if any(marker.get("file") == file_path for marker in auto_maps):
            successes.append(f"Step {read['step']}: auto-map satisfied manifest context for {file_path}.")
            continue
        if read["expand"]:
            successes.append(f"Step {read['step']}: expansion token used for {file_path}.")
            continue
        if read["unsafe"]:
            violations.append(f"Step {read['step']}: unsafe read bypass used for {file_path}.")
            continue
        manifest_step = manifests_read.get(file_path)
        if manifest_step is not None and manifest_step < read["step"]:
            successes.append(f"Step {read['step']}: manifest opened at Step {manifest_step} before {file_path}.")
            continue
        matching_grep = any(
            range_contains(granted_range, read["range"]) or ranges_overlap(granted_range, read["range"])
            for _, granted_range in grep_matched_ranges.get(file_path, [])
        )
        if matching_grep:
            successes.append(f"Step {read['step']}: range-level grep/search context matched {file_path}.")
            continue
        violations.append(f"Step {read['step']}: {file_path} read without manifest, symbol, with-map, expand token, or range-level search.")

    return {
        "view_file_calls": view_file_calls,
        "run_command_calls": run_command_calls,
        "grep_search_calls": grep_search_calls,
        "ctx_markers": ctx_markers,
        "ctx_grants": ctx_grants,
        "blocked": blocked,
        "duplicates": duplicates,
        "unsafe": unsafe,
        "budgets": budgets,
        "violations": violations,
        "successes": successes,
        "tool_counts": tool_counts,
        "shell_commands": shell_commands,
        "ai_pipeline_commands": ai_pipeline_commands,
        "raw_reader_calls": raw_reader_calls,
        "raw_search_calls": raw_search_calls,
    }


def print_report(result):
    print("=== 1. Native view_file Enforcements ===")
    if result["view_file_calls"]:
        print(f"WARNING: native view_file was called {len(result['view_file_calls'])} times.")
        for step, path in result["view_file_calls"]:
            print(f"  - Step {step}: {path}")
    else:
        print("SUCCESS: native view_file was not used.")

    print("\n=== 2. Multi-Resolution Context Pipeline ===")
    print(f"Shell commands: {len(result['shell_commands'])}")
    print(f"Pipeline commands: {result['ai_pipeline_commands']}")
    if result["raw_reader_calls"]:
        print("Raw reader commands detected:")
        for step, cmd in result["raw_reader_calls"]:
            print(f"  - Step {step}: {cmd}")
    if result["raw_search_calls"]:
        print("Raw search commands detected:")
        for step, cmd in result["raw_search_calls"]:
            print(f"  - Step {step}: {cmd}")
    if result["violations"]:
        print("WARNING: hard violations found:")
        for item in result["violations"]:
            print(f"  - {item}")
    else:
        print("SUCCESS: no hard manifest/provenance violations found.")
    for item in result["successes"]:
        print(f"  - {item}")

    print("\n=== 3. CTX Marker Summary ===")
    print(f"Grants emitted: {len(result['ctx_grants'])}")
    print(f"Blocked reads: {len(result['blocked'])}")
    print(f"Duplicate reads avoided: {len(result['duplicates'])}")
    print(f"Unsafe grants: {len(result['unsafe'])}")
    print(f"Budget markers: {len(result['budgets'])}")
    for marker in result["blocked"][:10]:
        print(f"  - Step {marker['step']}: {marker['line']}")

    print("\n=== 4. Search/Grep Usage ===")
    print(f"Search/grep calls: {len(result['grep_search_calls'])}")
    print("\n=== 5. Tool Counts ===")
    for name, count in sorted(result["tool_counts"].items()):
        print(f"{name}: {count}")


def main():
    source = "auto"
    args = sys.argv[1:]
    if "--source" in args:
        idx = args.index("--source")
        try:
            source = args[idx + 1]
        except IndexError:
            print("Error: --source requires one of auto, codex, antigravity")
            sys.exit(1)
        del args[idx:idx + 2]
    identifier = args[0] if args else "00f1d072-45d6-4099-bbae-63fb89111b97"
    try:
        steps, resolved, resolved_source = load_steps(identifier, source)
    except Exception as e:
        print("Error reading transcript:", e)
        sys.exit(1)
    print(f"Analyzing {resolved_source} conversation {identifier} compliance with AGENTS.md...")
    print(f"Resolved source: {resolved}\n")
    print_report(analyze(steps))


if __name__ == "__main__":
    main()
