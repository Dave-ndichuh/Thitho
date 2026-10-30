"""
Thitho Ikũmbi CLI
Unified command line interface for data ingestion, database management, and query inspection.
"""

import argparse
import json
import sys
from pathlib import Path

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

from .normalizer import normalize_orthography, strip_tones
from .storage.db import IkumbiDB
from .storage.seed_data import seed_database


def cmd_init(args):
    print("🌾 Initializing Thitho Ikũmbi (The Granary)...")
    db = IkumbiDB(args.db)
    counts = seed_database(db)
    print("✅ Successfully initialized database schema and seeded baseline data:")
    for key, count in counts.items():
        print(f"   - {key.replace('_', ' ').capitalize()}: {count}")


def cmd_stats(args):
    db = IkumbiDB(args.db)
    stats = db.get_stats()
    print("\n📊 === Thitho Ikũmbi Corpus Statistics ===")
    print(f"Database Location: {stats['db_path']}")
    print(f"Total Words (Headwords):       {stats['total_words']:,}")
    print(f"Total Definitions & Senses:    {stats['total_definitions']:,}")
    print(f"Parallel Sentences:            {stats['total_parallel_sentences']:,}")
    print(f"Audio Utterances:              {stats['total_audio_utterances']:,}")
    print("\nParallel Corpus Domain Breakdown:")
    for domain, count in stats.get("parallel_domains", {}).items():
        print(f"  • {domain:15}: {count}")
    print("\nLexical Sources:")
    for src, count in stats.get("definition_sources", {}).items():
        print(f"  • {src:15}: {count}")
    print("=========================================\n")


def cmd_search(args):
    db = IkumbiDB(args.db)
    query = normalize_orthography(args.query)
    results = db.search_dictionary(query, limit=args.limit)

    if not results:
        print(f"No dictionary entries found for '{query}'.")
        return

    print(f"\n🔍 Found {len(results)} matching entries for '{query}':")
    for r in results:
        print(f"\n📖 {r['lemma'].upper()} [{r.get('part_of_speech') or 'n/a'}] (Class: {r.get('noun_class') or 'n/a'})")
        if r.get("phonetic"):
            print(f"   Phonetic: /{r['phonetic']}/ | Tone: {r.get('tonal_pattern') or 'n/a'}")
        if r.get("etymology"):
            print(f"   Etymology: {r['etymology']}")
        for d in r.get("definitions", []):
            print(f"   - [{d.get('source')}] {d['definition']}")
            if d.get("example_gikuyu"):
                print(f"     Example (KI): {d['example_gikuyu']}")
            if d.get("example_english"):
                print(f"     Example (EN): {d['example_english']}")


def cmd_export(args):
    db = IkumbiDB(args.db)
    count = db.export_jsonl(args.table, args.out)
    print(f"📦 Exported {count} records from table '{args.table}' to '{args.out}'.")


def main():
    parser = argparse.ArgumentParser(description="Thitho Ikũmbi (The Granary) Data Manager")
    parser.add_argument("--db", type=str, default=None, help="Custom database path")
    subparsers = parser.add_subparsers(dest="subcommand", required=True)

    # Init
    p_init = subparsers.add_parser("init", help="Initialize and seed database")
    p_init.set_defaults(func=cmd_init)

    # Stats
    p_stats = subparsers.add_parser("stats", help="Show corpus statistics")
    p_stats.set_defaults(func=cmd_stats)

    # Search
    p_search = subparsers.add_parser("search", help="Search the dictionary")
    p_search.add_argument("query", type=str, help="Word or phrase to search")
    p_search.add_argument("--limit", type=int, default=10, help="Maximum results")
    p_search.set_defaults(func=cmd_search)

    # Export
    p_export = subparsers.add_parser("export", help="Export table to JSONL")
    p_export.add_argument("--table", type=str, required=True, choices=["words", "definitions", "parallel_corpus", "audio_corpus"])
    p_export.add_argument("--out", type=str, required=True, help="Output JSONL path")
    p_export.set_defaults(func=cmd_export)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
