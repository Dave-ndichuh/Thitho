"""
Thitho Mũgambo: Text-to-Speech (TTS) Synthesizer
Synthesizes speech audio waveforms preserving Gĩkũyũ vowel phonemes and tonal pitch inflections.
Uses local vocal speech synthesis with fallback to tonal acoustic formant generation.
Generates broadcast-compliant 16kHz PCM WAV files runnable fully offline on edge devices.
"""

import io
import logging
import math
import os
import struct
import tempfile
import wave
from pathlib import Path
from typing import Any, Dict, Optional, Union

from .acoustic_mapper import AcousticMapper

logger = logging.getLogger(__name__)

try:
    import pyttsx3
    HAS_PYTTSX3 = True
except ImportError:
    pyttsx3 = None
    HAS_PYTTSX3 = False


class ThithoTTSEngine:
    """
    Offline acoustic and vocal speech synthesizer for the Gĩkũyũ language.
    Produces clean audible human speech audio without requiring commercial cloud speech APIs.
    """

    def __init__(self, sample_rate: int = 16000):
        self.sample_rate = sample_rate
        self.acoustic_mapper = AcousticMapper(sample_rate=sample_rate)

    def synthesize_wav_bytes(self, text: str) -> bytes:
        """Synthesize Gĩkũyũ speech audio as in-memory WAV bytes."""
        if not text or not text.strip():
            return self._empty_wav()

        # 1. Attempt natural vocal speech synthesis via pyttsx3
        if HAS_PYTTSX3:
            try:
                vocal_wav = self._synthesize_vocal(text)
                if vocal_wav and len(vocal_wav) > 1000:
                    return vocal_wav
            except Exception as e:
                logger.warning(f"pyttsx3 synthesis error: {e}")

        # 2. Formant acoustic synthesizer fallback
        return self._synthesize_formants(text)

    def _synthesize_vocal(self, text: str) -> bytes:
        """Synthesize real spoken speech using local TTS runtime."""
        # Convert Gĩkũyũ 7-vowel diacritics to phonetic vocal targets for clarity
        phonetic_text = (
            text.replace("ĩ", "ee")
            .replace("Ĩ", "Ee")
            .replace("ũ", "oo")
            .replace("Ũ", "Oo")
            .replace("ng'", "ng")
            .replace("c", "ch")
            .replace("C", "Ch")
        )

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp_path = tmp.name

        try:
            engine = pyttsx3.init()
            engine.setProperty("rate", 145)  # Natural African speech cadence
            engine.setProperty("volume", 1.0)
            engine.save_to_file(phonetic_text, tmp_path)
            engine.runAndWait()

            if os.path.exists(tmp_path) and os.path.getsize(tmp_path) > 0:
                with open(tmp_path, "rb") as f:
                    return f.read()
        finally:
            if os.path.exists(tmp_path):
                try:
                    os.unlink(tmp_path)
                except Exception:
                    pass

        return b""

    def _synthesize_formants(self, text: str) -> bytes:
        """Generate harmonic tonal formant waveform."""
        profile = self.acoustic_mapper.map_tonal_profile(text)
        syllables = profile["syllables"]

        if not syllables:
            return self._empty_wav()

        samples = []
        syllable_duration = 0.22  # seconds per syllable
        samples_per_syllable = int(self.sample_rate * syllable_duration)

        current_phase = 0.0

        for idx, syll in enumerate(syllables):
            f0 = syll["target_f0"]
            for i in range(samples_per_syllable):
                t = i / samples_per_syllable
                envelope = math.sin(math.pi * t)

                freq = f0 * (1.0 + 0.05 * math.sin(math.pi * t))
                phase_inc = 2 * math.pi * freq / self.sample_rate
                current_phase += phase_inc

                val = (
                    0.60 * math.sin(current_phase)
                    + 0.25 * math.sin(2.0 * current_phase)
                    + 0.15 * math.sin(3.0 * current_phase)
                )

                sample_val = int(val * envelope * 16000)
                sample_val = max(-32767, min(32767, sample_val))
                samples.append(sample_val)

            # 30ms pause
            for _ in range(int(self.sample_rate * 0.03)):
                samples.append(0)

        byte_io = io.BytesIO()
        with wave.open(byte_io, "wb") as wav_file:
            wav_file.setnchannels(1)  # Mono
            wav_file.setsampwidth(2)  # 16-bit
            wav_file.setframerate(self.sample_rate)
            raw_data = struct.pack(f"<{len(samples)}h", *samples)
            wav_file.writeframes(raw_data)

        return byte_io.getvalue()

    def synthesize_to_file(self, text: str, output_path: Union[str, Path]) -> Path:
        """Synthesize and write WAV to disk."""
        target = Path(output_path)
        target.parent.mkdir(parents=True, exist_ok=True)
        wav_bytes = self.synthesize_wav_bytes(text)
        with open(target, "wb") as f:
            f.write(wav_bytes)
        return target

    def _empty_wav(self) -> bytes:
        byte_io = io.BytesIO()
        with wave.open(byte_io, "wb") as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(self.sample_rate)
            wav_file.writeframes(b"")
        return byte_io.getvalue()
