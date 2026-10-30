"""
Unit Tests for Thitho Core Tokenizer
"""

import unittest
from core.tokenizer.gikuyu_tokenizer import ThithoGikuyuTokenizer


class TestTokenizer(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tok = ThithoGikuyuTokenizer()

    def test_diacritic_preservation(self):
        text = "Mũrĩmi nĩ ahandaga mbembe."
        enc = self.tok.encode(text)
        dec = self.tok.decode(enc["ids"])

        # Decoded output must preserve ĩ and ũ without corrupted byte artifacts
        self.assertIn("ĩ", dec)
        self.assertIn("ũ", dec)

    def test_token_fertility_is_efficient(self):
        # A 6-word Gĩkũyũ sentence should not blow up into 25+ byte tokens!
        text = "Mũrĩmi nĩ ahandaga mbembe na kahua."
        enc = self.tok.encode(text)
        fertility = enc["fertility_per_word"]

        # Fertility should be <= 2.0 tokens per word
        self.assertLessEqual(fertility, 2.0)

    def test_keyboard_variant_normalization(self):
        # Typing with circumflex or tildes should be normalized before encoding
        enc1 = self.tok.encode("mûrîmi")
        enc2 = self.tok.encode("mu~ri~mi")
        enc3 = self.tok.encode("mũrĩmi")

        self.assertEqual(enc1["ids"], enc2["ids"])
        self.assertEqual(enc2["ids"], enc3["ids"])


if __name__ == "__main__":
    unittest.main()
