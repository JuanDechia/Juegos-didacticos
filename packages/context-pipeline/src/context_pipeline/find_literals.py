#!/usr/bin/env python3
"""
Universal Literal & Pattern Scanner — Surgical text finder for the AI Context Pipeline.

Finds and groups occurrences of raw text strings or regex patterns project-wide.
Designed to scan large codebases safely without dumping full source code into the AI context.

Usage:
    ctx find --pattern "<regex_or_string>" [--ext <extensions>] [--limit <number>]
    
Default behavior (no pattern):
    ctx find  # Scans for hex colors in HTML/CSS/JS

Examples:
    ctx find -p "#[0-9a-fA-F]{3,8}" -e css,html
    ctx find -p "isLight" -e js -l 5
    ctx find -p "cdn.jsdelivr.net" -o scratch/cdn_scan.txt
"""
import os
import sys
import re
import argparse
import json

from . import core as ctx


GENERIC_SOURCE_SEARCH_PATTERNS = {
    "billing",
    "subscription",
    "subscriptions",
    "user",
    "users",
    "org",
    "org_id",
    "organization",
    "organizations",
    "session",
    "status",
    "plan",
    "id",
}


def _path_priority(rel_path: str, pattern: str) -> tuple:
    lower_path = rel_path.lower()
    lower_pattern = (pattern or "").lower().strip('"\'')
    basename = os.path.splitext(os.path.basename(lower_path))[0]
    score = 0
    if lower_pattern and lower_pattern in basename:
        score += 100
    if lower_pattern and lower_pattern in lower_path:
        score += 20
    if "/routes/" in lower_path:
        score += 8
    if "/models/" in lower_path:
        score += 7
    if "/templates/" in lower_path:
        score += 6
    if lower_path.startswith("tests/"):
        score += 5
    if "/prompts/" in lower_path:
        score -= 25
    return (-score, lower_path)


def _split_scan_paths(value) -> list[str]:
    if not value:
        return []
    if isinstance(value, list):
        value = ",".join(value)
    return [item.strip().replace("\\", "/").strip("/") for item in value.split(",") if item.strip()]


def _normalized_pattern_text(pattern: str) -> str:
    return re.sub(r"[^a-z0-9_]+", "", (pattern or "").lower())


def _search_noise_reason(args, scan_paths, total_matches, result_file_count):
    if not getattr(args, "emit_source", False):
        return None

    normalized_pattern = _normalized_pattern_text(args.pattern)
    broad_paths = {path for path in scan_paths if path in {"app", "tests", "app/", "tests/"}}
    is_multi_path = len(scan_paths) > 1
    is_generic = normalized_pattern in GENERIC_SOURCE_SEARCH_PATTERNS or len(normalized_pattern) <= 3
    has_many_matches = total_matches > 8 or result_file_count > 3

    if broad_paths and (is_generic or has_many_matches):
        return "broad_path"
    if is_multi_path and has_many_matches:
        return "multi_path"
    if is_generic and has_many_matches:
        return "generic_pattern"
    return None


def _scan_paths_include_protected(scan_paths) -> bool:
    if not scan_paths:
        return False
    for path in scan_paths:
        normalized = ctx.normalize_path(path).strip("/")
        if normalized in {"app", "tests"}:
            return True
        if normalized.startswith("app/") or normalized.startswith("tests/"):
            return True
    return False


