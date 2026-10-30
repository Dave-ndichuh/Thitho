"""
Thitho Ikũmbi Database Driver
Provides high-performance SQLite operations, transaction handling,
FTS5 full-text search, and dataset export for the Gĩkũyũ language.
"""

import json
import os
import sqlite3
from pathlib import Path
from typing import Any, Dict, Generator, List, Optional, Tuple

from ..normalizer import normalize_orthography, strip_tones


DEFAULT_DB_PATH = Path(__file__).resolve().parent.parent / "data" / "thitho_ikumbi.db"
SCHEMA_PATH = Path(__file__).resolve().parent / "schema.sql"


class IkumbiDB:
    def __init__(self, db_path: Optional[str] = None):
        self.is_memory = (db_path == ":memory:")
        self.db_path = Path(db_path) if (db_path and not self.is_memory) else DEFAULT_DB_PATH
        if not self.is_memory:
            self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._mem_conn = None
        if self.is_memory:
            self._mem_conn = sqlite3.connect(":memory:")
            self._mem_conn.row_factory = sqlite3.Row
            self._mem_conn.execute("PRAGMA foreign_keys = ON;")
        self._init_schema()

    def get_connection(self) -> sqlite3.Connection:
        if self.is_memory:
            return self._mem_conn
        conn = sqlite3.connect(str(self.db_path))
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON;")
        conn.execute("PRAGMA journal_mode = WAL;")
        conn.execute("PRAGMA synchronous = NORMAL;")
        return conn

    def _init_schema(self) -> None:
        """Initialize database tables and full-text indexes if not already present."""
        with self.get_connection() as conn:
            if SCHEMA_PATH.exists():
                with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
                    conn.executescript(f.read())
            conn.commit()

    # -------------------------------------------------------------
    # Lexical / Dictionary Methods
    # -------------------------------------------------------------

    def upsert_word(
        self,
        lemma: str,
        phonetic: Optional[str] = None,
        tonal_pattern: Optional[str] = None,
        part_of_speech: Optional[str] = None,
        noun_class: Optional[str] = None,
        etymology: Optional[str] = None,
    ) -> int:
        """Insert or update a Gĩkũyũ headword."""
        norm_lemma = normalize_orthography(lemma.lower())
        with self.get_connection() as conn:
            cur = conn.cursor()
            cur.execute(
                """
                INSERT INTO words (lemma, phonetic, tonal_pattern, part_of_speech, noun_class, etymology)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(lemma) DO UPDATE SET
                    phonetic = coalesce(excluded.phonetic, words.phonetic),
                    tonal_pattern = coalesce(excluded.tonal_pattern, words.tonal_pattern),
                    part_of_speech = coalesce(excluded.part_of_speech, words.part_of_speech),
                    noun_class = coalesce(excluded.noun_class, words.noun_class),
                    etymology = coalesce(excluded.etymology, words.etymology)
                RETURNING id;
                """,
                (norm_lemma, phonetic, tonal_pattern, part_of_speech, noun_class, etymology),
            )
            row = cur.fetchone()
            word_id = row[0] if row else None

            # Sync with FTS5
            if word_id:
                cur.execute(
                    """
                    INSERT OR REPLACE INTO words_fts (rowid, lemma, part_of_speech, etymology)
                    VALUES (?, ?, ?, ?);
                    """,
                    (word_id, norm_lemma, part_of_speech or "", etymology or ""),
                )
            conn.commit()
            return word_id

    def add_definition(
        self,
        word_id: int,
        definition: str,
        source: str,
        language: str = "eng",
        sense_num: int = 1,
        example_gikuyu: Optional[str] = None,
        example_english: Optional[str] = None,
        confidence: float = 1.0,
    ) -> int:
        """Add a definition/sense to a Gĩkũyũ word."""
        with self.get_connection() as conn:
            cur = conn.cursor()
            cur.execute(
                """
                INSERT INTO definitions (word_id, language, sense_num, definition, 
                                        example_gikuyu, example_english, source, confidence)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                RETURNING id;
                """,
                (
                    word_id,
                    language,
                    sense_num,
                    definition.strip(),
                    normalize_orthography(example_gikuyu) if example_gikuyu else None,
                    example_english.strip() if example_english else None,
                    source,
                    confidence,
                ),
            )
            def_id = cur.fetchone()[0]

            # Sync with FTS5
            cur.execute(
                """
                INSERT OR REPLACE INTO definitions_fts (rowid, definition, example_gikuyu, example_english)
                VALUES (?, ?, ?, ?);
                """,
                (def_id, definition.strip(), example_gikuyu or "", example_english or ""),
            )
            conn.commit()
            return def_id

    def get_word(self, lemma: str) -> Optional[Dict[str, Any]]:
        """Lookup a word by exact lemma or ASCII-stripped fallback, returning all associated senses and definitions."""
        norm_lemma = normalize_orthography(lemma.lower())
        with self.get_connection() as conn:
            cur = conn.cursor()
            cur.execute("SELECT * FROM words WHERE lemma = ?", (norm_lemma,))
            word_row = cur.fetchone()
            if not word_row:
                # Try fallback matching with stripped diacritics
                from ..normalizer import strip_all_diacritics
                ascii_lemma = strip_all_diacritics(norm_lemma)
                cur.execute(
                    """
                    SELECT * FROM words 
                    WHERE replace(replace(lemma, 'ĩ', 'i'), 'ũ', 'u') = ?
                    LIMIT 1
                    """,
                    (ascii_lemma,),
                )
                word_row = cur.fetchone()
                if not word_row:
                    return None

            word_data = dict(word_row)
            cur.execute(
                "SELECT * FROM definitions WHERE word_id = ? ORDER BY sense_num ASC",
                (word_data["id"],),
            )
            word_data["definitions"] = [dict(d) for d in cur.fetchall()]
            return word_data

    def search_dictionary(self, query: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Full-text search across words and definitions."""
        norm_query = normalize_orthography(query.lower())
        results = []
        with self.get_connection() as conn:
            cur = conn.cursor()
            # 1. First priority: Exact or prefix match on lemma
            cur.execute(
                """
                SELECT w.*, json_group_array(
                    json_object('id', d.id, 'definition', d.definition, 'source', d.source, 'lang', d.language)
                ) as definitions_json
                FROM words w
                LEFT JOIN definitions d ON w.id = d.word_id
                WHERE w.lemma LIKE ? OR w.lemma LIKE ?
                GROUP BY w.id
                ORDER BY CASE WHEN w.lemma = ? THEN 1 WHEN w.lemma LIKE ? THEN 2 ELSE 3 END
                LIMIT ?
                """,
                (f"{norm_query}%", f"%{norm_query}%", norm_query, f"{norm_query}%", limit),
            )
            for row in cur.fetchall():
                item = dict(row)
                item["definitions"] = json.loads(item["definitions_json"])
                del item["definitions_json"]
                results.append(item)

            if len(results) < limit:
                # 2. Match definitions FTS
                needed = limit - len(results)
                cur.execute(
                    """
                    SELECT w.*, json_group_array(
                        json_object('id', d.id, 'definition', d.definition, 'source', d.source, 'lang', d.language)
                    ) as definitions_json
                    FROM definitions_fts fts
                    JOIN definitions d ON fts.rowid = d.id
                    JOIN words w ON d.word_id = w.id
                    WHERE definitions_fts MATCH ?
                    GROUP BY w.id
                    LIMIT ?
                    """,
                    (f'"{query}"*', needed),
                )
                existing_ids = {r["id"] for r in results}
                for row in cur.fetchall():
                    if row["id"] not in existing_ids:
                        item = dict(row)
                        item["definitions"] = json.loads(item["definitions_json"])
                        del item["definitions_json"]
                        results.append(item)

        return results

    # -------------------------------------------------------------
    # Parallel Sentence Corpus Methods
    # -------------------------------------------------------------

    def add_parallel_pair(
        self,
        gikuyu_text: str,
        english_text: str,
        source: str,
        domain: str = "general",
        split: str = "train",
        quality_score: float = 1.0,
    ) -> int:
        """Add parallel translation pair (Gĩkũyũ <-> English)."""
        norm_gikuyu = normalize_orthography(gikuyu_text)
        with self.get_connection() as conn:
            cur = conn.cursor()
            cur.execute(
                """
                INSERT INTO parallel_corpus (gikuyu_text, english_text, domain, source, split, quality_score)
                VALUES (?, ?, ?, ?, ?, ?)
                RETURNING id;
                """,
                (norm_gikuyu, english_text.strip(), domain, source, split, quality_score),
            )
            corpus_id = cur.fetchone()[0]

            # FTS5 Indexing
            cur.execute(
                """
                INSERT OR REPLACE INTO parallel_fts (rowid, gikuyu_text, english_text, domain)
                VALUES (?, ?, ?, ?);
                """,
                (corpus_id, norm_gikuyu, english_text.strip(), domain),
            )
            conn.commit()
            return corpus_id

    def search_parallel(self, query: str, limit: int = 15) -> List[Dict[str, Any]]:
        """Search parallel corpus across both Gĩkũyũ and English."""
        norm_query = normalize_orthography(query)
        with self.get_connection() as conn:
            cur = conn.cursor()
            cur.execute(
                """
                SELECT p.* FROM parallel_fts fts
                JOIN parallel_corpus p ON fts.rowid = p.id
                WHERE parallel_fts MATCH ?
                LIMIT ?;
                """,
                (f'"{norm_query}"*', limit),
            )
            rows = cur.fetchall()
            if not rows:
                # Fallback to LIKE query
                cur.execute(
                    """
                    SELECT * FROM parallel_corpus
                    WHERE gikuyu_text LIKE ? OR english_text LIKE ?
                    LIMIT ?;
                    """,
                    (f"%{norm_query}%", f"%{query}%", limit),
                )
                rows = cur.fetchall()
            return [dict(r) for r in rows]

    def get_parallel_dataset(self, split: Optional[str] = None, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        """Fetch pairs for fine-tuning or translation evaluation."""
        with self.get_connection() as conn:
            cur = conn.cursor()
            query = "SELECT * FROM parallel_corpus"
            params = []
            if split:
                query += " WHERE split = ?"
                params.append(split)
            query += " ORDER BY id ASC"
            if limit:
                query += " LIMIT ?"
                params.append(limit)
            cur.execute(query, params)
            return [dict(r) for r in cur.fetchall()]

    # -------------------------------------------------------------
    # Audio Corpus Methods (Mozilla Common Voice)
    # -------------------------------------------------------------

    def add_audio_record(
        self,
        text: str,
        audio_path: str,
        source: str = "Mozilla Common Voice",
        duration_sec: Optional[float] = None,
        sample_rate: int = 16000,
        speaker_id: Optional[str] = None,
        gender: Optional[str] = None,
        accent: str = "Central Kenya",
        up_votes: int = 2,
        down_votes: int = 0,
        tonal_verified: int = 1,
    ) -> int:
        """Register a validated audio-text utterance."""
        norm_text = normalize_orthography(text)
        with self.get_connection() as conn:
            cur = conn.cursor()
            cur.execute(
                """
                INSERT INTO audio_corpus (
                    text, normalized_text, audio_path, duration_sec, sample_rate,
                    speaker_id, gender, accent, up_votes, down_votes, tonal_verified, source
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                RETURNING id;
                """,
                (
                    text,
                    norm_text,
                    audio_path,
                    duration_sec,
                    sample_rate,
                    speaker_id,
                    gender,
                    accent,
                    up_votes,
                    down_votes,
                    tonal_verified,
                    source,
                ),
            )
            rec_id = cur.fetchone()[0]
            conn.commit()
            return rec_id

    def get_audio_dataset(self, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        """Fetch audio recordings with metadata."""
        with self.get_connection() as conn:
            cur = conn.cursor()
            query = "SELECT * FROM audio_corpus ORDER BY id ASC"
            if limit:
                query += f" LIMIT {limit}"
            cur.execute(query)
            return [dict(r) for r in cur.fetchall()]

    def get_audio_by_id(self, audio_id: int) -> Optional[Dict[str, Any]]:
        """Fetch a single audio recording by ID."""
        with self.get_connection() as conn:
            cur = conn.cursor()
            cur.execute("SELECT * FROM audio_corpus WHERE id = ?", (audio_id,))
            row = cur.fetchone()
            return dict(row) if row else None

    # -------------------------------------------------------------
    # Summary Statistics & Exports
    # -------------------------------------------------------------

    def get_stats(self) -> Dict[str, Any]:
        """Return dataset size breakdown across lexical, parallel, and audio domains."""
        with self.get_connection() as conn:
            cur = conn.cursor()
            cur.execute("SELECT COUNT(*) FROM words")
            total_words = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM definitions")
            total_defs = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM parallel_corpus")
            total_parallel = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM audio_corpus")
            total_audio = cur.fetchone()[0]

            # Domain breakdown for parallel sentences
            cur.execute("SELECT domain, COUNT(*) FROM parallel_corpus GROUP BY domain")
            domains = dict(cur.fetchall())

            # Source breakdown for definitions
            cur.execute("SELECT source, COUNT(*) FROM definitions GROUP BY source")
            def_sources = dict(cur.fetchall())

            return {
                "total_words": total_words,
                "total_definitions": total_defs,
                "total_parallel_sentences": total_parallel,
                "total_audio_utterances": total_audio,
                "parallel_domains": domains,
                "definition_sources": def_sources,
                "db_path": str(self.db_path),
            }

    def export_jsonl(self, table: str, output_path: str) -> int:
        """Export table to JSONL format."""
        valid_tables = ["words", "definitions", "parallel_corpus", "audio_corpus"]
        if table not in valid_tables:
            raise ValueError(f"Invalid table: {table}. Must be one of {valid_tables}")

        count = 0
        with self.get_connection() as conn:
            cur = conn.cursor()
            cur.execute(f"SELECT * FROM {table}")
            with open(output_path, "w", encoding="utf-8") as f:
                for row in cur.fetchall():
                    f.write(json.dumps(dict(row), ensure_ascii=False) + "\n")
                    count += 1
        return count
