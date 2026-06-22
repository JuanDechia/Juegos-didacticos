import argparse
import sys
import os
import json

from . import core as ctx

MAX_LINES = 300

def format_extra_fields(item, exclude_keys):
    if not isinstance(item, dict):
        return ""
    extras = []
    for k, v in item.items():
        if k not in exclude_keys and v is not None and v != "":
            if isinstance(v, (str, int, float, bool)):
                val_str = str(v).replace('\n', ' ').strip()
                if len(val_str) > 80:
                    val_str = val_str[:77] + "..."
                extras.append(f'{k}: "{val_str}"')
    if extras:
        return ", (" + ", ".join(extras) + ")"
    return ""

def print_manifest_summary(file_path, manifest_data, force_interactive=False):
    print(f"--- Manifest Summary: {file_path} ---")
    source_path = manifest_data.get("file_path", "Unknown")
    lang = manifest_data.get("language", "Unknown").upper()
    print(f"Source File: {source_path}")
    print(f"Language: {lang}")
    
    docstring = manifest_data.get("docstring")
    if docstring:
        print(f"Docstring:\n  {docstring.strip()}")
        print("")
    
    counts = {}
    categories = [
        ("classes", "Classes"),
        ("functions", "Functions"),
        ("objects", "JS Objects"),
        ("alpine_components", "Alpine Components"),
        ("alpine_properties", "Alpine Properties"),
        ("alpine_methods", "Alpine Methods"),
        ("dom_bindings", "DOM Bindings"),
        ("landmarks", "Landmarks"),
        ("jinja_blocks", "Jinja Blocks"),
        ("sections", "CSS Sections"),
        ("headings", "Headings")
    ]
    
    total_elements = 0
    for key, label in categories:
        val = manifest_data.get(key, [])
        if isinstance(val, dict):
            c = len(val)
        elif isinstance(val, list):
            c = len(val)
            # Add nested elements count (methods in classes, methods in objects, selectors in CSS sections)
            if key == "classes":
                for cls in val:
                    meths = cls.get("methods", [])
                    c += len(meths) if isinstance(meths, list) else (len(meths) if isinstance(meths, dict) else 0)
            elif key == "objects":
                for obj in val:
                    meths = obj.get("methods", [])
                    c += len(meths) if isinstance(meths, list) else (len(meths) if isinstance(meths, dict) else 0)
            elif key == "sections":
                for sec in val:
                    sels = sec.get("selectors", [])
                    c += len(sels) if isinstance(sels, list) else (len(sels) if isinstance(sels, dict) else 0)
        else:
            c = 0
        counts[label] = c
        total_elements += c
            
    print("Item Counts:")
    for label, count in counts.items():
        if count > 0:
            print(f"  - {label}: {count}")
    print("")
    
    print("--- Structural Elements ---")
    
    # Determine the cap based on total elements to fit budget
    dynamic_cap = 9999 if total_elements < 350 else 100
 
    def print_items_interactive(title, items, format_fn, cap=dynamic_cap):
        if not items:
            return
        print(f"{title}:")
        printed = 0
        while printed < len(items):
            batch_end = min(printed + cap, len(items))
            for i in range(printed, batch_end):
                print(f"  - {format_fn(items[i])}")
            printed = batch_end
            
            if printed < len(items):
                remaining = len(items) - printed
                if not force_interactive and not sys.stdin.isatty():
                    print(f"  ... and {remaining} more items. (Use --symbol or specific line range to inspect)")
                    break
                try:
                    response = input(f"Show next {min(cap, remaining)} items of {title}? (Y/n): ").strip().lower()
                    if response not in ('', 'y', 'yes'):
                        break
                except (EOFError, KeyboardInterrupt):
                    print(f"  ... and {remaining} more items.")
                    break
        print("")
 
    # Classes & Methods (Python)
    classes = manifest_data.get("classes", [])
    if classes:
        print("Classes:")
        class_list = classes if isinstance(classes, list) else (list(classes.values()) if isinstance(classes, dict) else [])
        for cls in class_list:
            name = cls.get("name", "Unknown")
            start = cls.get("start_line", "?")
            end = cls.get("end_line", "?")
            extra = format_extra_fields(cls, {'name', 'start_line', 'end_line', 'methods'})
            print(f"  - Class '{name}' (Lines {start}-{end}){extra}")
            methods = cls.get("methods", [])
            meth_list = methods if isinstance(methods, list) else (list(methods.values()) if isinstance(methods, dict) else [])
            for meth in meth_list:
                m_name = meth.get("name", "Unknown")
                m_start = meth.get("start_line", "?")
                m_end = meth.get("end_line", "?")
                m_extra = format_extra_fields(meth, {'name', 'start_line', 'end_line'})
                print(f"    * Method '{m_name}' (Lines {m_start}-{m_end}){m_extra}")
        print("")
 
    # Functions (Python / JS)
    functions = manifest_data.get("functions", [])
    func_list = functions if isinstance(functions, list) else (list(functions.values()) if isinstance(functions, dict) else [])
    print_items_interactive(
        "Functions",
        func_list,
        lambda fn: f"'{fn.get('name', 'Unknown')}' (Lines {fn.get('start_line', '?')}-{fn.get('end_line', '?')}){format_extra_fields(fn, {'name', 'start_line', 'end_line'})}"
    )
 
    # JS Objects
    objects = manifest_data.get("objects", [])
    if objects:
        print("JS Objects:")
        obj_list = objects if isinstance(objects, list) else (list(objects.values()) if isinstance(objects, dict) else [])
        for obj in obj_list:
            name = obj.get("name", "Unknown")
            start = obj.get("start_line", "?")
            end = obj.get("end_line", "?")
            extra = format_extra_fields(obj, {'name', 'start_line', 'end_line', 'methods'})
            print(f"  - Object '{name}' (Lines {start}-{end}){extra}")
            methods = obj.get("methods", [])
            meth_list = methods if isinstance(methods, list) else (list(methods.values()) if isinstance(methods, dict) else [])
            for meth in meth_list:
                m_name = meth.get("name", "Unknown")
                m_start = meth.get("start_line", "?")
                m_end = meth.get("end_line", "?")
                m_extra = format_extra_fields(meth, {'name', 'start_line', 'end_line'})
                print(f"    * Method '{m_name}' (Lines {m_start}-{m_end}){m_extra}")
        print("")
 
    # Alpine Components
    alpine_comps = manifest_data.get("alpine_components", [])
    alpine_comps_list = alpine_comps if isinstance(alpine_comps, list) else (list(alpine_comps.values()) if isinstance(alpine_comps, dict) else [])
    print_items_interactive(
        "Alpine Components",
        alpine_comps_list,
        lambda ac: f"'{ac.get('name', 'Unknown')}' (Lines {ac.get('start_line', '?')}-{ac.get('end_line', '?')}){format_extra_fields(ac, {'name', 'start_line', 'end_line'})}"
    )
 
    # Alpine Properties
    alpine_props = manifest_data.get("alpine_properties", [])
    alpine_props_list = alpine_props if isinstance(alpine_props, list) else (list(alpine_props.values()) if isinstance(alpine_props, dict) else [])
    print_items_interactive(
        "Alpine Properties",
        alpine_props_list,
        lambda ap: f"'{ap.get('name', 'Unknown')}' (Lines {ap.get('start_line', '?')}-{ap.get('end_line', '?')}){format_extra_fields(ap, {'name', 'start_line', 'end_line'})}"
    )
 
    # Alpine Methods
    alpine_meths = manifest_data.get("alpine_methods", [])
    alpine_meths_list = alpine_meths if isinstance(alpine_meths, list) else (list(alpine_meths.values()) if isinstance(alpine_meths, dict) else [])
    print_items_interactive(
        "Alpine Methods",
        alpine_meths_list,
        lambda am: f"'{am.get('name', 'Unknown')}' (Lines {am.get('start_line', '?')}-{am.get('end_line', '?')}){format_extra_fields(am, {'name', 'start_line', 'end_line'})}"
    )
 
    # Jinja Blocks
    jinja_blks = manifest_data.get("jinja_blocks", [])
    jinja_blks_list = jinja_blks if isinstance(jinja_blks, list) else (list(jinja_blks.values()) if isinstance(jinja_blks, dict) else [])
    print_items_interactive(
        "Jinja Blocks",
        jinja_blks_list,
        lambda jb: f"'{jb.get('name', 'Unknown')}' (Lines {jb.get('start_line', '?')}-{jb.get('end_line', '?')}){format_extra_fields(jb, {'name', 'start_line', 'end_line'})}"
    )
 
    # CSS Sections
    sections = manifest_data.get("sections", [])
    if sections:
        print("CSS Sections:")
        sec_list = sections if isinstance(sections, list) else (list(sections.values()) if isinstance(sections, dict) else [])
        for sec in sec_list:
            name = sec.get("name", "Unknown")
            start = sec.get("start_line", "?")
            end = sec.get("end_line", "?")
            selectors = sec.get("selectors", [])
            sec_extra = format_extra_fields(sec, {'name', 'start_line', 'end_line', 'selectors'})
            print(f"  - Section '{name}' (Lines {start}-{end}, {len(selectors)} selectors){sec_extra}")
            printed_sels = 0
            while printed_sels < len(selectors):
                batch_end = min(printed_sels + dynamic_cap, len(selectors))
                for i in range(printed_sels, batch_end):
                    sel = selectors[i]
                    sel_extra = format_extra_fields(sel, {'selector', 'start_line', 'end_line'})
                    print(f"    * '{sel.get('selector', 'Unknown')}' (Lines {sel.get('start_line', '?')}-{sel.get('end_line', '?')}){sel_extra}")
                printed_sels = batch_end
                
                if printed_sels < len(selectors):
                    remaining = len(selectors) - printed_sels
                    if not force_interactive and not sys.stdin.isatty():
                        print(f"    * ... and {remaining} more selectors.")
                        break
                    try:
                        response = input(f"Show next {min(dynamic_cap, remaining)} selectors in Section '{name}'? (Y/n): ").strip().lower()
                        if response not in ('', 'y', 'yes'):
                            break
                    except (EOFError, KeyboardInterrupt):
                        print(f"    * ... and {remaining} more selectors.")
                        break
        print("")

    # Landmarks
    landmarks = manifest_data.get("landmarks", [])
    landmarks_list = landmarks if isinstance(landmarks, list) else (list(landmarks.values()) if isinstance(landmarks, dict) else [])
    print_items_interactive(
        "Landmarks",
        landmarks_list,
        lambda lm: f"ID '{lm.get('id', lm.get('name', 'Unknown'))}' (Line {lm.get('line', lm.get('start_line', '?'))}){format_extra_fields(lm, {'id', 'name', 'line', 'start_line'})}"
    )

    # Headings
    headings = manifest_data.get("headings", [])
    headings_list = headings if isinstance(headings, list) else (list(headings.values()) if isinstance(headings, dict) else [])
    print_items_interactive(
        "Headings",
        headings_list,
        lambda h: f"'{h.get('text', 'Unknown')}' (Lines {h.get('start_line', '?')}-{h.get('end_line', '?')}){format_extra_fields(h, {'text', 'start_line', 'end_line'})}"
    )

    # DOM Bindings (Typically large, cap at 10 on budget constraints, but dynamic here)
    dom_binds = manifest_data.get("dom_bindings", [])
    dom_binds_list = dom_binds if isinstance(dom_binds, list) else (list(dom_binds.values()) if isinstance(dom_binds, dict) else [])
    print_items_interactive(
        "DOM Bindings",
        dom_binds_list,
        lambda db: f"'{db.get('name', 'Unknown')}' [{db.get('type', 'Unknown')}] (Lines {db.get('start_line', '?')}-{db.get('end_line', '?')}){format_extra_fields(db, {'name', 'type', 'start_line', 'end_line'})}",
        cap=10 if dynamic_cap == 100 else 9999
    )

    print("Note: The raw manifest JSON file was not shown because it exceeds 500 lines.")
    print("To view the raw JSON lines, run with explicit line range, e.g.:")
    print(f"  ctx read {file_path} --start 1 --end 100")