def scan_literals(args):
    # Reconfigure stdout to gracefully handle non-ASCII/Unicode symbols on Windows consoles
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(errors='replace')

    base_dir = ctx.repo_root()

    if getattr(args, "path", None) and not getattr(args, "dir", None):
        args.dir = args.path
    if getattr(args, "limit", None) is not None:
        args.limit_total = args.limit
    args.session = ctx.resolve_session_id(
        getattr(args, "session", None),
        adopt_hint=not getattr(args, "ignore_session_hint", False),
    )

    # 1. Compile search pattern
    try:
        raw_pattern = args.pattern if args.regex else re.escape(args.pattern)
        pattern = re.compile(raw_pattern, re.IGNORECASE if args.ignore_case else 0)
    except re.error as e:
        print(f"Error: Invalid regular expression pattern: {e}", file=sys.stderr)
        sys.exit(1)

    # 2. Parse extensions and exclusions
    exts = {f".{ext.strip().lower().lstrip('.')}" for ext in args.ext.split(",")} if args.ext else None
    exclusions = {folder.strip() for folder in args.exclude.split(",")}

    # 3. Determine target scan directories
    target_dirs = []
    target_files = []
    scan_roots = args.dir
    scan_paths = _split_scan_paths(scan_roots)
    if isinstance(scan_roots, list):
        scan_roots = ",".join(scan_roots)
    if scan_roots:
        for d in scan_roots.split(","):
            full_d = os.path.abspath(os.path.join(base_dir, d.strip()))
            if os.path.isfile(full_d):
                target_files.append(full_d)
            elif os.path.exists(full_d):
                target_dirs.append(full_d)
            else:
                print(f"Warning: Scan directory not found: {d.strip()}", file=sys.stderr)
    else:
        # Default scan paths: app/templates and app/static
        default_paths = [
            os.path.join(base_dir, "app", "templates"),
            os.path.join(base_dir, "app", "static")
        ]
        target_dirs = [p for p in default_paths if os.path.exists(p)]

    if not target_dirs and not target_files:
        print("Error: No valid directories to scan.", file=sys.stderr)
        sys.exit(1)

    results = {}
    file_line_cache = {}
    scanned_files_count = 0
    total_matches_count = 0
    global_limit_reached = False

    # 4. Traverse and scan
    scan_plan = []
    for file_path in target_files:
        scan_plan.append((os.path.dirname(file_path), [], [os.path.basename(file_path)]))
    for target in target_dirs:
        for root, dirs, files in os.walk(target):
            dirs[:] = [d for d in dirs if d not in exclusions]
            scan_plan.append((root, dirs, files))

    for root, dirs, files in scan_plan:
        if global_limit_reached:
            break
        # Filter out excluded directories in-place when this came from os.walk.
        dirs[:] = [d for d in dirs if d not in exclusions]
        for file in files:
            if global_limit_reached:
                break
            # Apply extension filter
            ext = os.path.splitext(file)[1].lower()
            if ext in {".pyc", ".pyo"}:
                continue
            if exts and ext not in exts:
                continue
            # Skip minified files
            if ".min." in file:
                continue

            full_path = os.path.join(root, file)
            rel_path = ctx.normalize_path(os.path.relpath(full_path, base_dir))
            scanned_files_count += 1

            try:
                with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
                    lines = f.readlines()
            except Exception:
                # Gracefully skip permission or lock errors
                continue

            file_matches = []
            for i, line in enumerate(lines):
                # Search line for matches
                matches = pattern.findall(line)
                if matches:
                    # Limit matches per file
                    if len(file_matches) >= args.limit_per_file:
                        break
                    start = max(1, i + 1 - args.context)
                    end = min(len(lines), i + 1 + args.context)
                    match_text = matches[0] if isinstance(matches[0], str) else matches[0][0]
                    range_obj = ctx.Range(start, end, "search")
                    token = ctx.token_for(rel_path, [range_obj], "search", args.session)
                    ctx.append_event(args.session, ctx.grant_event(rel_path, [range_obj], "search", token))
                    file_matches.append({
                        "line": i + 1,
                        "match": match_text,
                        "content": line.strip(),
                        "range": {"start": start, "end": end},
                        "token": token,
                    "follow_up": f"ctx read {rel_path} --expand-from {token}"
                    })

            if file_matches:
                results[rel_path] = file_matches
                file_line_cache[rel_path] = lines
                total_matches_count += len(file_matches)
                if total_matches_count >= args.limit_total:
                    global_limit_reached = True

    # 5. Output results
    # Format JSON
    emitted_sources = {}
    ordered_result_paths = sorted(results, key=lambda rel: _path_priority(rel, args.pattern))
    noise_reason = _search_noise_reason(args, scan_paths, total_matches_count, len(results))
    session_hint = None
    if not getattr(args, "ignore_session_hint", False) and _scan_paths_include_protected(scan_paths):
        session_hint = ctx.session_missing_hint(args.session, "protected_search_without_session")
    noise_message = None
    if noise_reason:
        path_label = ",".join(scan_paths) if scan_paths else "<default>"
        noise_message = (
            f"CTX_SEARCH_NOISY pattern={json.dumps(args.pattern)} path={json.dumps(path_label)} "
            f"matches={total_matches_count} files={len(results)} reason={noise_reason} "
            "suggestion=\"source emission suppressed; narrow --path, lower --limit, follow expansion commands, or rerun with --allow-noisy-source\""
        )
    requested_emit_source = bool(getattr(args, "emit_source", False))
    source_emission_blocked = bool(noise_reason and requested_emit_source and not getattr(args, "allow_noisy_source", False))
    effective_emit_source = requested_emit_source and not source_emission_blocked
    grouped_followups = {}
    if getattr(args, "group_followups", False):
        for rel_path in ordered_result_paths:
            ranges = [ctx.Range(item["range"]["start"], item["range"]["end"], "search") for item in results[rel_path]]
            token = ctx.token_for(rel_path, ranges, "search_group", args.session)
            ctx.append_event(args.session, ctx.grant_event(rel_path, ranges, "search_group", token))
            grouped_followups[rel_path] = {
                "token": token,
                "ranges": [r.as_dict() for r in ranges],
                "matches": len(results[rel_path]),
                "follow_up": f"ctx read {rel_path} --expand-from {token}",
            }
    if effective_emit_source:
        emitted_files = 0
        emitted_lines = 0
        for rel_path in ordered_result_paths:
            matches = results[rel_path]
            if emitted_files >= args.emit_source_max_files or emitted_lines >= args.emit_source_max_lines:
                break
            source_path = os.path.join(base_dir, rel_path)
            ranges = [ctx.Range(item["range"]["start"], item["range"]["end"], "search") for item in matches]
            token = ctx.token_for(rel_path, ranges, "search_emit", args.session)
            remaining_lines = max(1, args.emit_source_max_lines - emitted_lines)
            text, metadata = ctx.render_source(source_path, ranges, max_lines=remaining_lines, lines=file_line_cache.get(rel_path))
            ctx.append_event(args.session, ctx.grant_event(rel_path, ranges, "search_emit", token))
            ctx.record_read(args.session, rel_path, ranges, token, metadata)
            emitted_sources[rel_path] = {"token": token, "text": text, "metadata": metadata}
            emitted_files += 1
            emitted_lines += int(metadata.get("emitted_lines", 0) or 0)

    if args.json:
        output_data = {
            "summary": {
                "pattern": args.pattern,
                "regex": bool(args.regex),
                "context": args.context,
                "session": args.session,
                "scanned_files": scanned_files_count,
                "total_matches": total_matches_count,
                "limit_reached": global_limit_reached,
                "emit_source": requested_emit_source,
                "effective_emit_source": effective_emit_source,
                "source_emission_blocked": source_emission_blocked,
                "allow_noisy_source": bool(getattr(args, "allow_noisy_source", False)),
                "noisy_emit_source": bool(noise_reason),
                "noise_reason": noise_reason,
                "session_hint": session_hint,
            },
            "results": results,
            "grouped_followups": grouped_followups,
            "sources": emitted_sources,
        }
        print(json.dumps(output_data, indent=2))
        
        # Optionally write to file
        if args.out:
            out_path = os.path.abspath(os.path.join(base_dir, args.out))
            os.makedirs(os.path.dirname(out_path), exist_ok=True)
            with open(out_path, "w", encoding="utf-8") as out_f:
                json.dump(output_data, out_f, indent=2)
    else:
        # Format human-readable output
        lines_out = []
        lines_out.append(f"Scanner Pattern: {args.pattern}")
        lines_out.append(f"Scanned Files  : {scanned_files_count}")
        lines_out.append(f"Total Matches  : {total_matches_count}" + (" (CAP REACHED)" if global_limit_reached else ""))
        if session_hint:
            lines_out.append(ctx.session_missing_marker(session_hint))
        if noise_message:
            lines_out.append(noise_message)
        lines_out.append("-" * 60)

        display_paths = ordered_result_paths
        if effective_emit_source:
            display_paths = [path for path in ordered_result_paths if path in emitted_sources]
        for rel_path in display_paths:
            matches = results[rel_path]
            lines_out.append(f"\n[{rel_path}] ({len(matches)} matches)")
            if rel_path in grouped_followups and not effective_emit_source:
                lines_out.append(f"    group-follow-up: {grouped_followups[rel_path]['follow_up']}")
            for item in matches:
                # Format: [LINE] match -> content
                r = item["range"]
                lines_out.append(
                    f"  CTX_SEARCH token={item['token']} file={rel_path} range={r['start']}-{r['end']} "
                    f"line={item['line']} match={item['match']} -> {item['content']}"
                )
                if not effective_emit_source and rel_path not in grouped_followups:
                    lines_out.append(f"    follow-up: {item['follow_up']}")
            if rel_path in emitted_sources:
                source = emitted_sources[rel_path]
                lines_out.append(f"  CTX_SEARCH_SOURCE token={source['token']} file={rel_path}")
                lines_out.append(source["text"])
                lines_out.append(ctx.budget_marker(source["metadata"], source["token"], marker="CTX_SEARCH_BUDGET"))
        omitted = len(results) - len(display_paths)
        if effective_emit_source and omitted > 0:
            lines_out.append(f"\nCTX_SEARCH_OMITTED files={omitted} reason=emit_source_display_cap")

        output_text = "\n".join(lines_out)
        print(output_text)

        # Optionally write to file
        if args.out:
            out_path = os.path.abspath(os.path.join(base_dir, args.out))
            os.makedirs(os.path.dirname(out_path), exist_ok=True)
            with open(out_path, "w", encoding="utf-8") as out_f:
                out_f.write(output_text)
            print(f"\nSuccess: Full scan results exported to {args.out}")


