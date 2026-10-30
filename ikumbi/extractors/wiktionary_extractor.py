"""
Wiktionary Extractor for Gĩkũyũ (Kikuyu)
Parses Wiktionary JSON/XML dumps and Kaikki.org lexical exports.
Extracts parts of speech, glosses, noun classes, and etymology.
"""

import json
import logging
import re
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any, Dict, Generator, List, Optional

from ..normalizer import normalize_orthography
from ..storage.db import IkumbiDB

logger = logging.getLogger(__name__)


class WiktionaryExtractor:
    """
    Extracts Gĩkũyũ entries from Wiktionary mediawiki XML or Kaikki JSON dumps.
    """

    def __init__(self, db: Optional[IkumbiDB] = None):
        self.db = db or IkumbiDB()

    def parse_kaikki_jsonl(self, jsonl_path: str) -> Generator[Dict[str, Any], None, None]:
        """
        Parse Kaikki.org Wiktionary JSONL format for 'kik' or 'Kikuyu'.
        """
        path = Path(jsonl_path)
        if not path.exists():
            logger.warning(f"Kaikki JSONL dump not found: {jsonl_path}")
            return

        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    entry = json.loads(line)
                    lang_code = entry.get("lang_code", "")
                    lang_name = entry.get("lang", "")

                    if lang_code == "kik" or lang_name.lower() in ("kikuyu", "gikuyu"):
                        word = normalize_orthography(entry.get("word", ""))
                        pos = entry.get("pos", "noun")
                        etymology = entry.get("etymology_text", "")

                        senses = []
                        for s in entry.get("senses", []):
                            glosses = s.get("glosses", [])
                            if glosses:
                                senses.append({
                                    "definition": "; ".join(glosses),
                                    "examples": [
                                        ex.get("text", "") for ex in s.get("examples", [])
                                    ]
                                })

                        if word and senses:
                            yield {
                                "lemma": word,
                                "pos": pos,
                                "etymology": etymology,
                                "senses": senses,
                                "source": "Wiktionary",
                            }
                except Exception as e:
                    logger.debug(f"Skipping malformed Wiktionary line: {e}")

    def parse_xml_dump(self, xml_path: str) -> Generator[Dict[str, Any], None, None]:
        """
        Parse MediaWiki XML dump searching for Kikuyu / Gikuyu headers.
        """
        path = Path(xml_path)
        if not path.exists():
            return

        # Simple streaming regex parser over large XML files to avoid memory bloat
        current_title = None
        in_revision = False
        text_buffer = []

        with open(path, "r", encoding="utf-8", errors="replace") as f:
            for line in f:
                if "<title>" in line:
                    m = re.search(r"<title>(.*?)</title>", line)
                    if m:
                        current_title = m.group(1).strip()
                elif "<text" in line:
                    in_revision = True
                    text_buffer = [line]
                elif in_revision:
                    text_buffer.append(line)
                    if "</text>" in line:
                        in_revision = False
                        full_text = "".join(text_buffer)
                        if "==Kikuyu==" in full_text or "==Gikuyu==" in full_text:
                            extracted = self._parse_wikitext(current_title, full_text)
                            if extracted:
                                yield extracted
                        text_buffer = []

    def _parse_wikitext(self, title: str, text: str) -> Optional[Dict[str, Any]]:
        """Extract Kikuyu section from wikitext."""
        # Find ==Kikuyu== section up to next top-level language heading ==Other==
        match = re.search(r"==\s*(?:Kikuyu|Gikuyu)\s*==([\s\S]*?)(?=(?:==\s*[^=]+\s*==|$))", text)
        if not match:
            return None

        kik_text = match.group(1)
        # Extract part of speech heading e.g. ===Noun===, ===Verb===
        pos_match = re.search(r"===\s*(Noun|Verb|Adjective|Adverb|Proper noun)\s*===", kik_text, re.IGNORECASE)
        pos = pos_match.group(1).lower() if pos_match else "noun"

        # Senses usually start with #
        senses = []
        for line in kik_text.splitlines():
            line = line.strip()
            if line.startswith("#") and not line.startswith("#*") and not line.startswith("#:"):
                gloss = re.sub(r"[\[\]{}#]", "", line).strip()
                if gloss:
                    senses.append({"definition": gloss, "examples": []})

        if not senses:
            return None

        return {
            "lemma": normalize_orthography(title),
            "pos": pos,
            "etymology": None,
            "senses": senses,
            "source": "Wiktionary",
        }

    def ingest_dump(self, file_path: str) -> Dict[str, int]:
        """Ingest either JSONL or XML Wiktionary dump into IkumbiDB."""
        path = Path(file_path)
        count_words = 0
        count_defs = 0

        generator = (
            self.parse_kaikki_jsonl(file_path)
            if path.suffix == ".jsonl" or path.suffix == ".json"
            else self.parse_xml_dump(file_path)
        )

        for entry in generator:
            word_id = self.db.upsert_word(
                lemma=entry["lemma"],
                part_of_speech=entry.get("pos"),
                etymology=entry.get("etymology"),
            )
            count_words += 1

            for idx, sense in enumerate(entry.get("senses", []), 1):
                ex_gik = sense["examples"][0] if sense.get("examples") else None
                self.db.add_definition(
                    word_id=word_id,
                    definition=sense["definition"],
                    source="Wiktionary",
                    sense_num=idx,
                    example_gikuyu=ex_gik,
                )
                count_defs += 1

        return {"words_processed": count_words, "definitions_added": count_defs}