class ReadRequest:
    def __init__(self, **kwargs):
        self.file_path = kwargs.get("file_path")
        self.start = kwargs.get("start", 1)
        self.end = kwargs.get("end")
        self.symbol = kwargs.get("symbol")
        self.ignore_case = kwargs.get("ignore_case", False)
        self.interactive = kwargs.get("interactive", False)
        self.with_map = kwargs.get("with_map", False)
        self.context = kwargs.get("context", "auto")
        self.include = kwargs.get("include", "")
        self.before = kwargs.get("before", 0)
        self.after = kwargs.get("after", 0)
        self.expand_from = kwargs.get("expand_from")
        self.json = kwargs.get("json", False)
        self.force = kwargs.get("force", False)
        self.allow_unsafe_read = kwargs.get("allow_unsafe_read", False)
        self.ignore_session_hint = kwargs.get("ignore_session_hint", False)
        self.whole_if_small = kwargs.get("whole_if_small")


def _split_csv(value):
    if isinstance(value, list):
        return [str(part).strip() for part in value if str(part).strip()]
    return [part.strip() for part in str(value or "").split(",") if part.strip()]


def _parse_read_spec(spec, defaults):
    if ":" not in spec and defaults.file_path:
        spec = f"{defaults.file_path}:{spec}"
    raw_parts = spec.split(":")
    parts = None
    for idx in range(1, len(raw_parts)):
        candidate_file = ":".join(raw_parts[:idx])
        if os.path.exists(candidate_file):
            parts = [candidate_file] + raw_parts[idx:]
            break
    if parts is None:
        parts = raw_parts
    if len(parts) < 2:
        raise ValueError(f"Invalid --read target '{spec}'. Expected <file>:<symbol> or <file>:<start>-<end>.")
    file_path = parts[0]
    target = parts[1]
    request = {
        "file_path": file_path,
        "start": defaults.start,
        "end": defaults.end,
        "symbol": None,
        "ignore_case": defaults.ignore_case,
        "interactive": defaults.interactive,
        "with_map": defaults.with_map,
        "context": defaults.context,
        "include": defaults.include,
        "before": defaults.before,
        "after": defaults.after,
        "expand_from": defaults.expand_from,
        "json": defaults.json,
        "force": defaults.force,
        "allow_unsafe_read": defaults.allow_unsafe_read,
        "ignore_session_hint": defaults.ignore_session_hint,
        "whole_if_small": defaults.whole_if_small,
    }
    if "-" in target and target.replace("-", "").replace("_", "").isdigit():
        start_text, end_text = target.split("-", 1)
        request["start"] = int(start_text)
        request["end"] = int(end_text)
    else:
        request["symbol"] = target

    for option in parts[2:]:
        if option == "with-map":
            request["with_map"] = True
        elif "=" in option:
            key, value = option.split("=", 1)
            key = key.replace("-", "_")
            if key in {"before", "after", "start", "end", "whole_if_small"}:
                request[key] = int(value)
            elif key == "expand_from":
                request["expand_from"] = value
            elif key in request:
                request[key] = value
    return ReadRequest(**request)


