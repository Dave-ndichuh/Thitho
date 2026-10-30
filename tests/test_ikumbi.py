"""
Unit Tests for Thitho Ikũmbi (The Granary)
"""

import unittest
from ikumbi.normalizer import extract_tone_contour, normalize_orthography, strip_tones
from ikumbi.storage.db import IkumbiDB


class TestIkumbi(unittest.TestCase):
    def setUp(self):
        # In-memory database for isolated testing
        self.db = IkumbiDB(":memory:")

    def test_orthography_normalization(self):
        # î -> ĩ, û -> ũ, i~ -> ĩ, u~ -> ũ
        self.assertEqual(normalize_orthography("mûrîmi"), "mũrĩmi")
        self.assertEqual(normalize_orthography("mu~ri~mi"), "mũrĩmi")
        self.assertEqual(normalize_orthography("Mu~ci~i~"), "Mũcĩĩ")
        self.assertEqual(normalize_orthography("ng’ombe"), "ng'ombe")

    def test_tone_extraction(self):
        # Tone markers extraction
        clean, tones = extract_tone_contour("mũrĩ́mi")
        self.assertEqual(clean, "mũrĩmi")
        self.assertTrue(len(tones) > 0)
        self.assertEqual(tones[0]["tone"], "H")

    def test_database_crud_and_search(self):
        # Upsert word
        w_id = self.db.upsert_word(
            lemma="mũrĩmi",
            phonetic="mo-ree-me",
            tonal_pattern="L-H-L",
            part_of_speech="noun",
            noun_class="Class 1",
        )
        self.assertIsNotNone(w_id)

        # Add definition
        d_id = self.db.add_definition(
            word_id=w_id,
            definition="Farmer, agricultural cultivator",
            source="TestUKC",
            language="eng",
        )
        self.assertIsNotNone(d_id)

        # Exact match
        word = self.db.get_word("mũrĩmi")
        self.assertIsNotNone(word)
        self.assertEqual(word["lemma"], "mũrĩmi")
        self.assertEqual(len(word["definitions"]), 1)
        self.assertEqual(word["definitions"][0]["definition"], "Farmer, agricultural cultivator")

        # Fallback search without diacritics
        word_fallback = self.db.get_word("murimi")
        self.assertIsNotNone(word_fallback)
        self.assertEqual(word_fallback["lemma"], "mũrĩmi")

        # Full-text search
        results = self.db.search_dictionary("cultivator")
        self.assertTrue(len(results) > 0)
        self.assertEqual(results[0]["lemma"], "mũrĩmi")

    def test_parallel_corpus(self):
        p_id = self.db.add_parallel_pair(
            gikuyu_text="Mũrĩmi nĩ ahandaga mbembe.",
            english_text="The farmer plants maize.",
            source="TestCorpus",
            domain="agriculture",
        )
        self.assertIsNotNone(p_id)

        searched = self.db.search_parallel("maize")
        self.assertTrue(len(searched) > 0)
        self.assertEqual(searched[0]["gikuyu_text"], "Mũrĩmi nĩ ahandaga mbembe.")


if __name__ == "__main__":
    unittest.main()
