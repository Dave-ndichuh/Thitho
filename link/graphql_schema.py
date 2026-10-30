"""
Thitho Link: Native GraphQL Schema & Query Processor
Provides local offline GraphQL API for downstream applications, IoT networks,
and smart home dashboards without heavy external dependencies.
"""

import json
import re
from typing import Any, Dict, List, Optional

from ikumbi.normalizer import normalize_orthography
from ikumbi.storage.db import IkumbiDB
from taura_mugambo.taura.translator import ThithoTranslator
from .edge_router import EdgeRouter
from .presets.agriculture import AgriculturalEdgeAdvisor
from .presets.smarthome import SmartHomeEdgeNode


class ThithoGraphQLBridge:
    """
    Lightweight, embedded GraphQL engine resolving queries and mutations locally.
    """

    def __init__(self, db: Optional[IkumbiDB] = None):
        self.db = db or IkumbiDB()
        self.translator = ThithoTranslator(db=self.db)
        self.router = EdgeRouter()
        self.agri_advisor = AgriculturalEdgeAdvisor()
        self.smarthome_node = SmartHomeEdgeNode()

    def execute(self, query_str: str, variables: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Execute GraphQL query or mutation string."""
        variables = variables or {}
        clean_q = query_str.strip()

        data: Dict[str, Any] = {}
        errors: List[str] = []

        try:
            # 1. Dictionary Query
            if "dictionary(" in clean_q or "dictionary {" in clean_q:
                m = re.search(r'dictionary\s*\(\s*query\s*:\s*["\']([^"\']+)["\']', clean_q)
                query_val = m.group(1) if m else variables.get("query", "mũrĩmi")
                results = self.db.search_dictionary(query_val, limit=5)
                data["dictionary"] = [
                    {
                        "lemma": r["lemma"],
                        "phonetic": r.get("phonetic"),
                        "tonalPattern": r.get("tonal_pattern"),
                        "partOfSpeech": r.get("part_of_speech"),
                        "definitions": r.get("definitions", []),
                    }
                    for r in results
                ]

            # 2. Parallel Corpus Query
            if "parallelCorpus" in clean_q:
                pairs = self.db.get_parallel_dataset(limit=10)
                data["parallelCorpus"] = [
                    {
                        "id": p["id"],
                        "gikuyuText": p["gikuyu_text"],
                        "englishText": p["english_text"],
                        "domain": p["domain"],
                        "source": p["source"],
                    }
                    for p in pairs
                ]

            # 3. Hardware Status Query
            if "hardwareStatus" in clean_q:
                data["hardwareStatus"] = self.router.get_status_dict()

            # 4. Corpus Stats Query
            if "stats" in clean_q or "systemStats" in clean_q:
                data["stats"] = self.db.get_stats()

            # 5. Translate Mutation / Query
            if "translate(" in clean_q:
                m_text = re.search(r'text\s*:\s*["\']([^"\']+)["\']', clean_q)
                m_tgt = re.search(r'targetLang\s*:\s*["\']([^"\']+)["\']', clean_q)

                text_val = m_text.group(1) if m_text else variables.get("text", "")
                tgt_val = m_tgt.group(1) if m_tgt else variables.get("targetLang", "eng_Latn")

                if tgt_val == "kik_Latn":
                    res = self.translator.to_gikuyu(text_val)
                else:
                    res = self.translator.to_english(text_val)

                data["translate"] = {
                    "sourceText": res["source_text"],
                    "translatedText": res["translated_text"],
                    "sourceLang": res["source_lang"],
                    "targetLang": res["target_lang"],
                    "confidence": res["confidence"],
                    "engine": res["engine"],
                }

            # 6. Smart Home Mutation
            if "smartHome(" in clean_q:
                m_cmd = re.search(r'command\s*:\s*["\']([^"\']+)["\']', clean_q)
                cmd_val = m_cmd.group(1) if m_cmd else variables.get("command", "")
                data["smartHome"] = self.smarthome_node.process_command(cmd_val)

            # 7. Agriculture Query
            if "agriculture" in clean_q:
                data["agriculture"] = {
                    "seasons": self.agri_advisor.get_seasonal_calendar(),
                }

        except Exception as e:
            errors.append(str(e))

        result = {"data": data}
        if errors:
            result["errors"] = [{"message": err} for err in errors]
        return result
