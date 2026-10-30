"""
Thitho Mũgambo: Acoustic Mapper & Tonal Accuracy Engine
Extracts phonemic pitch contours (High, Low, Falling) and models F0 trajectories
for high tonal fidelity in Gĩkũyũ speech synthesis and transcription.
"""

import math
from typing import Any, Dict, List, Tuple

from ikumbi.normalizer import extract_tone_contour, normalize_orthography

# Pitch references (in Hz)
PITCH_TARGETS = {
    "H": 210.0,  # High Tone
    "M": 175.0,  # Mid Tone
    "L": 140.0,  # Low Tone
    "F": 120.0,  # Falling / Downstep
}


class AcousticMapper:
    """
    Computes tonal target profiles and phonetic duration mappings for Gĩkũyũ utterances.
    """

    def __init__(self, sample_rate: int = 16000):
        self.sample_rate = sample_rate

    def map_tonal_profile(self, text: str) -> Dict[str, Any]:
        """
        Analyze Gĩkũyũ text and generate phoneme-level pitch targets and syllable timings.
        """
        norm_text = normalize_orthography(text)
        words = norm_text.split()
        syllables = []
        pitch_contour = []

        for word in words:
            word_clean = word.lower().rstrip(".,!?")
            # Syllabification heuristic (V, CV, or CCV)
            word_sylls = self._syllabify(word_clean)
            for s in word_sylls:
                # Determine tone category based on vowel diacritics
                tone = "M"
                if "ĩ" in s or "ũ" in s:
                    tone = "H"
                elif "a" in s or "e" in s:
                    tone = "L"

                freq = PITCH_TARGETS[tone]
                syllables.append({"syllable": s, "tone": tone, "target_f0": freq})
                pitch_contour.append(freq)

        return {
            "text": norm_text,
            "syllables": syllables,
            "pitch_contour": pitch_contour,
            "estimated_duration_sec": max(0.5, len(syllables) * 0.22),
            "sample_rate": self.sample_rate,
        }

    def _syllabify(self, word: str) -> List[str]:
        """Split a Gĩkũyũ word into open syllables (Bantu syllables typically end in vowels)."""
        vowels = "aeiĩouũ"
        result = []
        current = ""

        for char in word:
            current += char
            if char in vowels:
                result.append(current)
                current = ""

        if current:
            if result:
                result[-1] += current
            else:
                result.append(current)

        return result