def _requests_from_batch_file(path, defaults):
    with open(path, "r", encoding="utf-8") as f:
        payload = json.load(f)
    reads = payload.get("reads", payload if isinstance(payload, list) else [])
    requests = []
    for item in reads:
        data = {
            "file_path": item.get("file") or item.get("file_path"),
            "start": item.get("start", defaults.start),
            "end": item.get("end", defaults.end),
            "symbol": item.get("symbol"),
            "ignore_case": item.get("ignore_case", defaults.ignore_case),
            "interactive": item.get("interactive", defaults.interactive),
            "with_map": item.get("with_map", defaults.with_map),
            "context": item.get("context", defaults.context),
            "include": ",".join(item.get("include", [])) if isinstance(item.get("include"), list) else item.get("include", defaults.include),
            "before": item.get("before", defaults.before),
            "after": item.get("after", defaults.after),
            "expand_from": item.get("expand_from", defaults.expand_from),
            "json": defaults.json,
            "force": item.get("force", defaults.force),
            "allow_unsafe_read": item.get("allow_unsafe_read", defaults.allow_unsafe_read),
            "ignore_session_hint": item.get("ignore_session_hint", defaults.ignore_session_hint),
            "whole_if_small": item.get("whole_if_small", defaults.whole_if_small),
        }
        requests.append(ReadRequest(**data))
    return payload.get("session"), requests


