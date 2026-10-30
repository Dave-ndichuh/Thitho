"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Home,
  Lock,
  Unlock,
  Lightbulb,
  Thermometer,
  Radio,
  Send,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Wifi,
  WifiOff,
  Cpu,
  Layers,
  Terminal,
  Activity,
  Zap,
  Volume2,
} from "lucide-react";
import {
  executeSmartHomeCommand,
  fetchSmartHomeDevices,
  toggleSmartHomeDevice,
  fetchMqttLogs,
  createSmartHomeWebSocket,
  speakAloud,
  SmartHomeActionResponse,
  MqttLogItem,
} from "@/lib/api";

export default function SmartHomePage() {
  const [doorLocked, setDoorLocked] = useState(true);
  const [mainLight, setMainLight] = useState(false);
  const [porchLight, setPorchLight] = useState(false);
  const [temperature, setTemperature] = useState("22.5°C");

  const [commandInput, setCommandInput] = useState("Hinga mũrango wa nja");
  const [isExecuting, setIsExecuting] = useState(false);
  const [isToggling, setIsToggling] = useState<string | null>(null);

  const [wsConnected, setWsConnected] = useState(false);
  const [mqttLogs, setMqttLogs] = useState<MqttLogItem[]>([]);
  const [activeTab, setActiveTab] = useState<"controls" | "mqtt_stream">("controls");

  const [lastLog, setLastLog] = useState<SmartHomeActionResponse>({
    action: "DOOR_LOCK",
    response_gikuyu: "Nĩ ndahinga mũrango wa nja wega. Ũgitĩri nĩ mwĩkĩre.",
    response_english: "I have securely locked the exterior door.",
    status: "SUCCESS",
  });

  const wsClientRef = useRef<{ close: () => void; send: (msg: any) => void } | null>(null);

  // Load devices and initialize WebSocket
  useEffect(() => {
    async function init() {
      // 1. Initial REST/IndexedDB fetch
      const devs = await fetchSmartHomeDevices();
      updateLocalStates(devs);

      const logs = await fetchMqttLogs();
      setMqttLogs(logs);

      // 2. Open WebSocket stream
      wsClientRef.current = createSmartHomeWebSocket(
        (msg: any) => {
          if (msg.type === "INIT" && msg.devices) {
            updateLocalStates(msg.devices);
            if (msg.mqtt_logs) setMqttLogs(msg.mqtt_logs);
          } else if (msg.type === "DEVICE_UPDATE") {
            const devId = msg.device;
            const data = msg.data;
            if (devId === "mũrango_wa_nja") setDoorLocked(data.state === "LOCKED");
            else if (devId === "tawa_wa_nyũmba") setMainLight(data.state === "ON");
            else if (devId === "tawa_wa_thome") setPorchLight(data.state === "ON");
            else if (devId === "ũrugarĩ") setTemperature(data.value || "22.5°C");

            if (msg.mqtt_logs) setMqttLogs(msg.mqtt_logs);
          } else if (msg.type === "COMMAND_RESPONSE") {
            if (msg.result) setLastLog(msg.result);
          }
        },
        (connected: boolean) => {
          setWsConnected(connected);
        }
      );
    }

    init();

    return () => {
      if (wsClientRef.current) {
        wsClientRef.current.close();
      }
    };
  }, []);

  const updateLocalStates = (devs: Record<string, any>) => {
    if (devs["mũrango_wa_nja"]) {
      setDoorLocked(devs["mũrango_wa_nja"].state === "LOCKED");
    }
    if (devs["tawa_wa_nyũmba"]) {
      setMainLight(devs["tawa_wa_nyũmba"].state === "ON");
    }
    if (devs["tawa_wa_thome"]) {
      setPorchLight(devs["tawa_wa_thome"].state === "ON");
    }
    if (devs["ũrugarĩ"]) {
      setTemperature(devs["ũrugarĩ"].value || "22.5°C");
    }
  };

  // Direct toggle on card
  const handleToggle = async (device: string, currentState: boolean) => {
    setIsToggling(device);
    let newState = "";
    if (device === "mũrango_wa_nja") {
      newState = currentState ? "UNLOCKED" : "LOCKED";
      setDoorLocked(!currentState);
    } else {
      newState = currentState ? "OFF" : "ON";
      if (device === "tawa_wa_nyũmba") setMainLight(!currentState);
      if (device === "tawa_wa_thome") setPorchLight(!currentState);
    }

    // Try dispatching over WebSocket if active, or fallback to REST
    if (wsClientRef.current && wsConnected) {
      wsClientRef.current.send({
        type: "TOGGLE",
        device,
        state: newState,
      });
    }

    try {
      await toggleSmartHomeDevice(device, newState);
      const logs = await fetchMqttLogs();
      setMqttLogs(logs);
    } finally {
      setIsToggling(null);
    }
  };

  const handleCommand = async (cmdText?: string) => {
    const text = (cmdText || commandInput).trim();
    if (!text) return;

    setIsExecuting(true);
    try {
      // Optimistic UI updates
      const lower = text.toLowerCase();
      if (lower.includes("mũrango") || lower.includes("door")) {
        if (lower.includes("hingũra") || lower.includes("open") || lower.includes("unlock")) {
          setDoorLocked(false);
        } else {
          setDoorLocked(true);
        }
      } else if (lower.includes("tawa") || lower.includes("light")) {
        if (lower.includes("horia") || lower.includes("off")) {
          if (lower.includes("thome")) setPorchLight(false);
          else setMainLight(false);
        } else {
          if (lower.includes("thome")) setPorchLight(true);
          else setMainLight(true);
        }
      }

      // If WebSocket active, send command over WS for 0ms broadcast
      if (wsClientRef.current && wsConnected) {
        wsClientRef.current.send({ type: "COMMAND", command: text });
      }

      const res = await executeSmartHomeCommand(text);
      setLastLog(res);

      const logs = await fetchMqttLogs();
      setMqttLogs(logs);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Title & Connection Header */}
      <div className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Home className="w-6 h-6 text-amber-400" />
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Kĩhingo kĩa Mũciĩ (Smart Home Edge Node)
            </h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Offline voice & text IoT controller executing natural Gĩkũyũ commands locally via MQTT & WebSockets.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* WebSocket Live Badge */}
          <div
            className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono border ${
              wsConnected
                ? "bg-emerald-950/70 border-emerald-800/60 text-emerald-300"
                : "bg-amber-950/70 border-amber-800/60 text-amber-300"
            }`}
          >
            {wsConnected ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>WebSocket Live (Push)</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                <span>IndexedDB Sync (Polling)</span>
              </>
            )}
          </div>

          {/* MQTT Broker Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300">
            <Radio className="w-3.5 h-3.5 text-amber-400" />
            <span>MQTT: Active</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800 gap-4">
        <button
          onClick={() => setActiveTab("controls")}
          className={`pb-2 text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition border-b-2 ${
            activeTab === "controls"
              ? "border-amber-400 text-white"
              : "border-transparent text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Device Controls & Natural Speech</span>
        </button>
        <button
          onClick={() => setActiveTab("mqtt_stream")}
          className={`pb-2 text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition border-b-2 ${
            activeTab === "mqtt_stream"
              ? "border-amber-400 text-white"
              : "border-transparent text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Live MQTT Stream ({mqttLogs.length})</span>
        </button>
      </div>

      {activeTab === "controls" && (
        <>
          {/* Device Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Door Lock */}
            <div className="p-5 rounded-2xl border border-zinc-800 bg-[#0e140e] space-y-4 shadow transition hover:border-zinc-700">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Mũrango wa Nja
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                    doorLocked
                      ? "bg-emerald-950 text-emerald-400 border border-emerald-800/40"
                      : "bg-red-950 text-red-400 border border-red-800/40"
                  }`}
                >
                  {doorLocked ? "HINGE (LOCKED)" : "HINGŨRE (OPEN)"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div
                  className={`p-3 rounded-xl border ${
                    doorLocked
                      ? "bg-emerald-950/40 border-emerald-800/50 text-emerald-400"
                      : "bg-red-950/40 border-red-800/50 text-red-400"
                  }`}
                >
                  {doorLocked ? <Lock className="w-6 h-6" /> : <Unlock className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Exterior Entrance</h3>
                  <p className="text-[11px] text-zinc-400">Main Homestead Portal</p>
                </div>
              </div>
              <button
                onClick={() => handleToggle("mũrango_wa_nja", doorLocked)}
                disabled={isToggling === "mũrango_wa_nja"}
                className={`w-full py-2 rounded-xl text-xs font-bold transition shadow ${
                  doorLocked
                    ? "bg-red-900/60 hover:bg-red-800 text-red-200 border border-red-700/50"
                    : "bg-emerald-800 hover:bg-emerald-700 text-white"
                }`}
              >
                {doorLocked ? "Hingũra (Unlock Door)" : "Hinga (Lock Door)"}
              </button>
            </div>

            {/* Living Room Light */}
            <div className="p-5 rounded-2xl border border-zinc-800 bg-[#0e140e] space-y-4 shadow transition hover:border-zinc-700">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Tawa wa Nyũmba
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                    mainLight
                      ? "bg-amber-950 text-amber-300 border border-amber-800/40"
                      : "bg-zinc-900 text-zinc-500 border border-zinc-800"
                  }`}
                >
                  {mainLight ? "MWAKŨ (ON)" : "MŨHORIE (OFF)"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div
                  className={`p-3 rounded-xl border ${
                    mainLight
                      ? "bg-amber-950/50 border-amber-700/60 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                      : "bg-zinc-900 border-zinc-800 text-zinc-500"
                  }`}
                >
                  <Lightbulb className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Living Room Light</h3>
                  <p className="text-[11px] text-zinc-400">Indoor Luminaire</p>
                </div>
              </div>
              <button
                onClick={() => handleToggle("tawa_wa_nyũmba", mainLight)}
                disabled={isToggling === "tawa_wa_nyũmba"}
                className={`w-full py-2 rounded-xl text-xs font-bold transition shadow ${
                  mainLight
                    ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                    : "bg-amber-600 hover:bg-amber-500 text-white"
                }`}
              >
                {mainLight ? "Horia (Switch Off)" : "Aria (Switch On)"}
              </button>
            </div>

            {/* Porch Light */}
            <div className="p-5 rounded-2xl border border-zinc-800 bg-[#0e140e] space-y-4 shadow transition hover:border-zinc-700">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Tawa wa Thome
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                    porchLight
                      ? "bg-amber-950 text-amber-300 border border-amber-800/40"
                      : "bg-zinc-900 text-zinc-500 border border-zinc-800"
                  }`}
                >
                  {porchLight ? "MWAKŨ (ON)" : "MŨHORIE (OFF)"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div
                  className={`p-3 rounded-xl border ${
                    porchLight
                      ? "bg-amber-950/50 border-amber-700/60 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                      : "bg-zinc-900 border-zinc-800 text-zinc-500"
                  }`}
                >
                  <Lightbulb className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Porch Luminaire</h3>
                  <p className="text-[11px] text-zinc-400">Courtyard Security</p>
                </div>
              </div>
              <button
                onClick={() => handleToggle("tawa_wa_thome", porchLight)}
                disabled={isToggling === "tawa_wa_thome"}
                className={`w-full py-2 rounded-xl text-xs font-bold transition shadow ${
                  porchLight
                    ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                    : "bg-amber-600 hover:bg-amber-500 text-white"
                }`}
              >
                {porchLight ? "Horia (Switch Off)" : "Aria (Switch On)"}
              </button>
            </div>

            {/* Temperature Sensor */}
            <div className="p-5 rounded-2xl border border-zinc-800 bg-[#0e140e] space-y-4 shadow transition hover:border-zinc-700">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Ũrugarĩ wa Nyũmba
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800/40 font-mono font-bold">
                  SENSING
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-800/50 text-blue-400">
                  <Thermometer className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white font-mono">{temperature}</h3>
                  <p className="text-[11px] text-zinc-400">Thermal Comfort Index</p>
                </div>
              </div>
              <div className="py-2 px-3 rounded-xl bg-zinc-900/60 border border-zinc-800 text-[11px] text-zinc-400 text-center font-mono">
                Heho ndĩrĩ thĩinĩ (Mild)
              </div>
            </div>
          </div>

          {/* Natural Gĩkũyũ Command Console */}
          <div className="rounded-2xl border border-zinc-800 bg-[#0e140e] p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <div>
                <h2 className="text-base font-bold text-white">Natural Speech & Text Command Parser</h2>
                <p className="text-xs text-zinc-400">Gĩkũyũ language intent recognition mapped to IoT actuators</p>
              </div>
              <span className="text-xs px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/40 font-mono">
                Sub-word Intent Matcher
              </span>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={commandInput}
                onChange={(e) => setCommandInput(e.target.value)}
                placeholder="Ta watho wa Gĩkũyũ (e.g., 'Hinga mũrango wa nja', 'Aria tawa', 'Onania ũrugarĩ')..."
                className="flex-1 bg-[#131c13] border border-zinc-700/60 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-amber-500 font-medium"
              />
              <button
                onClick={() => handleCommand()}
                disabled={isExecuting}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs flex items-center gap-2 shadow transition active:scale-95"
              >
                {isExecuting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>Send Command</span>
              </button>
            </div>

            {/* Quick Suggestion Pills */}
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="text-zinc-500 font-mono py-1">Quick Presets:</span>
              {[
                "Hinga mũrango wa nja",
                "Hingũra mũrango wa nja",
                "Aria tawa wa nyũmba",
                "Horia tawa",
                "Onania ũrugarĩ",
              ].map((sample) => (
                <button
                  key={sample}
                  onClick={() => {
                    setCommandInput(sample);
                    handleCommand(sample);
                  }}
                  className="px-3 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-mono transition"
                >
                  {sample}
                </button>
              ))}
            </div>

            {/* Command Output Log */}
            {lastLog && (
              <div className="p-4 rounded-xl border border-zinc-800 bg-[#0a0f0a] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-amber-400 uppercase font-semibold">
                    Action: {lastLog.action}
                  </span>
                  {lastLog.queuedOffline ? (
                    <span className="text-xs font-mono text-amber-300 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Queued in Outbox
                    </span>
                  ) : (
                    <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Executed on Bridge (MQTT Published)
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-white">{lastLog.response_gikuyu}</p>
                    <button
                      onClick={() => speakAloud(lastLog.response_gikuyu, "gikuyu")}
                      className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-amber-400 transition"
                      title="Listen to Gĩkũyũ smart home response"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-zinc-400">{lastLog.response_english}</p>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* TAB 2: LIVE MQTT STREAM */}
      {activeTab === "mqtt_stream" && (
        <div className="rounded-2xl border border-zinc-800 bg-[#0e140e] p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-amber-400" />
              <div>
                <h2 className="text-base font-bold text-white">Live MQTT Dispatch Log</h2>
                <p className="text-xs text-zinc-400">
                  Real-time broker payloads published to local edge controllers and ESP32 nodes
                </p>
              </div>
            </div>
            <button
              onClick={async () => {
                const logs = await fetchMqttLogs();
                setMqttLogs(logs);
              }}
              className="text-xs px-3 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-mono flex items-center gap-1.5 transition"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Refresh Logs</span>
            </button>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto font-mono text-xs scrollbar-thin">
            {mqttLogs.length === 0 ? (
              <div className="p-8 text-center text-zinc-500">
                No MQTT events logged yet. Execute a command or toggle a switch to publish messages.
              </div>
            ) : (
              mqttLogs.map((log, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-900 flex items-start justify-between gap-4 transition hover:border-zinc-800"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-amber-400 font-bold">{log.topic}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                        QoS 1
                      </span>
                    </div>
                    <pre className="text-zinc-300 text-[11px] overflow-x-auto">
                      {JSON.stringify(log.payload)}
                    </pre>
                  </div>
                  <span className="text-[11px] text-zinc-500 whitespace-nowrap">
                    {log.iso_time || new Date(log.timestamp * 1000).toLocaleTimeString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
