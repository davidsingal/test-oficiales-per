"""Data pipeline for the official PER and Patrón de Yate exams.

    python main.py import-page FILE|- [--since YYYY-MM]
    python main.py discover [--from YYYY-MM] [--to YYYY-MM] [--retry-gaps] [--write]
    python main.py extract  [--cache DIR] [--output FILE]

extract fetches the original PDFs into the cache as needed, then writes every
PER and Patrón de Yate exam, its questions, options and correct answers to <output> (JSON). It
exits with status 1 if any error was found (the JSON is still written so it
can be inspected).
"""

from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from pathlib import Path

import sources
from common import Issues
from dataset import build
from discover import discover
from page import merge, parse_page


def report(issues: Issues) -> int:
    for w in issues.warnings:
        print(f"WARN  {w}", file=sys.stderr)
    for e in issues.errors:
        print(f"ERROR {e}", file=sys.stderr)
    return 1 if issues.errors else 0


def cmd_discover(args: argparse.Namespace) -> int:
    session_list = sources.load()
    print(f"Discovering sessions on the CDN (known: {len(session_list)})...")
    changed = discover(session_list, args.start, args.end, args.retry_gaps)
    print(f"Found new files for {len(changed)} session(s).")
    if changed and args.write:
        sources.save(session_list)
        print(f"Updated {sources.SOURCES_FILE.name}")
    elif changed:
        print("Re-run with --write to add them to sources.json.")
    missing = [f"{s.session} {k}" for s in session_list for k in sources.KINDS if not getattr(s, k)]
    if missing:
        print("Still missing (import a fresh copy of the exams page: scripts/data-sync.sh --page FILE):\n  " + "\n  ".join(missing))
    return 0


def cmd_import_page(args: argparse.Namespace) -> int:
    html = sys.stdin.read() if args.file == "-" else Path(args.file).read_text(encoding="utf-8", errors="replace")
    found = parse_page(html, args.since)
    if not found:
        print("No exam links found: is this the saved exams page?", file=sys.stderr)
        return 1
    session_list = sources.load()
    changes = merge(session_list, found)
    sources.save(session_list)
    print(f"Sessions on the page since {args.since}: {len(found)}")
    print("\n".join(changes) if changes else "sources.json already up to date.")
    return 0


def cmd_extract(args: argparse.Namespace) -> int:
    issues = Issues()
    dataset, overrides = build(args.cache, issues)
    print(f"Rectifications applied from PDF annotations: {overrides}")

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps({"exams": dataset}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    questions = [q for e in dataset for q in e["questions"]]
    topics = Counter(q["topic"] for q in questions)
    print(f"Exams:     {len(dataset)}")
    print(f"Questions: {len(questions)}")
    print(f"  with correct answers: {sum(1 for q in questions if q['correctAnswers'])}")
    print(f"  annulled:             {sum(1 for q in questions if q['correctAnswers'] == ['ANULADA'])}")
    print(f"  multiple correct:     {sum(1 for q in questions if len(q['correctAnswers']) > 1)}")
    print("Topics:")
    for name, count in sorted(topics.items()):
        print(f"  {count:5d}  {name}")

    print(f"\nWrote {args.output} ({len(issues.warnings)} warnings, {len(issues.errors)} errors)")
    return report(issues)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    commands = parser.add_subparsers(dest="command", required=True)

    p = commands.add_parser("import-page", help="update sources.json from a saved copy of the exams page")
    p.add_argument("file", help="saved HTML of the ministry's exams page, or - for stdin")
    p.add_argument("--since", default="2020-01", help="first session to import (YYYY-MM)")
    p.set_defaults(func=cmd_import_page)

    p = commands.add_parser("discover", help="find new sessions on the CDN")
    p.add_argument("--from", dest="start", help="first month to check (YYYY-MM)")
    p.add_argument("--to", dest="end", help="last month to check (YYYY-MM), default: this month")
    p.add_argument("--retry-gaps", action="store_true", help="also retry known sessions with a missing PDF")
    p.add_argument("--write", action="store_true", help="save what was found to sources.json")
    p.set_defaults(func=cmd_discover)

    p = commands.add_parser("extract", help="parse the PDFs into exams.json")
    p.add_argument("--cache", type=Path, default=Path("/data/cache"), help="where original PDFs are cached")
    p.add_argument("--output", type=Path, default=Path("/data/outputs/exams.json"))
    p.set_defaults(func=cmd_extract)

    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