def execute_read_request(args, session, *, explicit_session=False):
    session = ctx.resolve_session_id(
        session,
        adopt_hint=not getattr(args, "ignore_session_hint", False),
    )
    file_path = args.file_path
    start = max(1, args.start or 1)
    end = args.end
    result = {
        "status": "ready",
        "file": ctx.rel_path_for(file_path or ""),
        "token": None,
        "metadata": {},
        "emitted_lines": 0,
        "estimated_tokens": 0,
    }

    symbol_read = False
    symbol_name = args.symbol
    if args.symbol:
        # Dynamically import symbol finder to reuse symbol parsing.
        try:
            from . import find_symbol as ai_find_function
        except ImportError as e:
            print(f"Error: Could not import ai_find_function.py: {e}", file=sys.stderr)
            result["status"] = "error"
            result["error"] = str(e)
            return result

        if file_path:
            if not os.path.isfile(file_path):
                print(f"Error: File '{file_path}' does not exist.")
                result["status"] = "error"
                result["error"] = "missing_file"
                return result
            try:
                matches = ai_find_function.find_symbol_live(file_path, args.symbol, args.ignore_case)
            except Exception as e:
                print(f"Error searching symbol: {e}", file=sys.stderr)
                result["status"] = "error"
                result["error"] = str(e)
                return result

            if not matches:
                fallback_found = False
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        lines = f.readlines()
                    for i, line in enumerate(lines):
                        match_line = (args.symbol.lower() in line.lower()) if args.ignore_case else (args.symbol in line)
                        if match_line:
                            fallback_found = True
                            found_line = i + 1
                            start = max(1, found_line - 10)
                            end = min(len(lines), found_line + 39)
                            print(f"Warning: Structural symbol '{args.symbol}' not found. Falling back to literal text search.")
                            print(f"Found literal match for '{args.symbol}' at line {found_line}.")
                            break
                except Exception:
                    pass

                if not fallback_found:
                    print(f"Error: Symbol or literal text '{args.symbol}' not found in '{file_path}'")
                    result["status"] = "error"
                    result["error"] = "symbol_not_found"
                    return result
            else:
                symbol_type, name, start, end = matches[0]
                print(f"Found [{symbol_type.upper()}] '{name}' in '{file_path}' at lines {start}-{end}")
                symbol_read = True
        else:
            matches = ai_find_function.find_globally(args.symbol, ignore_case=args.ignore_case)
            if not matches:
                print(f"Error: Symbol '{args.symbol}' not found globally in Layer 3 manifests. (If this is a local variable or non-structural text, you MUST provide the file_path to trigger the literal text search fallback! Example: ctx read <file_path> --symbol {args.symbol})")
                result["status"] = "error"
                result["error"] = "symbol_not_found"
                return result

            if len(matches) == 1:
                match = matches[0]
                file_path = match["file"]
                result["file"] = ctx.rel_path_for(file_path)
                symbol_type = match["type"]
                start, end = match["lines"]
                print(f"Found unique match [{symbol_type.upper()}] '{args.symbol}' in '{file_path}' at lines {start}-{end}")
                symbol_read = True
            else:
                print(f"Found {len(matches)} match(es) for symbol '{args.symbol}':")
                for match in matches:
                    f = match["file"]
                    t = match["type"]
                    s, e = match["lines"]
                    print(f"  - [{t.upper()}] {f} -> Lines {s}-{e}")
                result["status"] = "ambiguous"
                return result

    if not file_path:
        print("Error: No file resolved or specified for surgical read.")
        result["status"] = "error"
        result["error"] = "missing_file"
        return result

    if not os.path.isfile(file_path):
        print(f"Error: File '{file_path}' does not exist.")
        result["status"] = "error"
        result["error"] = "missing_file"
        return result

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
    except Exception as e:
        print(f"Error reading file '{file_path}': {e}")
        result["status"] = "error"
        result["error"] = str(e)
        return result

    total_lines = len(lines)
    is_manifest = file_path.endswith(".json") or ".ai_map" in file_path or ".focus_maps" in file_path

    whole_limit = getattr(args, "whole_if_small", None)
    if whole_limit is not None and not symbol_read and end is None and start == 1 and not is_manifest:
        if total_lines <= whole_limit and total_lines <= MAX_LINES:
            end = total_lines
            print(f"CTX_WHOLE_FILE file={ctx.rel_path_for(file_path)} lines={total_lines} limit={whole_limit}")
        else:
            reason = "max_lines" if total_lines <= whole_limit else "file_too_large"
            print(f"CTX_WHOLE_FILE_SKIPPED file={ctx.rel_path_for(file_path)} lines={total_lines} limit={whole_limit} reason={reason}")

    if is_manifest and total_lines > 500 and args.end is None and start == 1:
        try:
            manifest_content = "".join(lines)
            manifest_data = json.loads(manifest_content)
            source_file = manifest_data.get("file_path")
            if source_file:
                ctx.append_event(session, {"type": "manifest", "file": ctx.rel_path_for(source_file), "path": ctx.rel_path_for(file_path)})
            print_manifest_summary(file_path, manifest_data, force_interactive=args.interactive)
            result["status"] = "manifest"
            return result
        except Exception as e:
            print(f"Warning: Failed to parse manifest JSON for summarization: {e}. Falling back to raw printing.")

    if is_manifest and args.end is None and start == 1:
        try:
            manifest_data = json.loads("".join(lines))
            source_file = manifest_data.get("file_path")
            if source_file:
                ctx.append_event(session, {"type": "manifest", "file": ctx.rel_path_for(source_file), "path": ctx.rel_path_for(file_path)})
        except Exception:
            pass

    if end is None:
        end = total_lines if is_manifest else min(total_lines, start + 49)

    if end < start:
        print("Error: --end must be greater than or equal to --start")
        result["status"] = "error"
        result["error"] = "invalid_range"
        return result

    requested_lines = end - start + 1
    if requested_lines > MAX_LINES and not is_manifest:
        print(f"Warning: Requested {requested_lines} lines. Truncating to {MAX_LINES} lines to protect AI context window.")
        end = start + MAX_LINES - 1

    actual_end = min(end, total_lines)

    if is_manifest:
        print(f"--- File: {file_path} (Lines {start} to {actual_end} of {total_lines}) ---")
        for i in range(start - 1, actual_end):
            print(f"{i + 1}: {lines[i].rstrip()}")
        if actual_end < total_lines:
            print(f"--- [File truncated at line {actual_end}] ---")
        result["status"] = "manifest"
        return result

    base_ranges = [ctx.Range(start, actual_end, "symbol" if symbol_read else "range")]
    manifest_data, manifest_path = ctx.load_manifest(file_path)
    include = _split_csv(args.include)

    # UNCONDITIONALLY inject imports and exports context for JS/HTML files
    if file_path.endswith((".js", ".ts", ".html")):
        if "imports" not in include:
            include.append("imports")
        if "exports" not in include:
            include.append("exports")
    if file_path.endswith((".html", ".htm")) and "template-blocks" not in include:
        include.append("template-blocks")

    grant = ctx.find_grant(session, args.expand_from) if args.expand_from else None
    if args.expand_from and grant:
        base_ranges = [ctx.Range(r["start"], r["end"], r.get("reason", "grant")) for r in grant.get("ranges", [])]
    elif args.expand_from and not grant:
        owners = ctx.find_grant_owners(args.expand_from, preferred_sessions=[session])
        if explicit_session:
            print(f"CTX_BLOCKED token={args.expand_from} reason=expand_token_session_mismatch session={session}")
            if owners:
                print("Suggested explicit session commands:")
                for owner in owners[:5]:
                    print(f"  - ctx read {ctx.rel_path_for(file_path)} --expand-from {args.expand_from} --session {owner['session']}")
            result["status"] = "blocked"
            result["reason"] = "expand_token_session_mismatch"
            result["suggested_sessions"] = [owner["session"] for owner in owners]
            return result
        if len(owners) == 1:
            session = owners[0]["session"]
            grant = owners[0]["grant"]
            print(f"CTX_SESSION_RESOLVED token={args.expand_from} session={session} reason=expand_token_owner")
            base_ranges = [ctx.Range(r["start"], r["end"], r.get("reason", "grant")) for r in grant.get("ranges", [])]
        elif len(owners) > 1:
            print(f"CTX_BLOCKED token={args.expand_from} reason=ambiguous_expand_token")
            print("Suggested explicit session commands:")
            for owner in owners[:5]:
                print(f"  - ctx read {ctx.rel_path_for(file_path)} --expand-from {args.expand_from} --session {owner['session']}")
            result["status"] = "blocked"
            result["reason"] = "ambiguous_expand_token"
            result["suggested_sessions"] = [owner["session"] for owner in owners]
            return result
        else:
            print(f"CTX_BLOCKED token={args.expand_from} reason=unknown_expand_token")
            result["status"] = "blocked"
            result["reason"] = "unknown_expand_token"
            return result

    ranges = ctx.include_ranges(file_path, base_ranges, include, manifest_data, lines=lines)
    ranges = ctx.apply_padding(ranges, args.before, args.after, total_lines)

    protected = ctx.is_protected_source(file_path)
    session_hint = None
    if protected and not args.ignore_session_hint:
        session_hint = ctx.session_missing_hint(session, "protected_read_without_session")
        if session_hint:
            print(ctx.session_missing_marker(session_hint))
    auto_map = protected and not args.expand_from and not ctx.has_manifest_grant(session, file_path)
    has_manifest_context = args.with_map or auto_map or ctx.has_manifest_grant(session, file_path)
    authorized = symbol_read or args.with_map or args.expand_from or has_manifest_context

    if protected and not authorized and not args.allow_unsafe_read:
        print(f"CTX_BLOCKED file={ctx.rel_path_for(file_path)} range={start}-{actual_end} reason=missing_manifest_or_provenance")
        print("Suggested compliant commands:")
        for command in ctx.suggested_commands(file_path, start, actual_end):
            print(f"  - {command}")
        result.update({
            "status": "blocked",
            "file": ctx.rel_path_for(file_path),
            "range": {"start": start, "end": actual_end},
            "suggested": ctx.suggested_commands(file_path, start, actual_end),
        })
        return result

    if args.with_map or auto_map or args.context == "manifest":
        if auto_map and not args.with_map and args.context != "manifest":
            print(f"CTX_AUTO_MAP file={ctx.rel_path_for(file_path)} reason=first_protected_read")
        relevance = ctx.relevance_marker(ctx.find_recommendation(session, file_path))
        if relevance:
            print(relevance)
        print(ctx.compact_manifest_text(manifest_path or ctx.manifest_path_for(file_path), manifest_data))
        if protected:
            ctx.append_event(session, {"type": "manifest", "file": ctx.rel_path_for(file_path), "path": manifest_path or ctx.manifest_path_for(file_path)})

    token = ctx.token_for(file_path, ranges, "symbol" if symbol_read else "range", session)
    result["token"] = token
    if symbol_read or args.with_map or args.expand_from or args.allow_unsafe_read:
        event = ctx.grant_event(file_path, ranges, "symbol" if symbol_read else ("unsafe" if args.allow_unsafe_read else "range"), token, compliant=not args.allow_unsafe_read)
        ctx.append_event(session, event)
        status = "CTX_UNSAFE_GRANT" if args.allow_unsafe_read else "CTX_GRANT"
        print(f"{status} token={token} file={ctx.rel_path_for(file_path)} ranges={ctx.format_ranges(ranges)}")

    if args.context == "breadcrumb" or (args.context == "auto" and symbol_read):
        try:
            print(ctx.breadcrumb_text(file_path, manifest_data, start, actual_end, symbol_name))
        except Exception as e:
            print(f"CTX_BREADCRUMB_ERROR reason={e}")

    render_ranges = ranges
    if ctx.is_default_session(session):
        prior_ranges = ctx.prior_read_ranges(session, file_path)
        if prior_ranges:
            print(f"CTX_SESSION_WARNING session=default file={ctx.rel_path_for(file_path)} reason=duplicate_suppression_disabled")
    elif not args.force:
        prior = ctx.prior_read(session, file_path, ranges)
        prior_ranges = ctx.prior_read_ranges(session, file_path)
        missing_ranges = ctx.subtract_prior_ranges(ranges, prior_ranges)
        overlap = ctx.overlap_status(ranges, missing_ranges)
        if overlap == "exact":
            prior_token = prior.get("token") if prior else token
            print(f"CTX_DUPLICATE token={prior_token} file={ctx.rel_path_for(file_path)} reason=range_already_emitted")
            result["status"] = "duplicate"
            return result
        if overlap == "partial":
            print(f"CTX_PARTIAL_DUPLICATE file={ctx.rel_path_for(file_path)} already={ctx.format_ranges(prior_ranges)} emitting={ctx.format_ranges(missing_ranges)}")
            render_ranges = missing_ranges
            result["status"] = "partial_duplicate"

    output_text, metadata = ctx.render_source(file_path, render_ranges, max_lines=MAX_LINES, lines=lines)
    print(output_text)
    print(ctx.budget_marker(metadata, token))
    ctx.record_read(session, file_path, render_ranges, token, metadata)
    result["metadata"] = metadata
    result["emitted_lines"] = metadata.get("emitted_lines", 0)
    result["estimated_tokens"] = metadata.get("estimated_tokens", 0)
    result["file"] = ctx.rel_path_for(file_path)
    result["ranges"] = [r.as_dict() for r in ctx.merge_ranges(render_ranges)]
    result["compliant"] = not args.allow_unsafe_read
    return result


