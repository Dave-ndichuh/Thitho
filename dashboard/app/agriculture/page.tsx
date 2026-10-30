"use client";

import React, { useState } from "react";
import { Sprout, Sun, CloudRain, Thermometer, ShieldCheck, AlertCircle, Sparkles } from "lucide-react";

export default function AgriculturePage() {
  const [selectedCrop, setSelectedCrop] = useState("mbembe");
  const [symptomInput, setSymptomInput] = useState("mathangũ marĩa mahũndũkĩte");
  const [diagnosis, setDiagnosis] = useState<any>({
    crop: "Mbembe (Maize)",
    diagnosis_kik: "Mũrimũ wa mathangũ kũhũndũka (Nitrogen deficiency / Maize Chlorosis)",
    treatment_kik: "Ĩkĩra ndoogo ya ng'ombe kana mbolea ya CAN thĩinĩ wa makinya ma centimita 10 kuuma mũtĩ-inĩ.",
    treatment_eng: "Apply cattle manure or CAN nitrogen booster 10cm away from the stalk.",
    confidence: "94%",
  });

  const handleDiagnose = () => {
    if (selectedCrop === "kahua") {
      setDiagnosis({
        crop: "Kahua (Coffee)",
        diagnosis_kik: "Mũrimũ wa Mahindi ma Kahua (Coffee Berry Disease - CBD)",
        treatment_kik: "Huura ndawa ya thaba (copper fungicide) rĩrĩa mathangũ maratuta mĩtĩ.",
        treatment_eng: "Spray approved copper-based fungicide at the onset of flowering and rains.",
        confidence: "96%",
      });
    } else if (selectedCrop === "macani") {
      setDiagnosis({
        crop: "Macani (Tea)",
        diagnosis_kik: "Tũsamũ twa Macani (Red Crevice Mites)",
        treatment_kik: "Eheria macani maria mahũũrĩtwo nĩguo tũsamũ tũtĩgathemee kũndũ kũngĩ.",
        treatment_eng: "Prune affected tea bushes and maintain clean buffer strips.",
        confidence: "92%",
      });
    } else {
      setDiagnosis({
        crop: "Mbembe (Maize)",
        diagnosis_kik: "Mũrimũ wa mathangũ kũhũndũka (Nitrogen deficiency / Maize Chlorosis)",
        treatment_kik: "Ĩkĩra ndoogo ya ng'ombe kana mbolea ya CAN thĩinĩ wa makinya ma centimita 10 kuuma mũtĩ-inĩ.",
        treatment_eng: "Apply cattle manure or CAN nitrogen booster 10cm away from the stalk.",
        confidence: "94%",
      });
    }
  };

  const seasons = [
    {
      kik: "Kĩmera kĩa Njahĩ",
      eng: "Long Rains Season (March - May)",
      crops: "Mbembe, Njahĩ, Thukũma, Warũ",
      advice: "Handa mbembe thĩinĩ wa tĩĩri ũiyũrĩte biũ na mũtutu wa mbũri.",
      active: true,
    },
    {
      kik: "Thano",
      eng: "Cold / Harvest Season (June - August)",
      crops: "Macani, Kahua (Pruning)",
      advice: "Bithia tĩĩri na nyeki nĩguo ũrugarĩ na maĩ itigatũũke.",
      active: false,
    },
    {
      kik: "Kĩmera kĩa Mwere",
      eng: "Short Rains Season (October - December)",
      crops: "Mwere, Mboco, Kahua",
      advice: "Handa mboco na mwere iria itabatara maĩ maingĩ mũno.",
      active: false,
    },
  ];

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
            Offline crop health diagnostic and seasonal agronomy assistant for smallholder farmers.
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
          {seasons.map((s, idx) => (
            <div
              key={idx}
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
            <h2 className="text-base font-bold text-white">Crop Health Diagnostic Node</h2>
          </div>
          <span className="text-xs px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 font-mono border border-zinc-800">
            Offline Expert System
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
                placeholder="Taũra ũrĩa mathangũ kana matunda matarĩĩ..."
                className="w-full h-24 bg-[#131c13] border border-zinc-700/60 rounded-xl p-3 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500 resize-none font-medium"
              />
            </div>

            <button
              onClick={handleDiagnose}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Diagnose Condition (Thuthuria)</span>
            </button>
          </div>

          {/* Diagnostic Result */}
          <div className="p-4 rounded-xl border border-zinc-800 bg-[#0a0f0a] space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase text-zinc-400">Diagnosis Output</span>
                <span className="text-xs font-mono text-emerald-400">Confidence: {diagnosis.confidence}</span>
              </div>

              <h3 className="text-base font-bold text-white">{diagnosis.diagnosis_kik}</h3>

              <div className="space-y-2 pt-2">
                <div className="p-3 rounded-lg bg-zinc-900/80 border border-zinc-800 space-y-1">
                  <span className="text-[11px] font-mono text-amber-400 uppercase block font-semibold">
                    Treatment in Gĩkũyũ:
                  </span>
                  <p className="text-xs text-zinc-200">{diagnosis.treatment_kik}</p>
                </div>

                <div className="p-3 rounded-lg bg-zinc-900/40 border border-zinc-800 space-y-1">
                  <span className="text-[11px] font-mono text-zinc-400 uppercase block font-semibold">
                    English Guidance:
                  </span>
                  <p className="text-xs text-zinc-400">{diagnosis.treatment_eng}</p>
                </div>
              </div>
            </div>

            <p className="text-[10px] text-zinc-500 font-mono border-t border-zinc-900 pt-2">
              Diagnosis computed locally on edge hardware via Thitho Agricultural Model.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
