"""
Unit Tests for Thitho Link API Bridge (REST & GraphQL)
"""

import sys
import unittest

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from fastapi.testclient import TestClient
from link.app import app


class TestThithoLink(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_health_check(self):
        resp = self.client.get("/api/v1/health")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["status"], "healthy")
        self.assertEqual(data["mode"], "offline-first")
        self.assertIn("hardware", data)
        self.assertIn("database_stats", data)

    def test_translation_endpoint(self):
        resp = self.client.post(
            "/api/v1/translate",
            json={"text": "mũrĩmi", "source_lang": "kik_Latn", "target_lang": "eng_Latn"},
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(len(data["translated_text"]) > 0)
        self.assertIn("confidence", data)

    def test_dictionary_endpoint(self):
        resp = self.client.get("/api/v1/dictionary/mũrĩmi")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["exact_match"])
        self.assertEqual(data["results"][0]["lemma"], "mũrĩmi")

    def test_tts_endpoint(self):
        resp = self.client.post(
            "/api/v1/tts",
            json={"text": "Mũrĩmi nĩ ahandaga mbembe.", "return_audio_stream": False},
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["byte_size"] > 1000)
        self.assertTrue(len(data["audio_base64"]) > 0)
        self.assertTrue(len(data["pitch_contour"]) > 0)

    def test_smarthome_endpoint(self):
        resp = self.client.post(
            "/api/v1/edge/smarthome",
            json={"command": "Hinga mũrango wa nja"},
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["action"], "DOOR_LOCK")
        self.assertEqual(data["status"], "SUCCESS")

    def test_agriculture_endpoint(self):
        resp = self.client.post(
            "/api/v1/edge/agriculture",
            json={"crop": "mbembe", "symptoms": "mathangũ mahũndũkĩte"},
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["status"], "DIAGNOSIS_MATCHED")

    def test_parallel_endpoint(self):
        resp = self.client.get("/api/v1/parallel")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("results", data)
        self.assertTrue(len(data["results"]) > 0)

    def test_audio_endpoint(self):
        resp = self.client.get("/api/v1/audio")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("results", data)
        self.assertTrue(len(data["results"]) > 0)

    def test_tts_audio_stream(self):
        resp = self.client.post(
            "/api/v1/tts",
            json={"text": "Mũrĩmi", "return_audio_stream": True},
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.headers.get("content-type"), "audio/wav")
        self.assertTrue(resp.content.startswith(b"RIFF"))

    def test_audio_wav_stream(self):
        resp = self.client.get("/api/v1/audio/1/wav")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.headers.get("content-type"), "audio/wav")
        self.assertTrue(resp.content.startswith(b"RIFF"))

    def test_stt_endpoint(self):
        resp = self.client.post(
            "/api/v1/stt",
            json={"audio_path_or_id": "cv_kik_001.wav"},
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("transcription", data)
        self.assertTrue(data["tonal_verified"])

    def test_stt_base64_endpoint(self):
        resp = self.client.post(
            "/api/v1/stt",
            json={"audio_base64": "UklGRgAAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA="},
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("transcription", data)
        self.assertTrue(data["confidence"] > 0.8)

    def test_smarthome_toggle(self):
        resp = self.client.post(
            "/api/v1/edge/smarthome/toggle",
            json={"device": "mũrango_wa_nja", "state": "UNLOCKED"},
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["data"]["state"], "UNLOCKED")

    def test_smarthome_mqtt_logs(self):
        resp = self.client.get("/api/v1/edge/smarthome/mqtt")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("logs", data)

    def test_smarthome_websocket(self):
        with self.client.websocket_connect("/ws/smarthome") as ws:
            init_msg = ws.receive_json()
            self.assertEqual(init_msg["type"], "INIT")
            self.assertIn("devices", init_msg)

            # Send a command over websocket
            ws.send_json({"type": "COMMAND", "command": "Hinga mũrango wa nja"})
            resp = ws.receive_json()
            self.assertEqual(resp["type"], "COMMAND_RESPONSE")
            self.assertEqual(resp["result"]["action"], "DOOR_LOCK")

    def test_graphql_endpoint(self):
        query = '{ stats { totalWords totalParallelSentences } }'
        resp = self.client.post("/graphql", json={"query": query})
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("data", data)
        self.assertIn("stats", data["data"])


if __name__ == "__main__":
    unittest.main()
