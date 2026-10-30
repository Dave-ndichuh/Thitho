"use client";

import React, { useState, useEffect } from "react";
import { Sprout, CloudRain, ShieldCheck, AlertCircle, Sparkles, RefreshCw, HardDrive, Cpu, Volume2 } from "lucide-react";
import { executeCropDiagnosis, fetchAgriculturalSeasons, AgriDiagnosisResponse, speakAloud } from "@/lib/api";

export default function AgriculturePage() {
  const [selectedCrop, setSelectedCrop] = useState("mbembe");
  const [symptomInput, setSymptomInput] = useState("mathangũ marĩa mahũndũkĩte");
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [seasons, setSeasons] = useState<any[]>([]);

  const [diagnosis, setDiagnosis] = useState<AgriDiagnosisResponse>({
    crop: "Mbembe (Maize)",
    diagnosis_gikuyu: "Mũrimũ wa mathangũ kũhũndũka (Nitrogen deficiency / Maize Chlorosis)",
    treatment_gikuyu: "Ĩkĩra ndoogo ya ng'ombe kana mbolea ya CAN thĩinĩ wa makinya ma centimita 10 kuuma mũtĩ-inĩ.",
    treatment_english: "Apply cattle manure or CAN nitrogen booster 10cm away from the stalk.",
    confidence: "94%",
    status: "DIAGNOSIS_MATCHED",
  });

  // Load live seasons on mount
  useEffect(() => {
    async function loadSeasons() {
      const data = await fetchAgriculturalSeasons();
      const list = Object.entries(data).map(([key, val]: [string, any]) => ({
        id: key,
        kik: val.name?.split("(")[0]?.trim() || key,
        eng: val.name?.includes("(") ? val.name.split("(")[1]?.replace(")", "") : "",
        crops: Array.isArray(val.crops) ? val.crops.join(", ") : val.crops || "",
        advice: val.advice_kik || "",
        active: key === "njahi",
      }));
      if (list.length > 0) {
        setSeasons(list);
      }
    }
    loadSeasons();
  }, []);

  const handleDiagnose = async () => {
    setIsDiagnosing(true);
    try {
      const res = await executeCropDiagnosis(selectedCrop, symptomInput);
      setDiagnosis(res);
    } finally {
      setIsDiagnosing(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Title */}
      <div className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sprout className="w-6 h-6 text-emerald-400" />
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Ũrĩmĩ na Ũgo (Agricultural Edge Advisory)
            </h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Offline crop health diagnostic and seasonal agronomy assistant for smallholder farmers in Central Kenya.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950 border border-emerald-800/60 text-xs font-mono text-emerald-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Local Farm Node: Active</span>
        </div>
      </div>

      {/* Farming Calendar Section */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
          <CloudRain className="w-4 h-4 text-blue-400" />
          <span>Traditional Gĩkũyũ Agricultural Seasons</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {seasons.map((s) => (
            <div
              key={s.id}
              className={`p-5 rounded-2xl border transition-all space-y-2.5 shadow ${
                s.active
                  ? "bg-emerald-950/30 border-emerald-600/60 shadow-emerald-950/20"
                  : "bg-[#0e140e] border-zinc-800"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">{s.kik}</span>
                {s.active && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-900 text-emerald-300">
                    Current Season
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 font-mono">{s.eng}</p>
              <div className="text-xs text-zinc-300 bg-zinc-900/60 p-2 rounded-lg">
                <span className="font-semibold text-amber-300">Crops: </span>
                <span>{s.crops}</span>
              </div>
              <p className="text-xs text-emerald-400/90 italic pt-1">"{s.advice}"</p>
            </div>
          ))}
        </div>
      </div>

      {/* Crop Disease Diagnosis Assistant */}
      <div className="rounded-2xl border border-zinc-800 bg-[#0e140e] p-6 space-y-5 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-white">Live Crop Health Diagnostic Node</h2>
          </div>
          <span className="text-xs px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 font-mono border border-zinc-800">
            FastAPI Edge Bridge / IndexedDB
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Select Crop (Mũmera)
              </label>
              <select
                value={selectedCrop}
                onChange={(e) => setSelectedCrop(e.target.value)}
                className="w-full bg-[#131c13] border border-zinc-700/60 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500 font-medium"
              >
                <option value="mbembe">Mbembe (Maize / Corn)</option>
                <option value="kahua">Kahua (Coffee)</option>
                <option value="macani">Macani (Tea)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Symptoms Description (Gĩkũyũ kana Gĩthũngũ)
              </label>
              <textarea
                value={symptomInput}
                onChange={(e) => setSymptomInput(e.target.value)}
                placeholder="Taũra ũrĩa mathangũ kana matunda matarĩĩ (e.g., 'mathangũ mahũndũkĩte', 'mũtwe mũirũ')..."
                className="w-full h-24 bg-[#131c13] border border-zinc-700/60 rounded-xl p-3 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500 resize-none font-medium"
              />
            </div>

            <button
              onClick={handleDiagnose}
              disabled={isDiagnosing}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow"
            >
              {isDiagnosing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
                  <span>Evaluating Telemetry...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Diagnose Condition (Thuthuria)</span>
                </>
              )}
            </button>
          </div>

          {/* Diagnostic Result */}
          <div className="p-4 rounded-xl border border-zinc-800 bg-[#0a0f0a] space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase text-zinc-400">Diagnosis Output</span>
                <span className="text-xs font-mono text-emerald-400">Confidence: {diagnosis.confidence}</span>
              </div>

              <h3 className="text-base font-bold text-white">{diagnosis.diagnosis_gikuyu}</h3>

              <div className="space-y-2 pt-2">
                <div className="p-3 rounded-lg bg-zinc-900/80 border border-zinc-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-amber-400 uppercase font-semibold">
                      Treatment in Gĩkũyũ:
                    </span>
                    <button
                      onClick={() => speakAloud(diagnosis.treatment_gikuyu, "gikuyu")}
                      className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-emerald-300 text-[11px] flex items-center gap-1 transition"
                      title="Listen aloud to Gĩkũyũ advice"
                    >
                      <Volume2 className="w-3 h-3" />
                      <span>Listen (Mũgambo)</span>
                    </button>
                  </div>
                  <p className="text-xs text-zinc-200">{diagnosis.treatment_gikuyu}</p>
                </div>

                <div className="p-3 rounded-lg bg-zinc-900/40 border border-zinc-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-zinc-400 uppercase font-semibold">
                      English Guidance:
                    </span>
                    <button
                      onClick={() => speakAloud(diagnosis.treatment_english, "english")}
                      className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] flex items-center gap-1 transition"
                      title="Listen aloud to English guidance"
                    >
                      <Volume2 className="w-3 h-3" />
                      <span>Listen</span>
                    </button>
                  </div>
                  <p className="text-xs text-zinc-400">{diagnosis.treatment_english}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-zinc-900 pt-2 text-[10px] text-zinc-500 font-mono">
              <span>Status: {diagnosis.status}</span>
              <span>Computed locally on edge hardware</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
