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
        # Kikuyu to English lemma
        kik_to_eng = self.translator.to_english("mũrĩmi")
        self.assertTrue(
            "farmer" in kik_to_eng["translated_text"].lower()
            or "cultivator" in kik_to_eng["translated_text"].lower()
        )

        # Complex agglutinative sentence
        complex_res = self.translator.to_english("Mũndũ ũrĩa mwega nĩ arathimĩtwo")
        self.assertIn("blessed", complex_res["translated_text"].lower())

        # Conversational greeting
        greet_res = self.translator.to_english("Ũhoro waku mũrata wakwa?")
        self.assertIn("friend", greet_res["translated_text"].lower())

        # English to Kikuyu
        eng_to_kik = self.translator.to_gikuyu("door")
        self.assertIn("mũrango", eng_to_kik["translated_text"].lower())

        # English intent to Kikuyu
        intent_res = self.translator.to_gikuyu("I want to buy food today")
        self.assertIn("kũgũra", intent_res["translated_text"].lower())
        self.assertIn("irio", intent_res["translated_text"].lower())

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

    def test_onnx_quantization_stats(self):
        from taura_mugambo.taura.onnx_converter import NLLBONNXConverter
        converter = NLLBONNXConverter()
        stats = converter.get_compression_stats()
        self.assertEqual(stats["base_model"], "facebook/nllb-200-distilled-600M")
        self.assertIn("74.0%", stats["footprint_reduction_pct"])
        self.assertTrue(stats["offline_capable"])

    def test_onnx_manifest_generation(self):
        import tempfile
        from pathlib import Path
        from taura_mugambo.taura.onnx_converter import NLLBONNXConverter
        converter = NLLBONNXConverter()
        with tempfile.TemporaryDirectory() as tmpdir:
            manifest_path = converter.generate_manifest(Path(tmpdir))
            self.assertTrue(manifest_path.exists())
            self.assertEqual(manifest_path.name, "thitho_nllb_manifest.json")


if __name__ == "__main__":
    unittest.main()
