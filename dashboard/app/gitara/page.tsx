"use client";

import React, { useState } from "react";
import { Package, Terminal, Copy, Check, Download, Layers, ShieldCheck, Box } from "lucide-react";

export default function GitaraPage() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const packages = [
    {
      name: "dict/core",
      version: "1.0.0",
      category: "dictionary",
      size: "420 KB",
      desc: "Foundational Gĩkũyũ lexicon with UKC synsets, Benson entries, tonal markers, and SQLite schema.",
      command: "thitho install dict/core",
      files: ["thitho_ikumbi.db", "normalizer.py", "schema.sql"],
    },
    {
      name: "dict/agri",
      version: "1.1.0",
      category: "dictionary",
      size: "180 KB",
      desc: "Specialized agricultural lexicon: crop varieties, pests, coffee/tea diseases, soil types, and seasons.",
      command: "thitho install dict/agri",
      files: ["agri_lexicon.json", "seasons.json"],
    },
    {
      name: "model/lora-agri",
      version: "0.9.0",
      category: "model",
      size: "48 MB",
      desc: "Fine-tuned LoRA adapter weights for Mistral-7B / Llama-3 covering agricultural diagnostic QA.",
      command: "thitho install model/lora-agri",
      files: ["adapter_config.json", "adapter_model.bin"],
    },
    {
      name: "model/lora-smarthome",
      version: "0.8.5",
      category: "model",
      size: "32 MB",
      desc: "Low-Rank Adaptation weights for offline Gĩkũyũ voice and IoT home command parsing.",
      command: "thitho install model/lora-smarthome",
      files: ["adapter_config.json", "adapter_model.bin"],
    },
    {
      name: "ui/components",
      version: "1.0.0",
      category: "ui",
      size: "85 KB",
      desc: "Localized React/Next.js UI components with Tailwind CSS & Gĩkũyũ language support.",
      command: "thitho install ui/components",
      files: ["GikuyuDictionarySearch.tsx", "VoiceWaveformVisualizer.tsx", "AgriculturalAdvisoryCard.tsx"],
    },
  ];

  const copyCommand = (cmd: string, idx: number) => {
    navigator.clipboard.writeText(cmd);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Title */}
      <div className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Package className="w-6 h-6 text-rose-400" />
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Thitho Gĩtara (Package Manager & Registry)
            </h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Rust-powered offline package manager for distributing Gĩkũyũ dictionaries, LoRA weights, and Next.js components.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-rose-950/70 border border-rose-800/60 text-xs font-mono text-rose-300">
          <Terminal className="w-4 h-4 text-rose-400" />
          <span>CLI: gitara.exe v1.0.0</span>
        </div>
      </div>

      {/* Developer CLI Quickstart Guide */}
      <div className="p-6 rounded-2xl border border-zinc-800 bg-[#0e140e] space-y-4 shadow-xl">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span>Quickstart in Your Terminal</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
          <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-900 space-y-1">
            <span className="text-zinc-500 block"># 1. Initialize project</span>
            <span className="text-emerald-400">thitho init my-agri-app</span>
          </div>

          <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-900 space-y-1">
            <span className="text-zinc-500 block"># 2. Install dictionary & weights</span>
            <span className="text-emerald-400">thitho install model/lora-agri</span>
          </div>

          <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-900 space-y-1">
            <span className="text-zinc-500 block"># 3. Offline CLI lookup</span>
            <span className="text-emerald-400">thitho dict murimi</span>
          </div>
        </div>
      </div>

      {/* Registry Packages Catalog */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white">Registered Modules</h2>
          <span className="text-xs font-mono text-zinc-400">5 Available Offline</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {packages.map((pkg, idx) => (
            <div
              key={pkg.name}
              className="p-5 rounded-2xl border border-zinc-800 bg-[#0e140e] hover:border-zinc-700 transition-all space-y-3 flex flex-col justify-between shadow"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-white flex items-center gap-2">
                    <Box className="w-4 h-4 text-rose-400" />
                    <span>{pkg.name}</span>
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                    v{pkg.version}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-zinc-400 font-mono">
                  <span>Category: {pkg.category}</span>
                  <span>•</span>
                  <span>Size: {pkg.size}</span>
                </div>

                <p className="text-xs text-zinc-300 leading-relaxed">{pkg.desc}</p>

                {/* Included Files */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {pkg.files.map((f) => (
                    <span
                      key={f}
                      className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800/80"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>

              {/* Install Command */}
              <div className="pt-2">
                <div className="flex items-center justify-between bg-zinc-950 p-2 px-3 rounded-xl border border-zinc-900 text-xs font-mono">
                  <span className="text-emerald-400 truncate">{pkg.command}</span>
                  <button
                    onClick={() => copyCommand(pkg.command, idx)}
                    className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
                    title="Copy command"
                  >
                    {copiedIndex === idx ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
