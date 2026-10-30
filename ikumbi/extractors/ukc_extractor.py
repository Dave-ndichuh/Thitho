"""
UKC (Universal Knowledge Core) Kikuyu Lexicon Extractor
Extracts Gĩkũyũ lexemes, synsets, and ontological definitions from UKC data formats.
"""

import csv
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

import requests

from ..normalizer import normalize_orthography
from ..storage.db import IkumbiDB

logger = logging.getLogger(__name__)


class UKCLexiconExtractor:
    """
    Parser and ingestion engine for UKC (Universal Knowledge Core) Gĩkũyũ network.
    Supports local TSV/JSON dumps and live repository fetching with offline fallback.
    """

    def __init__(self, db: Optional[IkumbiDB] = None):
        self.db = db or IkumbiDB()

    def parse_tsv(self, file_path: str) -> List[Dict[str, Any]]:
        """
        Parse UKC standard TSV format:
        Columns: concept_id \t lemma \t pos \t gloss \t examples
        """
        records = []
        path = Path(file_path)
        if not path.exists():
            logger.warning(f"UKC TSV file not found: {file_path}")
            return records

        with open(path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f, delimiter="\t")
            for row in reader:
                lemma = normalize_orthography(row.get("lemma", "").strip())
                if not lemma:
                    continue
                records.append({
                    "lemma": lemma,
                    "pos": row.get("pos", "noun").lower(),
                    "gloss": row.get("gloss", "").strip(),
                    "concept_id": row.get("concept_id", ""),
                    "example_gikuyu": row.get("example_gikuyu"),
                    "example_english": row.get("example_english"),
                    "source": "UKC Lexicon",
                })
        return records

    def parse_json(self, file_path: str) -> List[Dict[str, Any]]:
        """Parse structured UKC JSON export format."""
        path = Path(file_path)
        if not path.exists():
            return []

        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)

        records = []
        for entry in data.get("synsets", []):
            lemma = normalize_orthography(entry.get("word", "").strip())
            if not lemma:
                continue
            records.append({
                "lemma": lemma,
                "pos": entry.get("pos", "noun").lower(),
                "gloss": entry.get("definition", "").strip(),
                "concept_id": entry.get("id", ""),
                "example_gikuyu": entry.get("example_gikuyu"),
                "example_english": entry.get("example_english"),
                "source": "UKC Lexicon",
            })
        return records

    def fetch_live_or_cache(self, url: str, cache_path: str) -> Optional[Path]:
        """Fetch UKC remote resource if online, otherwise return local cache if present."""
        local = Path(cache_path)
        if local.exists():
            return local
        try:
            resp = requests.get(url, timeout=10)
            if resp.status_code == 200:
                local.parent.mkdir(parents=True, exist_ok=True)
                local.write_bytes(resp.content)
                return local
        except Exception as e:
            logger.info(f"Offline mode: Cannot fetch {url} ({e}). Falling back to local cache.")
        return None

    def ingest_records(self, records: List[Dict[str, Any]]) -> Dict[str, int]:
        """Ingest parsed UKC records directly into IkumbiDB."""
        words_count = 0
        defs_count = 0

        for r in records:
            lemma = r["lemma"]
            pos = r.get("pos", "noun")
            gloss = r.get("gloss", "")
            if not gloss:
                continue

            word_id = self.db.upsert_word(
                lemma=lemma,
                part_of_speech=pos,
                etymology=f"UKC Concept: {r.get('concept_id')}" if r.get("concept_id") else None,
            )
            words_count += 1

            self.db.add_definition(
                word_id=word_id,
                definition=gloss,
                source="UKC Lexicon",
                language="eng",
                example_gikuyu=r.get("example_gikuyu"),
                example_english=r.get("example_english"),
            )
            defs_count += 1

        return {"words_processed": words_count, "definitions_added": defs_count}
