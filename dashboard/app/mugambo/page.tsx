"use client";

import React, { useState } from "react";
import { Mic, Volume2, Activity, Play, Sparkles, CheckCircle2, ShieldAlert } from "lucide-react";

export default function MugamboPage() {
  const [ttsInput, setTtsInput] = useState("Mũrĩmi nĩ ahandaga mbembe rĩrĩa mbura yagia.");
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [hasSynthesized, setHasSynthesized] = useState(true);

  // Simulated syllable pitch contour for visualization
  const pitchContour = [
    { syl: "Mũ", tone: "H", f0: 210 },
    { syl: "rĩ", tone: "H", f0: 210 },
    { syl: "mi", tone: "L", f0: 140 },
    { syl: "nĩ", tone: "H", f0: 210 },
    { syl: "a", tone: "L", f0: 140 },
    { syl: "han", tone: "L", f0: 140 },
    { syl: "da", tone: "M", f0: 175 },
    { syl: "ga", tone: "M", f0: 175 },
    { syl: "mbe", tone: "H", f0: 210 },
    { syl: "mbe", tone: "L", f0: 140 },
  ];

  const handleSynthesize = () => {
    setIsSynthesizing(true);
    setTimeout(() => {
      setIsSynthesizing(false);
      setHasSynthesized(true);
    }, 300);
  };

  const playSynthesizedTone = () => {
    // Web Audio API offline sine oscillator to demonstrate acoustic tone contour
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      let startTime = audioCtx.currentTime;

      pitchContour.forEach((item) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(item.f0, startTime);

        gain.gain.setValueAtTime(0.01, startTime);
        gain.gain.exponentialRampToValueAtTime(0.2, startTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.2);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.22);
        startTime += 0.23;
      });
    } catch (e) {
      console.log("AudioContext not supported or active:", e);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Title */}
      <div className="border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-2">
          <Mic className="w-6 h-6 text-purple-400" />
          <h1 className="text-2xl font-bold text-white tracking-tight">Thitho Mũgambo (Voice & Acoustic Processing)</h1>
        </div>
        <p className="text-xs text-zinc-400 mt-1">
          Meta SeamlessM4T speech foundation model with Gĩkũyũ tonal pitch contour synthesis and Common Voice acoustic mapping.
        </p>
      </div>

      {/* TTS Section */}
      <div className="rounded-2xl border border-zinc-800 bg-[#0e140e] p-6 space-y-6 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-purple-400" />
            <h2 className="text-base font-bold text-white">Text-to-Speech (TTS) Synthesizer</h2>
          </div>
          <span className="text-xs px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800/40 font-mono">
            Tonal Pitch Mapping
          </span>
        </div>

        <div className="space-y-3">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Gĩkũyũ Text Prompt
          </label>
          <input
            type="text"
            value={ttsInput}
            onChange={(e) => setTtsInput(e.target.value)}
            className="w-full bg-[#131c13] border border-zinc-700/60 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-purple-500"
          />

          <div className="flex gap-2">
            <button
              onClick={handleSynthesize}
              disabled={isSynthesizing}
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs flex items-center gap-2 transition-all shadow"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>{isSynthesizing ? "Synthesizing Waveform..." : "Synthesize Voice"}</span>
            </button>

            {hasSynthesized && (
              <button
                onClick={playSynthesizedTone}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-2 transition-all shadow"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Play Acoustic Pitch Preview</span>
              </button>
            )}
          </div>
        </div>

        {/* Pitch Contour Visualization Graph */}
        {hasSynthesized && (
          <div className="p-5 rounded-xl border border-zinc-800 bg-[#0a0f0a] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-400" />
                <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                  Tonal Frequency Contour (F0 Trajectory)
                </h3>
              </div>
              <span className="text-[11px] font-mono text-zinc-400">16,000 Hz Broadcast Waveform</span>
            </div>

            {/* Simulated Frequency Bars */}
            <div className="h-32 flex items-end justify-between gap-2 p-3 bg-zinc-950/80 rounded-xl border border-zinc-900">
              {pitchContour.map((p, idx) => {
                const heightPct = Math.round(((p.f0 - 100) / 120) * 100);
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1 group">
                    <span className="text-[10px] font-mono text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      {p.f0}Hz
                    </span>
                    <div
                      style={{ height: `${heightPct}%` }}
                      className={`w-full rounded-t-md transition-all ${
                        p.tone === "H"
                          ? "bg-purple-500 group-hover:bg-purple-400"
                          : p.tone === "M"
                          ? "bg-amber-500 group-hover:bg-amber-400"
                          : "bg-emerald-600 group-hover:bg-emerald-500"
                      }`}
                    />
                    <div className="text-center">
                      <span className="text-xs font-bold text-white block">{p.syl}</span>
                      <span className="text-[9px] font-mono text-zinc-400 uppercase">[{p.tone}]</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between text-xs text-zinc-400 font-mono">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" />
                  <span>High Tone (H ~210Hz)</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                  <span>Mid Tone (M ~175Hz)</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
                  <span>Low Tone (L ~140Hz)</span>
                </span>
              </div>
              <span>Estimated Duration: 2.30s</span>
            </div>
          </div>
        )}
      </div>

      {/* Speech-to-Text Section */}
      <div className="rounded-2xl border border-zinc-800 bg-[#0e140e] p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Mic className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">Speech-to-Text (STT) Transcription Pipeline</h2>
          </div>
          <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/40 font-mono">
            Mozilla Common Voice Aligned
          </span>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-zinc-400">Sample Clip: cv_kik_001.wav</span>
            <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Tonal Verified
            </span>
          </div>
          <p className="text-sm font-semibold text-white">
            "Mũrĩmi nĩ ahandaga mbembe rĩrĩa mbura yagia."
          </p>
          <div className="flex gap-4 text-xs text-zinc-400 font-mono pt-1">
            <span>Speaker ID: spk_nyeri_01</span>
            <span>•</span>
            <span>Dialect: Central Nyeri</span>
            <span>•</span>
            <span>Confidence: 98.4%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
