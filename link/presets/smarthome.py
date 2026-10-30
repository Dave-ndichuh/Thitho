"""
Thitho Link: Smart Home Node (Kĩhingo kĩa Mũciĩ)
Translates local voice and text commands in Gĩkũyũ into structured IoT device actions
compatible with Home Assistant, MQTT, Zigbee, and ESP32 edge nodes.
"""

import json
import logging
import time
from typing import Any, Callable, Dict, List, Optional

from ikumbi.normalizer import normalize_orthography

logger = logging.getLogger(__name__)

try:
    import paho.mqtt.client as mqtt
    HAS_MQTT = True
except ImportError:
    mqtt = None
    HAS_MQTT = False


class SmartHomeEdgeNode:
    """
    Offline IoT controller parsing natural Gĩkũyũ voice and text instructions.
    Publishes MQTT payloads and maintains live device state.
    """

    def __init__(self, broker_host: str = "127.0.0.1", broker_port: int = 1883):
        self.device_states = {
            "mũrango_wa_nja": {"name": "Exterior Door", "state": "LOCKED", "type": "lock"},
            "tawa_wa_nyũmba": {"name": "Living Room Light", "state": "OFF", "type": "light"},
            "tawa_wa_thome": {"name": "Porch Light", "state": "OFF", "type": "light"},
            "ũrugarĩ": {"name": "Temperature Sensor", "value": "22.5°C", "type": "sensor"},
        }
        self.mqtt_logs: List[Dict[str, Any]] = []
        self._listeners: List[Callable[[str, Dict[str, Any]], None]] = []
        self.broker_host = broker_host
        self.broker_port = broker_port
        self._mqtt_client = None
        self._init_mqtt()

    def _init_mqtt(self):
        """Optional connection to local MQTT broker (e.g. Mosquitto on Raspberry Pi / Edge PC)."""
        if not HAS_MQTT:
            return
        try:
            client = mqtt.Client(callback_api_version=mqtt.CallbackAPIVersion.VERSION2, client_id="thitho_link_hub")
            # Connect with short timeout so it doesn't block if broker not active
            client.connect_async(self.broker_host, self.broker_port, keepalive=60)
            client.loop_start()
            self._mqtt_client = client
            logger.info(f"MQTT Client initialized for {self.broker_host}:{self.broker_port}")
        except Exception as e:
            logger.debug(f"Local MQTT broker not reachable (operating in simulated mode): {e}")
            self._mqtt_client = None

    def register_listener(self, callback: Callable[[str, Dict[str, Any]], None]):
        """Subscribe to device state change events."""
        if callback not in self._listeners:
            self._listeners.append(callback)

    def unregister_listener(self, callback: Callable[[str, Dict[str, Any]], None]):
        if callback in self._listeners:
            self._listeners.remove(callback)

    def _notify(self, device_id: str):
        dev = self.device_states.get(device_id, {})
        for cb in self._listeners:
            try:
                cb(device_id, dev)
            except Exception as e:
                logger.error(f"Error in state change listener: {e}")

    def publish_mqtt(self, topic: str, payload: Dict[str, Any]):
        """Publish payload to MQTT broker and record in audit buffer."""
        log_entry = {
            "topic": topic,
            "payload": payload,
            "timestamp": time.time(),
            "iso_time": time.strftime("%Y-%m-%d %H:%M:%S"),
        }
        self.mqtt_logs.append(log_entry)
        if len(self.mqtt_logs) > 30:
            self.mqtt_logs.pop(0)

        if self._mqtt_client:
            try:
                self._mqtt_client.publish(topic, json.dumps(payload), qos=1)
            except Exception as e:
                logger.debug(f"MQTT publish error: {e}")

    def set_device_state(self, device_id: str, new_state: str) -> Optional[Dict[str, Any]]:
        """Directly update a device state and dispatch MQTT & listeners."""
        if device_id not in self.device_states:
            return None
        self.device_states[device_id]["state"] = new_state
        topic = f"thitho/{self.device_states[device_id]['type']}/{device_id}"
        self.publish_mqtt(topic, {"state": new_state})
        self._notify(device_id)
        return self.device_states[device_id]

    def process_command(self, raw_command: str) -> Dict[str, Any]:
        """
        Parse natural Gĩkũyũ command and update local device state.
        """
        clean_cmd = normalize_orthography(raw_command.lower())

        # 1. Door Commands (Hinga / Hingũra mũrango)
        if "mũrango" in clean_cmd:
            if any(w in clean_cmd for w in ["hingũra", "hingura", "open", "unlock"]):
                self.device_states["mũrango_wa_nja"]["state"] = "UNLOCKED"
                payload = {"state": "UNLOCKED", "topic": "thitho/door/mũrango_wa_nja"}
                self.publish_mqtt(payload["topic"], payload)
                self._notify("mũrango_wa_nja")
                return {
                    "action": "DOOR_UNLOCK",
                    "device": "mũrango_wa_nja",
                    "iot_payload": payload,
                    "response_gikuyu": "Nĩ ndahingũra mũrango wa nja.",
                    "response_english": "I have unlocked the exterior door.",
                    "status": "SUCCESS",
                }
            else:
                self.device_states["mũrango_wa_nja"]["state"] = "LOCKED"
                payload = {"state": "LOCKED", "topic": "thitho/door/mũrango_wa_nja"}
                self.publish_mqtt(payload["topic"], payload)
                self._notify("mũrango_wa_nja")
                return {
                    "action": "DOOR_LOCK",
                    "device": "mũrango_wa_nja",
                    "iot_payload": payload,
                    "response_gikuyu": "Nĩ ndahinga mũrango wa nja wega. Ũgitĩri nĩ mwĩkĩre.",
                    "response_english": "I have securely locked the exterior door.",
                    "status": "SUCCESS",
                }

        # 2. Light Commands (Aria / Horia tawa)
        if "tawa" in clean_cmd:
            target_light = "tawa_wa_thome" if "thome" in clean_cmd else "tawa_wa_nyũmba"
            if any(w in clean_cmd for w in ["horia", "off"]):
                self.device_states[target_light]["state"] = "OFF"
                payload = {"power": "OFF", "topic": f"thitho/light/{target_light}"}
                self.publish_mqtt(payload["topic"], payload)
                self._notify(target_light)
                return {
                    "action": "LIGHT_OFF",
                    "device": target_light,
                    "iot_payload": payload,
                    "response_gikuyu": "Tawa nĩ wahorio.",
                    "response_english": "The light has been switched off.",
                    "status": "SUCCESS",
                }
            else:
                self.device_states[target_light]["state"] = "ON"
                payload = {"power": "ON", "brightness": 100, "topic": f"thitho/light/{target_light}"}
                self.publish_mqtt(payload["topic"], payload)
                self._notify(target_light)
                return {
                    "action": "LIGHT_ON",
                    "device": target_light,
                    "iot_payload": payload,
                    "response_gikuyu": "Nĩ ndaria tawa. Ũtheri nĩ waingĩha.",
                    "response_english": "I have turned on the light. The room is now illuminated.",
                    "status": "SUCCESS",
                }

        # 3. Temperature Query (Ũrugarĩ)
        if any(w in clean_cmd for w in ["ũrugarĩ", "urugari", "heho", "temperature"]):
            val = self.device_states["ũrugarĩ"]["value"]
            payload = {"temperature": 22.5, "unit": "celsius", "topic": "thitho/sensor/temperature"}
            self.publish_mqtt(payload["topic"], payload)
            return {
                "action": "TEMPERATURE_QUERY",
                "device": "sensor_temp",
                "iot_payload": payload,
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

    def get_mqtt_logs(self) -> List[Dict[str, Any]]:
        """Return historical audit log of published MQTT payloads."""
        return self.mqtt_logs
