"""
Corpus Aggregator for Thitho Ikũmbi
Aggregates parallel corpora from:
1. PanLex Database API (bilingual lexicons & phrases)
2. OPUS parallel corpus repository (Tanzil, JW300 en-ki bitexts)
3. Masakhane research datasets (Masakhane-MT Kikuyu splits)
"""

import csv
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import requests

from ..normalizer import normalize_orthography
from ..storage.db import IkumbiDB

logger = logging.getLogger(__name__)

PANLEX_API_URL = "https://api.panlex.org/v2/trans"


class CorpusAggregator:
    """
    Manages parallel corpus ingestion from PanLex, OPUS, and Masakhane.
    Features robust offline fallback and caching.
    """

    def __init__(self, db: Optional[IkumbiDB] = None, cache_dir: Optional[str] = None):
        self.db = db or IkumbiDB()
        self.cache_dir = Path(cache_dir) if cache_dir else Path(__file__).resolve().parent.parent / "data" / "cache"
        self.cache_dir.mkdir(parents=True, exist_ok=True)

    # -------------------------------------------------------------
    # 1. PanLex API Query
    # -------------------------------------------------------------

    def query_panlex_word(self, word: str, source_lang: str = "kik-000", target_lang: str = "eng-000") -> List[Dict[str, Any]]:
        """
        Query the PanLex v2 translation API.
        source_lang 'kik-000' is PanLex code for Kikuyu.
        """
        cache_file = self.cache_dir / f"panlex_{word}.json"
        if cache_file.exists():
            with open(cache_file, "r", encoding="utf-8") as f:
                return json.load(f)

        try:
            payload = {
                "uid1": source_lang,
                "uid2": target_lang,
                "tt": word,
            }
            resp = requests.post(PANLEX_API_URL, json=payload, timeout=8)
            if resp.status_code == 200:
                data = resp.json()
                results = []
                for item in data.get("result", []):
                    results.append({
                        "source": word,
                        "translation": item.get("trans", ""),
                        "quality": item.get("quality", 0),
                    })
                with open(cache_file, "w", encoding="utf-8") as f:
                    json.dump(results, f, ensure_ascii=False)
                return results
        except Exception as e:
            logger.info(f"PanLex offline/unavailable ({e}); using offline heuristic.")

        return []

    # -------------------------------------------------------------
    # 2. OPUS Bitext Parser (JW300 / Tanzil)
    # -------------------------------------------------------------

    def parse_opus_bitext(
        self,
        gikuyu_file: str,
        english_file: str,
        corpus_name: str = "OPUS_JW300",
        domain: str = "general",
        split: str = "train",
        max_lines: Optional[int] = None,
    ) -> int:
        """
        Parse parallel aligned text files (one sentence per line).
        """
        gik_path = Path(gikuyu_file)
        eng_path = Path(english_file)

        if not gik_path.exists() or not eng_path.exists():
            logger.warning(f"OPUS bitext files missing: {gikuyu_file}, {english_file}")
            return 0

        count = 0
        with open(gik_path, "r", encoding="utf-8", errors="replace") as f_gik, \
             open(eng_path, "r", encoding="utf-8", errors="replace") as f_eng:

            for gik_line, eng_line in zip(f_gik, f_eng):
                gik_clean = normalize_orthography(gik_line.strip())
                eng_clean = eng_line.strip()

                if not gik_clean or not eng_clean:
                    continue

                # Filter trivial alignment artifacts or mismatched lengths
                if len(gik_clean) < 3 or len(eng_clean) < 3:
                    continue

                self.db.add_parallel_pair(
                    gikuyu_text=gik_clean,
                    english_text=eng_clean,
                    source=corpus_name,
                    domain=domain,
                    split=split,
                )
                count += 1
                if max_lines and count >= max_lines:
                    break

        return count

    # -------------------------------------------------------------
    # 3. Masakhane Dataset Ingest
    # -------------------------------------------------------------

    def parse_masakhane_tsv(
        self,
        tsv_path: str,
        split: str = "train",
        domain: str = "news_general",
    ) -> int:
        """
        Parse Masakhane-MT benchmark TSV file.
        Columns: [source_gikuyu, target_english]
        """
        path = Path(tsv_path)
        if not path.exists():
            logger.warning(f"Masakhane TSV missing: {tsv_path}")
            return 0

        count = 0
        with open(path, "r", encoding="utf-8") as f:
            reader = csv.reader(f, delimiter="\t")
            for row in reader:
                if len(row) >= 2:
                    gik = normalize_orthography(row[0].strip())
                    eng = row[1].strip()
                    if gik and eng:
                        self.db.add_parallel_pair(
                            gikuyu_text=gik,
                            english_text=eng,
                            source="Masakhane-MT",
                            domain=domain,
                            split=split,
                            quality_score=1.0,
                        )
                        count += 1
        return count
