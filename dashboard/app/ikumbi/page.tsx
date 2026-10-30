"use client";

import React, { useState, useEffect } from "react";
import { Database, Search, Volume2, CheckCircle2, RefreshCw, HardDrive, Cpu, Radio } from "lucide-react";
import { fetchDictionary, fetchParallelCorpus, fetchAudioCorpus } from "@/lib/api";
import { ThithoWord, ThithoParallelPair, ThithoAudioItem } from "@/lib/db";

export default function IkumbiPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"words" | "parallel" | "audio">("words");
  const [selectedDomain, setSelectedDomain] = useState<string>("all");

  const [words, setWords] = useState<ThithoWord[]>([]);
  const [parallel, setParallel] = useState<ThithoParallelPair[]>([]);
  const [audioItems, setAudioItems] = useState<ThithoAudioItem[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [dataSource, setDataSource] = useState<"live_bridge" | "indexeddb_offline">("indexeddb_offline");

  // Load live data with debounce
  useEffect(() => {
    let isCancelled = false;
    const timer = setTimeout(async () => {
      setIsLoading(true);
      if (activeTab === "words") {
        const res = await fetchDictionary(searchTerm);
        if (!isCancelled) {
          setWords(res.results);
          setDataSource(res.source);
        }
      } else if (activeTab === "parallel") {
        const res = await fetchParallelCorpus(selectedDomain, searchTerm);
        if (!isCancelled) {
          setParallel(res.results);
          setDataSource(res.source);
        }
      } else if (activeTab === "audio") {
        const res = await fetchAudioCorpus();
        if (!isCancelled) {
          setAudioItems(res.results);
          setDataSource(res.source);
        }
      }
      setIsLoading(false);
    }, 250);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [searchTerm, activeTab, selectedDomain]);

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
            Machine-readable Gĩkũyũ repository isolating dictionary definitions, parallel context, and audio mappings.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-[11px] font-mono">
            {dataSource === "live_bridge" ? (
              <>
                <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">Live SQLite FTS5</span>
              </>
            ) : (
              <>
                <HardDrive className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-amber-300 font-semibold">IndexedDB Cache</span>
              </>
            )}
          </div>

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
      </div>

      {/* Search Input Bar with Virtual Diacritics */}
      <div className="space-y-2">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Live search Gĩkũyũ lemmas (e.g. 'mũrĩmi', 'mbembe', 'kahua', 'tawa')..."
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

        {/* Diacritics insertion buttons */}
        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          <span className="text-[11px] font-mono text-zinc-500">Add Diacritic:</span>
          {["ĩ", "ũ", "Ĩ", "Ũ", "ng'"].map((char) => (
            <button
              key={char}
              onClick={() => setSearchTerm((prev) => prev + char)}
              className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-amber-300 font-mono text-xs font-bold border border-zinc-700"
            >
              {char}
            </button>
          ))}
          {isLoading && (
            <span className="ml-auto flex items-center gap-1 text-[11px] font-mono text-emerald-400">
              <RefreshCw className="w-3 h-3 animate-spin" /> Querying...
            </span>
          )}
        </div>
      </div>

      {/* Tab 1: Live Lexicon */}
      {activeTab === "words" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {words.length === 0 && !isLoading && (
            <div className="col-span-2 text-center py-12 text-zinc-500 text-sm font-mono border border-zinc-900 rounded-2xl bg-[#0a0f0a]">
              No lexicon entries found matching "{searchTerm}".
            </div>
          )}

          {words.map((w) => (
            <div
              key={w.lemma}
              className="p-4 rounded-xl border border-zinc-800 bg-[#0e140e] hover:border-zinc-700 transition-all space-y-2.5 shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white tracking-wide">{w.lemma}</h3>
                  {w.part_of_speech && (
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                      {w.part_of_speech}
                    </span>
                  )}
                  {w.noun_class && (
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/40">
                      {w.noun_class}
                    </span>
                  )}
                </div>
                {w.definitions && w.definitions[0] && (
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {w.definitions[0].source}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs text-zinc-400 font-mono">
                {w.phonetic && <span>Phonetic: /{w.phonetic}/</span>}
                {w.tonal_pattern && (
                  <>
                    <span>•</span>
                    <span className="text-amber-400">Tone: {w.tonal_pattern}</span>
                  </>
                )}
                {w.etymology && (
                  <>
                    <span>•</span>
                    <span className="text-zinc-500 truncate">{w.etymology}</span>
                  </>
                )}
              </div>

              <div className="space-y-1.5 pt-1">
                {w.definitions && w.definitions.map((d, dIdx) => (
                  <div key={dIdx} className="space-y-1">
                    <p className="text-sm text-zinc-200">
                      <span className="text-xs text-zinc-500 font-mono mr-1.5">{dIdx + 1}.</span>
                      {d.definition}
                    </p>
                    {d.example_gikuyu && (
                      <div className="text-xs bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800/60 space-y-0.5">
                        <p className="text-emerald-300 italic">{d.example_gikuyu}</p>
                        {d.example_english && <p className="text-zinc-400">{d.example_english}</p>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: Live Parallel Sentences */}
      {activeTab === "parallel" && (
        <div className="space-y-3">
          {parallel.length === 0 && !isLoading && (
            <div className="text-center py-12 text-zinc-500 text-sm font-mono border border-zinc-900 rounded-2xl bg-[#0a0f0a]">
              No parallel sentences found.
            </div>
          )}

          {parallel.map((p) => (
            <div
              key={p.id}
              className="p-4 rounded-xl border border-zinc-800 bg-[#0e140e] hover:border-zinc-700 transition-all space-y-2 shadow"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-amber-300 uppercase">
                  {p.domain}
                </span>
                <span className="text-[10px] font-mono text-zinc-500">{p.source}</span>
              </div>
              <p className="text-sm font-semibold text-emerald-300">{p.gikuyu_text}</p>
              <p className="text-xs text-zinc-300">{p.english_text}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: Live Common Voice Audio */}
      {activeTab === "audio" && (
        <div className="space-y-3">
          {audioItems.map((a) => (
            <div
              key={a.id}
              className="p-4 rounded-xl border border-zinc-800 bg-[#0e140e] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                  <p className="text-sm font-bold text-zinc-100">{a.text}</p>
                </div>
                <div className="flex items-center gap-3 text-xs text-zinc-400 font-mono">
                  <span>Speaker: {a.speaker_id || "spk_anon"}</span>
                  <span>•</span>
                  <span>Accent: {a.accent || "Central Gĩkũyũ"}</span>
                  {a.duration_sec && (
                    <>
                      <span>•</span>
                      <span>Duration: {a.duration_sec}s</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/50 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>{a.up_votes} Up-Votes</span>
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
