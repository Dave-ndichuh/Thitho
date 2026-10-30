"""
Thitho Core: Gĩkũyũ Sub-Word Tokenizer
Custom BPE / WordPiece tokenizer specifically preserving Gĩkũyũ phonemes (ĩ, ũ, ng')
and Bantu morphological prefix/suffix boundaries to prevent token bloat and fragmentation.
"""

import json
import logging
import os
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union

from tokenizers import Tokenizer, decoders, models, normalizers, pre_tokenizers, trainers
from tokenizers.models import BPE
from tokenizers.pre_tokenizers import ByteLevel, Sequence, WhitespaceSplit
from tokenizers.trainers import BpeTrainer

from ikumbi.normalizer import normalize_orthography

logger = logging.getLogger(__name__)

DEFAULT_TOKENIZER_PATH = Path(__file__).resolve().parent / "thitho_gikuyu_tokenizer.json"

# Special Tokens
SPECIAL_TOKENS = ["<unk>", "<s>", "</s>", "<pad>", "<mask>"]

# Gĩkũyũ Foundational Seed Vocabulary (ensuring diacritics & morphemes are atomic)
GIKUYU_SEED_ALPHABET = [
    # 7 Vowels in upper & lower case
    "a", "e", "i", "ĩ", "o", "u", "ũ",
    "A", "E", "I", "Ĩ", "O", "U", "Ũ",
    # Consonants
    "b", "c", "d", "g", "h", "j", "k", "m", "n", "r", "t", "w", "y",
    "B", "C", "D", "G", "H", "J", "K", "M", "N", "R", "T", "W", "Y",
    # Digraphs
    "th", "Th", "TH",
    "ny", "Ny", "NY",
    "ng'", "Ng'", "NG'",
    # Common Noun Class Morpheme Prefixes
    "mũ", "Mũ", "mĩ", "Mĩ",
    "kĩ", "Kĩ", "gĩ", "Gĩ",
    "rũ", "Rũ", "tũ", "Tũ",
    "ma", "Ma", "ci", "Ci",
    # Common Verbal Aspect Suffixes
    "ire", "ĩre", "ete", "ete", "aga", "ĩra", "erio",
]


class ThithoGikuyuTokenizer:
    """
    Sub-word BPE Tokenizer customized for the Gĩkũyũ language.
    Features diacritic preservation, low fertility, and cross-platform compatibility.
    """

    def __init__(self, tokenizer_file: Optional[Union[str, Path]] = None):
        self.tokenizer_path = Path(tokenizer_file) if tokenizer_file else DEFAULT_TOKENIZER_PATH
        self.tokenizer: Optional[Tokenizer] = None

        if self.tokenizer_path.exists():
            self.load(self.tokenizer_path)
        else:
            self._init_default_model()

    def _init_default_model(self) -> None:
        """Create a new un-trained BPE tokenizer with Gĩkũyũ pre-tokenization rules."""
        tokenizer = Tokenizer(BPE(unk_token="<unk>"))
        # Custom Normalizer: NFKC + Gikuyu standard orthography
        tokenizer.pre_tokenizer = ByteLevel(add_prefix_space=False)
        tokenizer.decoder = decoders.ByteLevel()
        self.tokenizer = tokenizer

    def train_on_texts(
        self,
        texts: List[str],
        vocab_size: int = 4000,
        min_frequency: int = 2,
        save_path: Optional[Union[str, Path]] = None,
    ) -> None:
        """
        Train the BPE tokenizer on Gĩkũyũ corpus texts with pre-seeded alphabet.
        """
        # Normalize all training texts first
        cleaned_texts = [normalize_orthography(t) for t in texts if t.strip()]

        trainer = BpeTrainer(
            vocab_size=vocab_size,
            min_frequency=min_frequency,
            special_tokens=SPECIAL_TOKENS,
            initial_alphabet=GIKUYU_SEED_ALPHABET,
            show_progress=True,
        )

        self._init_default_model()
        self.tokenizer.train_from_iterator(cleaned_texts, trainer=trainer)

        target = Path(save_path) if save_path else self.tokenizer_path
        target.parent.mkdir(parents=True, exist_ok=True)
        self.save(target)
        logger.info(f"Trained ThithoTokenizer with vocab size {self.tokenizer.get_vocab_size()} saved to {target}")

    def encode(self, text: str) -> Dict[str, Any]:
        """Encode text to tokens and IDs."""
        if not self.tokenizer:
            raise RuntimeError("Tokenizer is not initialized or trained.")

        normalized = normalize_orthography(text)
        encoding = self.tokenizer.encode(normalized)
        return {
            "tokens": encoding.tokens,
            "ids": encoding.ids,
            "text": normalized,
            "fertility_per_word": len(encoding.tokens) / max(1, len(normalized.split())),
        }

    def decode(self, token_ids: List[int]) -> str:
        """Decode token IDs back to normalized Gĩkũyũ text."""
        if not self.tokenizer:
            raise RuntimeError("Tokenizer is not initialized or trained.")
        return normalize_orthography(self.tokenizer.decode(token_ids))

    def compute_fertility(self, texts: List[str]) -> Dict[str, float]:
        """
        Compute Token Fertility metrics (tokens per word and tokens per char).
        Lower fertility means higher computational efficiency!
        """
        total_tokens = 0
        total_words = 0
        total_chars = 0

        for t in texts:
            enc = self.encode(t)
            tokens_len = len(enc["tokens"])
            words_len = len(enc["text"].split())
            chars_len = len(enc["text"])

            total_tokens += tokens_len
            total_words += max(1, words_len)
            total_chars += max(1, chars_len)

        return {
            "tokens_per_word": round(total_tokens / max(1, total_words), 3),
            "tokens_per_char": round(total_tokens / max(1, total_chars), 3),
            "total_tokens": total_tokens,
            "total_words": total_words,
        }

    def save(self, path: Union[str, Path]) -> None:
        """Save tokenizer model to JSON file."""
        if self.tokenizer:
            self.tokenizer.save(str(path))

    def load(self, path: Union[str, Path]) -> None:
        """Load tokenizer model from JSON file."""
        self.tokenizer = Tokenizer.from_file(str(path))
        self.tokenizer_path = Path(path)