def main():
    parser = argparse.ArgumentParser(
        description="Universal Pattern & Literal Scanner for the AI Context Pipeline."
    )
    parser.add_argument(
        "--pattern", "-p",
        default=r"#[0-9a-fA-F]{3,8}",
        help="Regular expression pattern to find (defaults to hex colors)"
    )
    parser.add_argument(
        "--dir", "-d",
        nargs="+",
        help="Comma-separated relative directory paths to scan (e.g. app/templates,app/static/css)"
    )
    parser.add_argument(
        "--path",
        nargs="+",
        help="Alias for --dir; relative file or directory path to scan"
    )
    parser.add_argument(
        "--ext", "-e",
        help="Comma-separated file extensions to include (e.g. html,css,js)"
    )
    parser.add_argument(
        "--exclude", "-x",
        default="vendor,node_modules,.venv,.git,__pycache__",
        help="Comma-separated folder names to exclude"
    )
    parser.add_argument(
        "--limit-per-file",
        type=int,
        default=15,
        help="Maximum matches to show per file"
    )
    parser.add_argument(
        "--limit-total", "-l",
        type=int,
        default=100,
        help="Maximum total matches to return across all files"
    )
    parser.add_argument(
        "--limit",
        type=int,
        help="Alias for --limit-total"
    )
    parser.add_argument(
        "--context",
        type=int,
        default=2,
        help="Context lines to grant around each match"
    )
    parser.add_argument(
        "--regex",
        action="store_true",
        default=True,
        help="Treat --pattern as a regular expression; otherwise search literal text"
    )
    parser.add_argument(
        "--literal",
        dest="regex",
        action="store_false",
        help="Treat --pattern as literal text"
    )
    parser.add_argument(
        "--session",
        default=None,
        help="Context pipeline session id"
    )
    parser.add_argument(
        "--ignore-session-hint",
        action="store_true",
        help="Continue under default session even when a current context session hint exists"
    )
    parser.add_argument(
        "--emit-source",
        action="store_true",
        help="Emit bounded source ranges for matches in the same call"
    )
    parser.add_argument(
        "--allow-noisy-source",
        action="store_true",
        help="Allow source emission even when --emit-source is broad or generic enough to trigger CTX_SEARCH_NOISY"
    )
    parser.add_argument(
        "--emit-source-max-files",
        type=int,
        default=5,
        help="Maximum files to emit source for when --emit-source is used"
    )
    parser.add_argument(
        "--emit-source-max-lines",
        type=int,
        default=120,
        help="Maximum total source lines to emit when --emit-source is used"
    )
    parser.add_argument(
        "--group-followups",
        action="store_true",
        help="Emit one combined follow-up expansion command per matched file"
    )
    parser.add_argument(
        "--ignore-case", "-i",
        action="store_true",
        help="Perform case-insensitive search"
    )
    parser.add_argument(
        "--json", "-j",
        action="store_true",
        help="Output results in JSON format"
    )
    parser.add_argument(
        "--out", "-o",
        help="Relative output file path to write results to"
    )

    args = parser.parse_args()
    scan_literals(args)


if __name__ == "__main__":
    main()
