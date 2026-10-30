"use client";

import React, { useState } from "react";
import { Home, Lock, Unlock, Lightbulb, Thermometer, Radio, Send, CheckCircle2, ShieldCheck } from "lucide-react";

export default function SmartHomePage() {
  const [doorLocked, setDoorLocked] = useState(true);
  const [mainLight, setMainLight] = useState(false);
  const [porchLight, setPorchLight] = useState(false);
  const [temperature, setTemperature] = useState("22.5°C");

  const [commandInput, setCommandInput] = useState("Hinga mũrango wa nja");
  const [lastLog, setLastLog] = useState<any>({
    action: "DOOR_LOCK",
    gikuyuResponse: "Nĩ ndahinga mũrango wa nja wega. Ũgitĩri nĩ mwĩkĩre.",
    englishResponse: "I have securely locked the exterior door.",
    topic: "thitho/door/exterior",
  });

  const handleCommand = (cmdText?: string) => {
    const text = cmdText || commandInput;
    const lower = text.toLowerCase();

    if (lower.includes("mũrango") || lower.includes("door")) {
      if (lower.includes("hingũra") || lower.includes("open") || lower.includes("unlock")) {
        setDoorLocked(false);
        setLastLog({
          action: "DOOR_UNLOCK",
          gikuyuResponse: "Nĩ ndahingũra mũrango wa nja.",
          englishResponse: "I have unlocked the exterior door.",
          topic: "thitho/door/exterior",
        });
      } else {
        setDoorLocked(true);
        setLastLog({
          action: "DOOR_LOCK",
          gikuyuResponse: "Nĩ ndahinga mũrango wa nja wega. Ũgitĩri nĩ mwĩkĩre.",
          englishResponse: "I have securely locked the exterior door.",
          topic: "thitho/door/exterior",
        });
      }
    } else if (lower.includes("tawa") || lower.includes("light")) {
      if (lower.includes("horia") || lower.includes("off")) {
        if (lower.includes("thome")) {
          setPorchLight(false);
        } else {
          setMainLight(false);
        }
        setLastLog({
          action: "LIGHT_OFF",
          gikuyuResponse: "Tawa nĩ wahorio.",
          englishResponse: "The light has been switched off.",
          topic: "thitho/light/living_room",
        });
      } else {
        if (lower.includes("thome")) {
          setPorchLight(true);
        } else {
          setMainLight(true);
        }
        setLastLog({
          action: "LIGHT_ON",
          gikuyuResponse: "Nĩ ndaria tawa. Ũtheri nĩ waingĩha.",
          englishResponse: "I have turned on the light. The room is now illuminated.",
          topic: "thitho/light/living_room",
        });
      }
    } else if (lower.includes("ũrugarĩ") || lower.includes("temperature")) {
      setLastLog({
        action: "TEMPERATURE_QUERY",
        gikuyuResponse: `Ũrugarĩ wa nyũmba rĩu nĩ ${temperature}. Heho ndĩrĩ thĩinĩ.`,
        englishResponse: `Current indoor temperature is ${temperature}. The room is comfortable.`,
        topic: "thitho/sensor/temperature",
      });
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Title */}
      <div className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Home className="w-6 h-6 text-amber-400" />
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Kĩhingo kĩa Mũciĩ (Smart Home Edge Node)
            </h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Offline voice & text IoT controller executing natural Gĩkũyũ commands locally for ESP32 and Zigbee nodes.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950/70 border border-amber-800/60 text-xs font-mono text-amber-300">
          <Radio className="w-4 h-4 text-amber-400" />
          <span>Local MQTT Broker: Connected</span>
        </div>
      </div>

      {/* Device Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Door Lock */}
        <div className="p-5 rounded-2xl border border-zinc-800 bg-[#0e140e] space-y-4 shadow">
          <div className="flex items-center justify-between">
            <div className={`p-3 rounded-xl border ${doorLocked ? "bg-emerald-950/60 border-emerald-700/60 text-emerald-400" : "bg-red-950/60 border-red-700/60 text-red-400"}`}>
              {doorLocked ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
            </div>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${doorLocked ? "bg-emerald-950 text-emerald-300 border-emerald-800" : "bg-red-950 text-red-300 border-red-800"}`}>
              {doorLocked ? "LOCKED" : "UNLOCKED"}
            </span>
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">Mũrango wa Nja</h3>
            <p className="text-xs text-zinc-400">Exterior Security Door</p>
          </div>
          <button
            onClick={() => {
              setDoorLocked(!doorLocked);
              handleCommand(doorLocked ? "Hingũra mũrango" : "Hinga mũrango");
            }}
            className="w-full py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 font-medium transition-colors"
          >
            {doorLocked ? "Unlock Door" : "Lock Door"}
          </button>
        </div>

        {/* Living Room Light */}
        <div className="p-5 rounded-2xl border border-zinc-800 bg-[#0e140e] space-y-4 shadow">
          <div className="flex items-center justify-between">
            <div className={`p-3 rounded-xl border ${mainLight ? "bg-amber-950/60 border-amber-600/60 text-amber-300" : "bg-zinc-900 border-zinc-800 text-zinc-500"}`}>
              <Lightbulb className="w-5 h-5" />
            </div>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${mainLight ? "bg-amber-950 text-amber-300 border-amber-800" : "bg-zinc-900 text-zinc-400 border-zinc-800"}`}>
              {mainLight ? "ON" : "OFF"}
            </span>
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">Tawa wa Nyũmba</h3>
            <p className="text-xs text-zinc-400">Living Room Light</p>
          </div>
          <button
            onClick={() => {
              setMainLight(!mainLight);
              handleCommand(mainLight ? "Horia tawa" : "Aria tawa");
            }}
            className="w-full py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 font-medium transition-colors"
          >
            {mainLight ? "Turn Off" : "Turn On"}
          </button>
        </div>

        {/* Porch Light */}
        <div className="p-5 rounded-2xl border border-zinc-800 bg-[#0e140e] space-y-4 shadow">
          <div className="flex items-center justify-between">
            <div className={`p-3 rounded-xl border ${porchLight ? "bg-amber-950/60 border-amber-600/60 text-amber-300" : "bg-zinc-900 border-zinc-800 text-zinc-500"}`}>
              <Lightbulb className="w-5 h-5" />
            </div>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${porchLight ? "bg-amber-950 text-amber-300 border-amber-800" : "bg-zinc-900 text-zinc-400 border-zinc-800"}`}>
              {porchLight ? "ON" : "OFF"}
            </span>
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">Tawa wa Thome</h3>
            <p className="text-xs text-zinc-400">Porch Entry Light</p>
          </div>
          <button
            onClick={() => {
              setPorchLight(!porchLight);
              handleCommand(porchLight ? "Horia tawa wa thome" : "Aria tawa wa thome");
            }}
            className="w-full py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 font-medium transition-colors"
          >
            {porchLight ? "Turn Off" : "Turn On"}
          </button>
        </div>

        {/* Thermostat */}
        <div className="p-5 rounded-2xl border border-zinc-800 bg-[#0e140e] space-y-4 shadow">
          <div className="flex items-center justify-between">
            <div className="p-3 rounded-xl border bg-blue-950/60 border-blue-700/60 text-blue-400">
              <Thermometer className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border bg-blue-950 text-blue-300 border-blue-800">
              ACTIVE
            </span>
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">{temperature}</h3>
            <p className="text-xs text-zinc-400">Ũrugarĩ wa Nyũmba</p>
          </div>
          <button
            onClick={() => handleCommand("Onania ũrugarĩ")}
            className="w-full py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 font-medium transition-colors"
          >
            Query Sensor
          </button>
        </div>
      </div>

      {/* Voice / Text Command Console */}
      <div className="rounded-2xl border border-zinc-800 bg-[#0e140e] p-6 space-y-5 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <h2 className="text-base font-bold text-white">Voice & Text Command Simulator (Gĩkũyũ)</h2>
          <span className="text-xs font-mono text-zinc-400">Edge NLU Parser</span>
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
            className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs flex items-center gap-2 shadow"
          >
            <Send className="w-3.5 h-3.5" />
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
              className="px-3 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-mono"
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
              <span className="text-xs font-mono text-zinc-500">MQTT: {lastLog.topic}</span>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-bold text-white">{lastLog.gikuyuResponse}</p>
              <p className="text-xs text-zinc-400">{lastLog.englishResponse}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
