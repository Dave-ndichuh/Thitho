"use client";

import React, { useState } from "react";
import { Database, Search, Volume2, BookOpen, Layers, CheckCircle2, Filter } from "lucide-react";

export default function IkumbiPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"words" | "parallel" | "audio">("words");
  const [selectedDomain, setSelectedDomain] = useState<string>("all");

  const sampleWords = [
    {
      lemma: "mũrĩmi",
      pos: "noun",
      class: "Class 1",
      phonetic: "/mo-ree-me/",
      tone: "L-H-L",
      source: "UKC Lexicon",
      def: "Farmer; cultivator of agricultural land and produce.",
      exKik: "Mũrĩmi nĩ ahandaga mbembe rĩrĩa mbura yagia.",
      exEng: "The farmer plants maize when the rain comes.",
    },
    {
      lemma: "mũgũnda",
      pos: "noun",
      class: "Class 3",
      phonetic: "/mo-goon-dah/",
      tone: "L-L-H",
      source: "UKC Lexicon",
      def: "Farm, agricultural plot, piece of cultivated land.",
      exKik: "Mũgũnda ũyũ nĩ wa kahua na macani.",
      exEng: "This farm is for coffee and tea.",
    },
    {
      lemma: "mbembe",
      pos: "noun",
      class: "Class 9/10",
      phonetic: "/m-beh-mbeh/",
      tone: "H-L",
      source: "UKC Lexicon",
      def: "Maize; corn cob or grain.",
      exKik: "Mbembe nĩ ciahehuo nĩ kĩũra.",
      exEng: "The maize has withered due to drought.",
    },
    {
      lemma: "kahua",
      pos: "noun",
      class: "Class 12",
      phonetic: "/kah-hoo-ah/",
      tone: "L-H-L",
      source: "Wiktionary",
      def: "Coffee; the plant, berry, or brewed beverage.",
      exKik: "Aria kahua nĩ marona ũtonga mũingĩ.",
      exEng: "Coffee farmers are gaining great wealth.",
    },
    {
      lemma: "mũrango",
      pos: "noun",
      class: "Class 3",
      phonetic: "/mo-rah-ngoh/",
      tone: "L-L-H",
      source: "UKC Lexicon",
      def: "Doorway, doorway closure, gate.",
      exKik: "Hinga mũrango nĩgũo ũrugarĩ ũtikehere.",
      exEng: "Close the door so the warmth does not escape.",
    },
    {
      lemma: "tawa",
      pos: "noun",
      class: "Class 9/10",
      phonetic: "/tah-wah/",
      tone: "L-H",
      source: "Wiktionary",
      def: "Lamp, lantern, light bulb, electric lighting.",
      exKik: "Aria tawa nĩkĩo twone ũtheri thĩinĩ wa nyũmba.",
      exEng: "Turn on the light so that we may see brightness inside the house.",
    },
    {
      lemma: "thitho",
      pos: "noun",
      class: "Class 9/10",
      phonetic: "/thee-thoh/",
      tone: "H-L",
      source: "Benson Dictionary",
      def: "A secret, deep core knowledge, profound hidden mystery.",
      exKik: "Thitho wa ũrĩmi mwega nĩ kũmenya mahinda ma mbura.",
      exEng: "The secret to great farming is knowing the rainfall seasons.",
    },
  ];

  const sampleParallel = [
    {
      gik: "Kũhanda mbembe na thukũma rĩrĩa mbura ya mbere yuura nĩ kũrehaga magetha mega.",
      eng: "Planting maize and collard greens when the first rain falls yields a good harvest.",
      domain: "agriculture",
      source: "Masakhane-Corpus",
    },
    {
      gik: "Mũgũnda ũyũ ũrabatara thĩi ya mũrĩmi kũmenya ũrĩa tĩĩri ũtariĩ.",
      eng: "This farm requires soil testing to assess the ground fertility.",
      domain: "agriculture",
      source: "Masakhane-Corpus",
    },
    {
      gik: "Hinga mũrango wa nja na ũrie matawa mothe.",
      eng: "Lock the exterior door and switch on all the lights.",
      domain: "smarthome",
      source: "Thitho-Direct",
    },
    {
      gik: "Mũtambo ũyũ ũrathingata ũhoro ũtekũhũthĩra rĩera rĩa thitima.",
      eng: "This offline edge server processes data locally without requiring internet connectivity.",
      domain: "technology",
      source: "Thitho-Direct",
    },
    {
      gik: "Mũndũ ũtataraga ndarĩ thĩina.",
      eng: "A person who is content with what they have suffers no sorrow.",
      domain: "proverbs",
      source: "Benson_Thimo",
    },
  ];

  const sampleAudio = [
    {
      text: "Mũrĩmi nĩ ahandaga mbembe rĩrĩa mbura yagia.",
      speaker: "spk_nyeri_01",
      accent: "Nyeri Gĩkũyũ",
      votes: 4,
      dur: "3.42s",
      tonal: true,
    },
    {
      text: "Hinga mũrango nĩgũo ũrugarĩ ũtikehere.",
      speaker: "spk_kiambu_02",
      accent: "Kiambu Gĩkũyũ",
      votes: 3,
      dur: "2.85s",
      tonal: true,
    },
    {
      text: "Aria tawa nĩkĩo twone ũtheri thĩinĩ wa nyũmba.",
      speaker: "spk_muranga_03",
      accent: "Murang'a Gĩkũyũ",
      votes: 5,
      dur: "3.10s",
      tonal: true,
    },
  ];

  const filteredWords = sampleWords.filter(
    (w) =>
      w.lemma.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.def.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredParallel = sampleParallel.filter((p) => {
    const matchSearch =
      p.gik.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.eng.toLowerCase().includes(searchTerm.toLowerCase());
    const matchDomain = selectedDomain === "all" || p.domain === selectedDomain;
    return matchSearch && matchDomain;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-400" />
            <h1 className="text-2xl font-bold text-white tracking-tight">Thitho Ikũmbi (The Granary)</h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Machine-readable Gĩkũyũ repository isolating dictionary definitions, sentence context, and audio mappings.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex bg-zinc-900 border border-zinc-800 rounded-xl p-1 gap-1 text-xs font-medium">
          <button
            onClick={() => setActiveTab("words")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === "words"
                ? "bg-emerald-600 text-white font-bold shadow"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Lexicon (Ciugo)
          </button>
          <button
            onClick={() => setActiveTab("parallel")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === "parallel"
                ? "bg-emerald-600 text-white font-bold shadow"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Parallel Corpus
          </button>
          <button
            onClick={() => setActiveTab("audio")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === "audio"
                ? "bg-emerald-600 text-white font-bold shadow"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Common Voice Audio
          </button>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search dictionary lemmas, English glosses, or parallel phrases..."
            className="w-full bg-[#111711] border border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {activeTab === "parallel" && (
          <select
            value={selectedDomain}
            onChange={(e) => setSelectedDomain(e.target.value)}
            className="bg-[#111711] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-emerald-500 font-mono"
          >
            <option value="all">All Domains</option>
            <option value="agriculture">Agriculture (Ũrĩmĩ)</option>
            <option value="smarthome">Smart Home (Mũciĩ)</option>
            <option value="technology">Technology (Mĩtambo)</option>
            <option value="proverbs">Proverbs (Thimo)</option>
          </select>
        )}
      </div>

      {/* Tab 1: Lexicon */}
      {activeTab === "words" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredWords.map((w) => (
            <div
              key={w.lemma}
              className="p-4 rounded-xl border border-zinc-800 bg-[#0e140e] hover:border-zinc-700 transition-all space-y-2.5 shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white tracking-wide">{w.lemma}</h3>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                    {w.pos}
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/40">
                    {w.class}
                  </span>
                </div>
                <span className="text-[10px] text-zinc-500 font-mono">{w.source}</span>
              </div>

              <div className="flex items-center gap-3 text-xs text-zinc-400 font-mono">
                <span>Phonetic: {w.phonetic}</span>
                <span>•</span>
                <span className="text-amber-400">Tone: {w.tone}</span>
              </div>

              <p className="text-sm text-zinc-200">{w.def}</p>

              {w.exKik && (
                <div className="text-xs bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800/60 space-y-1">
                  <p className="text-emerald-300 italic">{w.exKik}</p>
                  <p className="text-zinc-400">{w.exEng}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: Parallel Sentences */}
      {activeTab === "parallel" && (
        <div className="space-y-3">
          {filteredParallel.map((p, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl border border-zinc-800 bg-[#0e140e] hover:border-zinc-700 transition-all space-y-2 shadow"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-amber-300 uppercase">
                  {p.domain}
                </span>
                <span className="text-[10px] font-mono text-zinc-500">{p.source}</span>
              </div>
              <p className="text-sm font-semibold text-emerald-300">{p.gik}</p>
              <p className="text-xs text-zinc-300">{p.eng}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: Common Voice Audio */}
      {activeTab === "audio" && (
        <div className="space-y-3">
          {sampleAudio.map((a, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl border border-zinc-800 bg-[#0e140e] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                  <p className="text-sm font-bold text-zinc-100">{a.text}</p>
                </div>
                <div className="flex items-center gap-3 text-xs text-zinc-400 font-mono">
                  <span>Speaker: {a.speaker}</span>
                  <span>•</span>
                  <span>Accent: {a.accent}</span>
                  <span>•</span>
                  <span>Duration: {a.dur}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/50 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>{a.votes} Up-Votes</span>
                </span>
                <button
                  onClick={() => alert(`Simulating playback for: ${a.text}`)}
                  className="px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-white font-medium flex items-center gap-1"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Play</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
