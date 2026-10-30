"""
Gĩkũyũ Orthography & Diacritics Normalizer
Handles standard 7-vowel orthography (a, e, i, ĩ, o, u, ũ),
tonal diacritic extraction, and keyboard substitution normalization.
"""

import re
import unicodedata
from typing import Dict, List, Tuple

# Canonical Gĩkũyũ vowel mappings from common keyboard substitutions
ORTHOGRAPHY_REPLACEMENTS = {
    # Tilde substitutions
    r"i~": "ĩ",
    r"I~": "Ĩ",
    r"u~": "ũ",
    r"U~": "Ũ",
    # Circumflex substitutions (very common in informal Kenyan digital texts)
    r"î": "ĩ",
    r"Î": "Ĩ",
    r"û": "ũ",
    r"Û": "Ũ",
    # Macron substitutions (sometimes used in academic texts)
    r"ī": "ĩ",
    r"Ī": "Ĩ",
    r"ū": "ũ",
    r"Ū": "Ũ",
    # Apostrophe normalization for ng' nasal consonant
    r"ng’": "ng'",
    r"Ng’": "Ng'",
    r"NG’": "NG'",
    r"ng`": "ng'",
    r"Ng`": "Ng'",
}

# Tonal diacritics (acute: high tone, grave: low tone, circumflex over standard vowel: falling)
COMBINING_TONE_ACCENTS = {
    "\u0301": "H",  # Combining acute (High)
    "\u0300": "L",  # Combining grave (Low)
    "\u0302": "F",  # Combining circumflex (Falling)
    "\u0304": "M",  # Combining macron (Mid)
}

# Standard Gikuyu Noun Class Prefixes (for morphological heuristics)
GIKUYU_NOUN_CLASSES = [
    ("Class 1/2", ["mũ-", "a-", "mw-"]),
    ("Class 3/4", ["mũ-", "mĩ-", "mw-"]),
    ("Class 5/6", ["ĩ-", "ma-", "ri-"]),
    ("Class 7/8", ["kĩ-", "i-", "ci-", "gĩ-"]),
    ("Class 9/10", ["n-", "m-", "ny-", "ng'-"]),
    ("Class 11", ["rũ-", "rw-"]),
    ("Class 12/13", ["ka-", "tũ-", "tw-"]),
    ("Class 14", ["ũ-", "w-"]),
    ("Class 15", ["kũ-", "gũ-", "kw-"]),
    ("Class 16/17/18", ["ha-", "kũ-", "mu-"]),
]


def normalize_orthography(text: str) -> str:
    """
    Standardize Gĩkũyũ text to canonical Unicode NFC with proper diacritics (ĩ, ũ).
    Converts keyboard substitutes (î, û, i~, u~) to official standard orthography.
    """
    if not text:
        return ""

    # Normalize unicode to NFC first
    text = unicodedata.normalize("NFC", text)

    # Replace common keyboard variants
    for pattern, replacement in ORTHOGRAPHY_REPLACEMENTS.items():
        text = re.sub(pattern, replacement, text)

    # Normalize double spaces and trim
    text = re.sub(r"[ \t]+", " ", text).strip()
    return unicodedata.normalize("NFC", text)


def extract_tone_contour(text: str) -> Tuple[str, List[Dict[str, str]]]:
    """
    Extract tone markers into a structured pitch contour while returning
    clean normalized base text.
    Returns: (cleaned_base_text, tone_events)
    """
    nfd_text = unicodedata.normalize("NFD", text)
    cleaned_chars = []
    tone_events = []
    
    char_index = 0
    for char in nfd_text:
        if char in COMBINING_TONE_ACCENTS:
            tone_events.append({
                "position": max(0, char_index - 1),
                "tone": COMBINING_TONE_ACCENTS[char],
                "marker": char
            })
        else:
            cleaned_chars.append(char)
            char_index += 1

    cleaned_text = unicodedata.normalize("NFC", "".join(cleaned_chars))
    return normalize_orthography(cleaned_text), tone_events


def strip_tones(text: str) -> str:
    """
    Remove tonal accents (acute, grave) while preserving crucial phonemic vowels ĩ and ũ.
    """
    cleaned, _ = extract_tone_contour(text)
    return cleaned


def strip_all_diacritics(text: str) -> str:
    """
    Map Gĩkũyũ special vowels (ĩ, ũ) to basic ASCII (i, u) for fuzzy matching.
    """
    t = normalize_orthography(text)
    t = t.replace("ĩ", "i").replace("Ĩ", "I")
    t = t.replace("ũ", "u").replace("Ũ", "U")
    return strip_tones(t)


def analyze_morpheme(word: str) -> Dict[str, any]:
    """
    Lightweight rule-based morphological decomposition for Gĩkũyũ vocabulary.
    Identifies candidate noun class prefix, root morpheme, and inflectional characteristics.
    """
    norm_word = normalize_orthography(word.lower())
    matched_classes = []

    for class_name, prefixes in GIKUYU_NOUN_CLASSES:
        for pfx in prefixes:
            clean_pfx = pfx.replace("-", "")
            if norm_word.startswith(clean_pfx) and len(norm_word) > len(clean_pfx) + 1:
                matched_classes.append({
                    "class": class_name,
                    "prefix": clean_pfx,
                    "stem_candidate": norm_word[len(clean_pfx):]
                })

    return {
        "lemma": norm_word,
        "is_canonical": any(c in norm_word for c in ["ĩ", "ũ", "Ĩ", "Ũ"]),
        "has_nasal_ng": "ng'" in norm_word,
        "candidate_paradigms": matched_classes
    }
