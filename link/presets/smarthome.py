"""
Thitho Link: Smart Home Node (Kĩhingo kĩa Mũciĩ)
Translates local voice and text commands in Gĩkũyũ into structured IoT device actions
compatible with Home Assistant, MQTT, Zigbee, and ESP32 edge nodes.
"""

from typing import Any, Dict, Optional
from ikumbi.normalizer import normalize_orthography


class SmartHomeEdgeNode:
    """
    Offline IoT controller parsing natural Gĩkũyũ voice and text instructions.
    """

    def __init__(self):
        self.device_states = {
            "mũrango_wa_nja": {"name": "Exterior Door", "state": "LOCKED", "type": "lock"},
            "tawa_wa_nyũmba": {"name": "Living Room Light", "state": "OFF", "type": "light"},
            "tawa_wa_thome": {"name": "Porch Light", "state": "OFF", "type": "light"},
            "ũrugarĩ": {"name": "Temperature Sensor", "value": "22.5°C", "type": "sensor"},
        }

    def process_command(self, raw_command: str) -> Dict[str, Any]:
        """
        Parse natural Gĩkũyũ command and update local device state.
        """
        clean_cmd = normalize_orthography(raw_command.lower())

        # 1. Door Commands (Hinga / Hingũra mũrango)
        if "mũrango" in clean_cmd:
            if any(w in clean_cmd for w in ["hingũra", "hingura", "open", "unlock"]):
                self.device_states["mũrango_wa_nja"]["state"] = "UNLOCKED"
                return {
                    "action": "DOOR_UNLOCK",
                    "device": "mũrango_wa_nja",
                    "iot_payload": {"state": "UNLOCKED", "topic": "thitho/door/exterior"},
                    "response_gikuyu": "Nĩ ndahingũra mũrango wa nja.",
                    "response_english": "I have unlocked the exterior door.",
                    "status": "SUCCESS",
                }
            else:
                self.device_states["mũrango_wa_nja"]["state"] = "LOCKED"
                return {
                    "action": "DOOR_LOCK",
                    "device": "mũrango_wa_nja",
                    "iot_payload": {"state": "LOCKED", "topic": "thitho/door/exterior"},
                    "response_gikuyu": "Nĩ ndahinga mũrango wa nja wega. Ũgitĩri nĩ mwĩkĩre.",
                    "response_english": "I have securely locked the exterior door.",
                    "status": "SUCCESS",
                }

        # 2. Light Commands (Aria / Horia tawa)
        if "tawa" in clean_cmd:
            target_light = "tawa_wa_thome" if "thome" in clean_cmd else "tawa_wa_nyũmba"
            if any(w in clean_cmd for w in ["horia", "off"]):
                self.device_states[target_light]["state"] = "OFF"
                return {
                    "action": "LIGHT_OFF",
                    "device": target_light,
                    "iot_payload": {"power": "OFF", "topic": f"thitho/light/{target_light}"},
                    "response_gikuyu": "Tawa nĩ wahorio.",
                    "response_english": "The light has been switched off.",
                    "status": "SUCCESS",
                }
            else:
                self.device_states[target_light]["state"] = "ON"
                return {
                    "action": "LIGHT_ON",
                    "device": target_light,
                    "iot_payload": {"power": "ON", "brightness": 100, "topic": f"thitho/light/{target_light}"},
                    "response_gikuyu": "Nĩ ndaria tawa. Ũtheri nĩ waingĩha.",
                    "response_english": "I have turned on the light. The room is now illuminated.",
                    "status": "SUCCESS",
                }

        # 3. Temperature Query (Ũrugarĩ)
        if any(w in clean_cmd for w in ["ũrugarĩ", "urugari", "heho", "temperature"]):
            val = self.device_states["ũrugarĩ"]["value"]
            return {
                "action": "TEMPERATURE_QUERY",
                "device": "sensor_temp",
                "iot_payload": {"temperature": 22.5, "unit": "celsius"},
                "response_gikuyu": f"Ũrugarĩ wa nyũmba rĩu nĩ {val}. Heho ndĩrĩ thĩinĩ.",
                "response_english": f"Current indoor temperature is {val}. The climate is comfortable.",
                "status": "SUCCESS",
            }

        # Unrecognized command
        return {
            "action": "UNKNOWN_INTENT",
            "device": None,
            "iot_payload": {},
            "response_gikuyu": f"Ndirataũkĩrwo nĩ watho ũcio: '{raw_command}'. Kũmbia kana nĩ mũrango, tawa, kana ũrugarĩ.",
            "response_english": f"I did not understand the command '{raw_command}'. Please specify door, light, or temperature.",
            "status": "UNRECOGNIZED",
        }

    def get_all_states(self) -> Dict[str, Any]:
        """Return snapshot of all smart home devices."""
        return self.device_states
