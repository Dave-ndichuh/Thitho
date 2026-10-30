"""
Thitho Taũra: High-Level Translator Service
"""

from typing import Any, Dict, Optional
from .nllb_engine import NLLBTranslationEngine, LANG_CODE_GIKUYU, LANG_CODE_ENGLISH, LANG_CODE_SWAHILI


class ThithoTranslator:
    """Unified Translation interface for applications."""

    def __init__(self, db=None):
        self.engine = NLLBTranslationEngine(db=db)

    def to_english(self, gikuyu_text: str) -> Dict[str, Any]:
        return self.engine.translate(gikuyu_text, source_lang=LANG_CODE_GIKUYU, target_lang=LANG_CODE_ENGLISH)

    def to_gikuyu(self, english_text: str) -> Dict[str, Any]:
        return self.engine.translate(english_text, source_lang=LANG_CODE_ENGLISH, target_lang=LANG_CODE_GIKUYU)
