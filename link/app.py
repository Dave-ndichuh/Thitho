"""
Thitho Link: Local Offline API Bridge
FastAPI & GraphQL server providing zero-cloud localized inference,
translation, speech synthesis, and edge IoT routing for Gĩkũyũ applications.
"""

import asyncio
import io
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

from fastapi import FastAPI, HTTPException, Query, Response, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from ikumbi.normalizer import normalize_orthography
from ikumbi.storage.db import IkumbiDB
from taura_mugambo.taura.translator import ThithoTranslator
from taura_mugambo.mugambo.seamless_m4t import SeamlessM4TEngine
from .edge_router import EdgeRouter
from .graphql_schema import ThithoGraphQLBridge
from .presets.agriculture import AgriculturalEdgeAdvisor
from .presets.smarthome import SmartHomeEdgeNode

app = FastAPI(
    title="Thitho Link API Bridge",
    description="Offline-First Technological Ecosystem for the Gĩkũyũ Language",
    version="1.0.0",
)

# Enable CORS for local dashboards, web apps, and local IoT controllers
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Shared Singletons
db = IkumbiDB()
translator = ThithoTranslator(db=db)
speech_engine = SeamlessM4TEngine(db=db)
router = EdgeRouter()
agri_advisor = AgriculturalEdgeAdvisor()
smarthome = SmartHomeEdgeNode()
graphql_bridge = ThithoGraphQLBridge(db=db)


class SmartHomeWebSocketManager:
    """Manages real-time WebSocket connections and broadcasts IoT state transitions."""
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self._loop: Optional[asyncio.AbstractEventLoop] = None

    def set_loop(self, loop: asyncio.AbstractEventLoop):
        self._loop = loop

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: Dict[str, Any]):
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.append(connection)
        for d in disconnected:
            self.disconnect(d)

    def broadcast_sync(self, message: Dict[str, Any]):
        if not self.active_connections:
            return
        try:
            loop = self._loop or asyncio.get_event_loop()
            if loop.is_running():
                asyncio.run_coroutine_threadsafe(self.broadcast(message), loop)
        except Exception:
            pass


ws_manager = SmartHomeWebSocketManager()


def on_device_changed(device_id: str, device_data: Dict[str, Any]):
    ws_manager.broadcast_sync({
        "type": "DEVICE_UPDATE",
        "device": device_id,
        "data": device_data,
        "mqtt_logs": smarthome.get_mqtt_logs(),
    })


smarthome.register_listener(on_device_changed)


# -------------------------------------------------------------
# Request / Response Schemas
# -------------------------------------------------------------

class TranslateRequest(BaseModel):
    text: str = Field(..., examples=["Mũrĩmi nĩ ahandaga mbembe."])
    source_lang: str = Field("kik_Latn", examples=["kik_Latn"])
    target_lang: str = Field("eng_Latn", examples=["eng_Latn"])


class TTSRequest(BaseModel):
    text: str = Field(..., examples=["Mũrĩmi nĩ ahandaga mbembe rĩrĩa mbura yagia."])
    return_audio_stream: bool = Field(False, description="If True, returns audio/wav binary stream")


class STTRequest(BaseModel):
    audio_path_or_id: Optional[str] = Field(None, examples=["cv_kik_001.wav"])
    audio_base64: Optional[str] = Field(None, description="Base64 encoded audio bytes")


class AgriQueryRequest(BaseModel):
    crop: str = Field(..., examples=["mbembe"])
    symptoms: str = Field(..., examples=["mathangũ mahũndũkĩte"])


class SmartHomeCommandRequest(BaseModel):
    command: str = Field(..., examples=["Hinga mũrango wa nja"])


class SmartHomeToggleRequest(BaseModel):
    device: str = Field(..., examples=["mũrango_wa_nja"])
    state: str = Field(..., examples=["LOCKED"])


class GraphQLRequest(BaseModel):
    query: str
    variables: Optional[Dict[str, Any]] = None


# -------------------------------------------------------------
# REST Endpoints
# -------------------------------------------------------------

@app.get("/")
def get_root():
    return {
        "ecosystem": "Thitho Ecosystem",
        "service": "Thitho Link (Local API Bridge)",
        "status": "ONLINE (OFFLINE-FIRST)",
        "docs_url": "/docs",
        "graphql_url": "/graphql",
        "endpoints": {
            "translate": "/api/v1/translate",
            "dictionary": "/api/v1/dictionary/{word}",
            "tts": "/api/v1/tts",
            "stt": "/api/v1/stt",
            "agriculture": "/api/v1/edge/agriculture",
            "smarthome": "/api/v1/edge/smarthome",
            "health": "/api/v1/health",
        },
    }


@app.get("/api/v1/health")
def get_health():
    stats = db.get_stats()
    hw = router.get_status_dict()
    return {
        "status": "healthy",
        "mode": "offline-first",
        "hardware": hw,
        "database_stats": stats,
    }


@app.post("/api/v1/translate")
def translate_text(req: TranslateRequest):
    if req.target_lang == "kik_Latn":
        result = translator.to_gikuyu(req.text)
    else:
        result = translator.to_english(req.text)
    return result


@app.get("/api/v1/dictionary/{word}")
def get_dictionary_word(word: str):
    entry = db.get_word(word)
    if not entry:
        matches = db.search_dictionary(word, limit=5)
        if matches:
            return {"query": word, "exact_match": False, "results": matches}
        raise HTTPException(status_code=404, detail=f"Word '{word}' not found in Ikũmbi.")
    return {"query": word, "exact_match": True, "results": [entry]}


