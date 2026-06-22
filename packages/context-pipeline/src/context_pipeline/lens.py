#!/usr/bin/env python3
"""Source-free first-read recommendations for the context pipeline."""

import argparse
import json
import os
import sys

from . import core as ctx


def recommend(task: str, limit: int = 8) -> list[dict]:
    return ctx.source_candidates_for_task(task, limit=limit)


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(errors="replace")
    parser = argparse.ArgumentParser(description="Recommend source-free context pipeline entry points for a task.")
    parser.add_argument("--task", required=True, help="Task description to match against file manifests")
    parser.add_argument("--limit", type=int, default=8, help="Maximum recommendations")
    parser.add_argument("--session", default=None, help="Context pipeline session id")
    parser.add_argument("--json", action="store_true", help="Emit JSON")
    args = parser.parse_args()

    session = ctx.resolve_task_session_id(args.session, args.task)
    ctx.write_session_hint(session, args.task, source="context_lens")
    results = recommend(args.task, args.limit)
    for item in results:
        ctx.append_event(session, ctx.recommendation_event(item["file"], args.task, item.get("reason"), item.get("score")))
    batch_reads = [f"--read {item['file']}:1-60" for item in results[:5]]
    batch_command = f"ctx read " + " ".join(batch_reads) if batch_reads else None
    explicit_batch_command = f"ctx read --session {session} " + " ".join(batch_reads) if batch_reads else None
    if args.json:
        print(json.dumps({
            "task": args.task,
            "session": session,
            "index": {
                "skeleton": ".ai_map/project_skeleton.json",
                "manifests": ".ai_map/manifests",
            },
            "optional_batch": batch_command,
            "optional_batch_explicit_session": explicit_batch_command,
            "results": results,
        }, indent=2))
        return

    print(f"CTX_LENS task={args.task!r} session={session} results={len(results)}")
    print(f"session-env: $env:CTX_SESSION_ID=\"{session}\"")
    print("index: .ai_map/project_skeleton.json -> .ai_map/maps -> .ai_map/manifests")
    if not results:
        print("No manifest-backed recommendations found.")
        return
    for item in results:
        print(f"- score={item['score']} file={item['file']} reason={item['reason']}")
        print(f"  focused-read: ctx read {item['file']} --start 1 --end 60")
        print(f"  manifest: {item['suggested']}")
    if batch_command:
        print("Optional compact batch for already-chosen files:")
        print(f"  {batch_command}")


if __name__ == "__main__":
    main()