def main():
    parser = argparse.ArgumentParser(description="Surgically read specific lines of a file to protect AI context windows.")
    parser.add_argument("file_path", nargs="?", help="Path to the file to read")
    parser.add_argument("--start", type=int, default=1, help="Start line (1-indexed)")
    parser.add_argument("--end", type=int, help="End line (inclusive)")
    parser.add_argument("--symbol", help="Name of the symbol (function, class, method, CSS selector, Alpine component, Jinja block, Markdown heading) to find and read")
    parser.add_argument("-i", "--ignore-case", action="store_true", help="Perform case-insensitive symbol or fallback literal search")
    parser.add_argument("-p", "--interactive", action="store_true", help="Force interactive paging prompts")
    parser.add_argument("-m", "--with-map", action="store_true", help="Print compact manifest context before source and authorize this range read")
    parser.add_argument("--context", choices=["none", "breadcrumb", "manifest", "auto"], default="auto", help="Context to print around symbol/range reads")
    parser.add_argument("--include", default="", help="Comma-separated context expansions: imports,decorators,neighbors,top-level,fixtures,routes,template-blocks")
    parser.add_argument("--before", type=int, default=0, help="Lines of bounded context before requested ranges")
    parser.add_argument("--after", type=int, default=0, help="Lines of bounded context after requested ranges")
    parser.add_argument("--expand-from", help="Expand from a prior CTX token")
    parser.add_argument("--session", default=None, help="Context pipeline session id")
    parser.add_argument("--json", action="store_true", help="Emit structured JSON metadata")
    parser.add_argument("--force", action="store_true", help="Reprint duplicate source ranges")
    parser.add_argument("--allow-unsafe-read", action="store_true", help="Debug-only bypass for protected source reads; marked non-compliant")
    parser.add_argument("--ignore-session-hint", action="store_true", help="Continue under default session even when a current context session hint exists")
    parser.add_argument("--whole-if-small", type=int, help=f"Read the whole file when it has at most N lines, capped at {MAX_LINES} lines")
    parser.add_argument("--read", action="append", default=[], help="Batch read target: <file>:<symbol>, <file>:<start>-<end>, or with a positional file: <symbol>/<start>-<end>")
    parser.add_argument("--file", dest="file_alias", help="Alias for positional file_path, useful with --read")
    parser.add_argument("--batch", help="JSON batch request file with a reads array")

    args = parser.parse_args()
    if args.file_alias:
        args.file_path = args.file_alias

    # Reconfigure stdout to gracefully handle non-ASCII/Unicode symbols on Windows consoles
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(errors='replace')

    if not args.file_path and not args.symbol and not args.read and not args.batch:
        parser.print_help()
        print("\nError: You must specify a 'file_path', '--symbol', '--read', or '--batch'.")
        sys.exit(1)

    if args.read or args.batch:
        requests = []
        batch_session = None
        if args.batch:
            try:
                batch_session, requests = _requests_from_batch_file(args.batch, args)
            except Exception as e:
                print(f"Error: Could not parse batch file '{args.batch}': {e}")
                sys.exit(1)
        for spec in args.read:
            try:
                requests.append(_parse_read_spec(spec, args))
            except ValueError as e:
                print(f"Error: {e}")
                sys.exit(1)
        session = ctx.resolve_session_id(
            batch_session or args.session,
            adopt_hint=not args.ignore_session_hint,
        )
        print(f"CTX_BATCH_START reads={len(requests)} session={session}")
        items = []
        summary = {"ready": 0, "blocked": 0, "duplicate": 0, "partial_duplicate": 0, "emitted_lines": 0, "estimated_tokens": 0}
        for index, request in enumerate(requests, 1):
            result = execute_read_request(request, session, explicit_session=bool(batch_session or args.session))
            status = result.get("status", "ready")
            if status in summary:
                summary[status] += 1
            elif status in {"manifest", "ambiguous"}:
                summary["ready"] += 1
            else:
                summary["blocked"] += 1
            summary["emitted_lines"] += int(result.get("emitted_lines", 0) or 0)
            summary["estimated_tokens"] += int(result.get("estimated_tokens", 0) or 0)
            print(f"CTX_BATCH_ITEM index={index} file={result.get('file')} status={status}")
            items.append(result)
        aggregate_status = "blocked" if summary["blocked"] and not summary["ready"] else ("partial" if summary["blocked"] else "ready")
        print(
            f"CTX_BATCH_END ready={summary['ready']} blocked={summary['blocked']} "
            f"duplicate={summary['duplicate']} partial={summary['partial_duplicate']} "
            f"emitted_lines={summary['emitted_lines']} est_tokens={summary['estimated_tokens']}"
        )
        if args.json:
            print(json.dumps({"status": aggregate_status, "session": session, "items": items, "summary": summary}, indent=2))
        return

    request = ReadRequest(**vars(args))
    result = execute_read_request(request, args.session, explicit_session=bool(args.session))
    if args.json:
        if result.get("status") == "blocked":
            print(json.dumps(result, indent=2))
        else:
            print(json.dumps(result, indent=2))
    if result.get("status") == "ambiguous":
        sys.exit(0)
    if result.get("status") == "blocked":
        sys.exit(1)
    if result.get("status") == "error":
        sys.exit(1)
    return

    # Legacy implementation kept unreachable intentionally by the shared executor above.
    file_path = args.file_path
    start = max(1, args.start)
    end = args.end

    symbol_read = False
    symbol_name = args.symbol
    if args.symbol:
        # Dynamically import symbol finder to reuse symbol parsing.
        try:
            from . import find_symbol as ai_find_function
        except ImportError as e:
            print(f"Error: Could not import ai_find_function.py: {e}", file=sys.stderr)
            sys.exit(1)

        if file_path:
            if not os.path.isfile(file_path):
                print(f"Error: File '{file_path}' does not exist.")
                sys.exit(1)
            try:
                matches = ai_find_function.find_symbol_live(file_path, args.symbol, args.ignore_case)
            except Exception as e:
                print(f"Error searching symbol: {e}", file=sys.stderr)
                sys.exit(1)

            if not matches:
                fallback_found = False
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        lines = f.readlines()
                    for i, line in enumerate(lines):
                        match_line = (args.symbol.lower() in line.lower()) if args.ignore_case else (args.symbol in line)
                        if match_line:
                            fallback_found = True
                            found_line = i + 1
                            start = max(1, found_line - 10)
                            end = min(len(lines), found_line + 39)
                            print(f"Warning: Structural symbol '{args.symbol}' not found. Falling back to literal text search.")
                            print(f"Found literal match for '{args.symbol}' at line {found_line}.")
                            break
                except Exception:
                    pass
                
                if not fallback_found:
                    print(f"Error: Symbol or literal text '{args.symbol}' not found in '{file_path}'")
                    sys.exit(1)
            else:
                # Take the first match
                symbol_type, name, start, end = matches[0]
                print(f"Found [{symbol_type.upper()}] '{name}' in '{file_path}' at lines {start}-{end}")
                symbol_read = True
        else:
            # Global symbol search
            matches = ai_find_function.find_globally(args.symbol, ignore_case=args.ignore_case)
            if not matches:
                print(f"Error: Symbol '{args.symbol}' not found globally in Layer 3 manifests. (If this is a local variable or non-structural text, you MUST provide the file_path to trigger the literal text search fallback! Example: ctx read <file_path> --symbol {args.symbol})")
                sys.exit(1)

            if len(matches) == 1:
                match = matches[0]
                file_path = match["file"]
                symbol_type = match["type"]
                start, end = match["lines"]
                print(f"Found unique match [{symbol_type.upper()}] '{args.symbol}' in '{file_path}' at lines {start}-{end}")
                symbol_read = True
            else:
                print(f"Found {len(matches)} match(es) for symbol '{args.symbol}':")
                for match in matches:
                    f = match["file"]
                    t = match["type"]
                    s, e = match["lines"]
                    print(f"  - [{t.upper()}] {f} -> Lines {s}-{e}")
                sys.exit(0)

    # Standard range-based read
    if not file_path:
        print("Error: No file resolved or specified for surgical read.")
        sys.exit(1)

    if not os.path.isfile(file_path):
        print(f"Error: File '{file_path}' does not exist.")
        sys.exit(1)

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
    except Exception as e:
        print(f"Error reading file '{file_path}': {e}")
        sys.exit(1)

    total_lines = len(lines)

    is_manifest = file_path.endswith(".json") or ".ai_map" in file_path or ".focus_maps" in file_path

    # Check if we should summarize the manifest
    if is_manifest and total_lines > 500 and args.end is None and args.start == 1:
        try:
            manifest_content = "".join(lines)
            manifest_data = json.loads(manifest_content)
            source_file = manifest_data.get("file_path")
            if source_file:
                ctx.append_event(args.session, {"type": "manifest", "file": ctx.rel_path_for(source_file), "path": ctx.rel_path_for(file_path)})
            print_manifest_summary(file_path, manifest_data, force_interactive=args.interactive)
            return
        except Exception as e:
            print(f"Warning: Failed to parse manifest JSON for summarization: {e}. Falling back to raw printing.")

    if is_manifest and args.end is None and args.start == 1:
        try:
            manifest_data = json.loads("".join(lines))
            source_file = manifest_data.get("file_path")
            if source_file:
                ctx.append_event(args.session, {"type": "manifest", "file": ctx.rel_path_for(source_file), "path": ctx.rel_path_for(file_path)})
        except Exception:
            pass

    if end is None:
        # If reading a manifest map file, default to printing the whole file at once
        if is_manifest:
            end = total_lines
        else:
            end = min(total_lines, start + 49) # Default to 50 lines chunk

    if end < start:
        print("Error: --end must be greater than or equal to --start")
        sys.exit(1)

    requested_lines = end - start + 1
    if requested_lines > MAX_LINES and not is_manifest:
        print(f"Warning: Requested {requested_lines} lines. Truncating to {MAX_LINES} lines to protect AI context window.")
        end = start + MAX_LINES - 1

    actual_end = min(end, total_lines)

    if is_manifest:
        print(f"--- File: {file_path} (Lines {start} to {actual_end} of {total_lines}) ---")
        for i in range(start - 1, actual_end):
            print(f"{i + 1}: {lines[i].rstrip()}")
        if actual_end < total_lines:
            print(f"--- [File truncated at line {actual_end}] ---")
        return

    base_ranges = [ctx.Range(start, actual_end, "symbol" if symbol_read else "range")]
    manifest_data, manifest_path = ctx.load_manifest(file_path)
    include = [part.strip() for part in args.include.split(",") if part.strip()]

    grant = ctx.find_grant(args.session, args.expand_from) if args.expand_from else None
    if args.expand_from and grant:
        base_ranges = [ctx.Range(r["start"], r["end"], r.get("reason", "grant")) for r in grant.get("ranges", [])]
    elif args.expand_from and not grant:
        print(f"CTX_BLOCKED token={args.expand_from} reason=unknown_expand_token")
        sys.exit(1)

    ranges = ctx.include_ranges(file_path, base_ranges, include, manifest_data, lines=lines)
    ranges = ctx.apply_padding(ranges, args.before, args.after, total_lines)

    protected = ctx.is_protected_source(file_path)
    has_manifest_context = args.with_map or ctx.has_manifest_grant(args.session, file_path)
    authorized = symbol_read or args.with_map or args.expand_from or has_manifest_context

    if protected and not authorized and not args.allow_unsafe_read:
        print(f"CTX_BLOCKED file={ctx.rel_path_for(file_path)} range={start}-{actual_end} reason=missing_manifest_or_provenance")
        print("Suggested compliant commands:")
        for command in ctx.suggested_commands(file_path, start, actual_end):
            print(f"  - {command}")
        if args.json:
            print(json.dumps({
                "status": "blocked",
                "file": ctx.rel_path_for(file_path),
                "range": {"start": start, "end": actual_end},
                "suggested": ctx.suggested_commands(file_path, start, actual_end),
            }, indent=2))
        sys.exit(1)

    if args.with_map or args.context == "manifest":
        print(ctx.compact_manifest_text(manifest_path or ctx.manifest_path_for(file_path), manifest_data))

    token = ctx.token_for(file_path, ranges, "symbol" if symbol_read else "range", args.session)
    if symbol_read or args.with_map or args.expand_from or args.allow_unsafe_read:
        event = ctx.grant_event(file_path, ranges, "symbol" if symbol_read else ("unsafe" if args.allow_unsafe_read else "range"), token, compliant=not args.allow_unsafe_read)
        ctx.append_event(args.session, event)
        status = "CTX_UNSAFE_GRANT" if args.allow_unsafe_read else "CTX_GRANT"
        print(f"{status} token={token} file={ctx.rel_path_for(file_path)} ranges={','.join(f'{r.start}-{r.end}' for r in ctx.merge_ranges(ranges))}")

    if args.context == "breadcrumb" or (args.context == "auto" and symbol_read):
        try:
            print(ctx.breadcrumb_text(file_path, manifest_data, start, actual_end, symbol_name))
        except Exception as e:
            print(f"CTX_BREADCRUMB_ERROR reason={e}")

    prior = ctx.prior_read(args.session, file_path, ranges)
    if prior and not args.force:
        prior_token = prior.get("token")
        print(f"CTX_DUPLICATE token={prior_token} file={ctx.rel_path_for(file_path)} reason=exact_range_already_emitted")
        return

    output_text, metadata = ctx.render_source(file_path, ranges, max_lines=MAX_LINES, lines=lines)
    print(output_text)
    print(ctx.budget_marker(metadata, token))
    ctx.record_read(args.session, file_path, ranges, token, metadata)

    if args.json:
        print(json.dumps({
            "status": "ready",
            "token": token,
            "file": ctx.rel_path_for(file_path),
            "ranges": [r.as_dict() for r in ctx.merge_ranges(ranges)],
            "metadata": metadata,
            "compliant": not args.allow_unsafe_read,
        }, indent=2))

if __name__ == "__main__":
    main()