@app.get("/api/v1/dictionary")
def search_dictionary(q: str = Query(..., description="Query search term"), limit: int = 15):
    results = db.search_dictionary(q, limit=limit)
    return {"query": q, "count": len(results), "results": results}


@app.get("/api/v1/parallel")
def get_parallel_corpus(
    q: Optional[str] = Query(None, description="Search parallel corpus text"),
    domain: Optional[str] = Query(None, description="Filter by domain"),
    limit: int = 50,
):
    if q and q.strip():
        items = db.search_parallel(q.strip(), limit=limit)
    else:
        items = db.get_parallel_dataset(limit=limit)

    if domain and domain != "all":
        items = [item for item in items if item.get("domain") == domain]

    return {"count": len(items), "results": items}


@app.get("/api/v1/audio")
def get_audio_corpus(limit: int = 50):
    items = db.get_audio_dataset(limit=limit)
    return {"count": len(items), "results": items}


@app.get("/api/v1/audio/{audio_id}/wav")
def get_audio_wav(audio_id: int):
    item = db.get_audio_by_id(audio_id)
    if not item:
        raise HTTPException(status_code=404, detail=f"Audio sample #{audio_id} not found in Ikũmbi.")

    p = Path(item["audio_path"])
    if p.exists() and p.is_file():
        return Response(content=p.read_bytes(), media_type="audio/wav")

    res = speech_engine.synthesize_speech(item["normalized_text"])
    filename = Path(item["audio_path"]).name
    return Response(
        content=res["wav_bytes"],
        media_type="audio/wav",
        headers={"Content-Disposition": f"inline; filename={filename}"},
    )


@app.post("/api/v1/tts")
def text_to_speech(req: TTSRequest):
    res = speech_engine.synthesize_speech(req.text)
    if req.return_audio_stream:
        return Response(
            content=res["wav_bytes"],
            media_type="audio/wav",
            headers={"Content-Disposition": "inline; filename=speech.wav"},
        )
    # Return JSON with metadata and base64/length
    import base64
    b64_audio = base64.b64encode(res["wav_bytes"]).decode("utf-8")
    return {
        "text": res["text"],
        "byte_size": res["byte_size"],
        "estimated_duration": res["estimated_duration"],
        "pitch_contour": res["pitch_contour"],
        "syllables": res["syllables"],
        "audio_base64": b64_audio,
    }


@app.post("/api/v1/stt")
def speech_to_text(req: STTRequest):
    if req.audio_base64:
        return speech_engine.transcribe_base64(req.audio_base64)
    return speech_engine.transcribe_audio(req.audio_path_or_id or "cv_kik_001.wav")


@app.post("/api/v1/edge/agriculture")
def consult_agriculture(req: AgriQueryRequest):
    return agri_advisor.diagnose_crop_issue(req.crop, req.symptoms)


@app.get("/api/v1/edge/agriculture/seasons")
def get_farming_seasons():
    return agri_advisor.get_seasonal_calendar()


@app.post("/api/v1/edge/smarthome")
def command_smarthome(req: SmartHomeCommandRequest):
    return smarthome.process_command(req.command)


@app.get("/api/v1/edge/smarthome/devices")
def get_smarthome_devices():
    return smarthome.get_all_states()


@app.post("/api/v1/edge/smarthome/toggle")
def toggle_smarthome_device(req: SmartHomeToggleRequest):
    res = smarthome.set_device_state(req.device, req.state)
    if not res:
        raise HTTPException(status_code=404, detail=f"Device '{req.device}' not found.")
    return {"status": "SUCCESS", "device": req.device, "data": res}


@app.get("/api/v1/edge/smarthome/mqtt")
def get_smarthome_mqtt_logs():
    logs = smarthome.get_mqtt_logs()
    return {"count": len(logs), "logs": logs}


@app.websocket("/ws/smarthome")
async def websocket_smarthome_endpoint(websocket: WebSocket):
    ws_manager.set_loop(asyncio.get_running_loop())
    await ws_manager.connect(websocket)
    try:
        # Initial greeting with current IoT snapshot
        await websocket.send_json({
            "type": "INIT",
            "devices": smarthome.get_all_states(),
            "mqtt_logs": smarthome.get_mqtt_logs(),
        })
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")
            if msg_type == "COMMAND":
                cmd = data.get("command", "")
                res = smarthome.process_command(cmd)
                await websocket.send_json({"type": "COMMAND_RESPONSE", "result": res})
            elif msg_type == "TOGGLE":
                dev = data.get("device", "")
                st = data.get("state", "")
                updated = smarthome.set_device_state(dev, st)
                if updated:
                    await websocket.send_json({"type": "TOGGLE_ACK", "device": dev, "data": updated})
    except (WebSocketDisconnect, Exception):
        ws_manager.disconnect(websocket)


# -------------------------------------------------------------
# GraphQL Endpoint
# -------------------------------------------------------------

@app.post("/graphql")
def handle_graphql(req: GraphQLRequest):
    return graphql_bridge.execute(req.query, req.variables)


@app.get("/graphql")
def handle_graphql_get(query: str = Query(...)):
    return graphql_bridge.execute(query)


def start_server(host: str = "127.0.0.1", port: int = 8000):
    """Entry point to launch the local bridge server."""
    import uvicorn
    print(f"🌉 Starting Thitho Link API Bridge on http://{host}:{port}...")
    uvicorn.run(app, host=host, port=port)


if __name__ == "__main__":
    start_server()
