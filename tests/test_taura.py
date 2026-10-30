"""
Unit Tests for Thitho Taũra & Mũgambo
"""

import unittest
from taura_mugambo.taura.translator import ThithoTranslator
from taura_mugambo.mugambo.acoustic_mapper import AcousticMapper
from taura_mugambo.mugambo.tts_engine import ThithoTTSEngine


class TestTauraMugambo(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.translator = ThithoTranslator()
        cls.acoustic_mapper = AcousticMapper()
        cls.tts = ThithoTTSEngine()

    def test_bidirectional_translation(self):
        # Kikuyu to English
        kik_to_eng = self.translator.to_english("mũrĩmi")
        self.assertIn("cultivator", kik_to_eng["translated_text"].lower())

        # English to Kikuyu
        eng_to_kik = self.translator.to_gikuyu("door")
        self.assertIn("mũrango", eng_to_kik["translated_text"].lower())

    def test_acoustic_tonal_mapping(self):
        profile = self.acoustic_mapper.map_tonal_profile("Mũrĩmi")
        self.assertTrue(len(profile["syllables"]) > 0)
        # Check pitch contour contains valid frequencies
        self.assertTrue(all(f >= 100 for f in profile["pitch_contour"]))

    def test_tts_audio_generation(self):
        wav_bytes = self.tts.synthesize_wav_bytes("Mũrĩmi nĩ ahandaga mbembe.")
        self.assertGreater(len(wav_bytes), 1000)
        # WAV header signature 'RIFF' and 'WAVE'
        self.assertEqual(wav_bytes[:4], b"RIFF")
        self.assertEqual(wav_bytes[8:12], b"WAVE")


if __name__ == "__main__":
    unittest.main()
