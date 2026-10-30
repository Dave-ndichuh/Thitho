"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Activity,
  Play,
  Pause,
  Sparkles,
  CheckCircle2,
  ShieldAlert,
  Radio,
  FileAudio,
  Clock,
  User,
  Layers,
  RefreshCw,
  Sliders,
  Database,
  ArrowRight,
} from "lucide-react";
import {
  executeTTS,
  executeSTT,
  fetchAudioCorpus,
  getAudioClipUrl,
  TTSResponse,
  STTResponse,
  SyllablePitch,
} from "@/lib/api";
import { ThithoAudioItem } from "@/lib/db";
import { syncEngine, ConnectionState } from "@/lib/sync";

const PRESET_PHRASES = [
  {
    label: "Farming (Mbembe)",
    text: "Mũrĩmi nĩ ahandaga mbembe rĩrĩa mbura yagia.",
  },
  {
    label: "Homestead (Mũciĩ)",
    text: "Mũciĩ nĩ ũhoro wa mũno kũrĩ andũ aitũ.",
  },
  {
    label: "Smart Home (Mũrango)",
    text: "Hinga mũrango wa nja nĩgũo ũrugarĩ ũtikehere.",
  },
  {
    label: "Seasonality (Mahinda)",
    text: "Thitho wa ũrĩmi mwega nĩ kũmenya mahinda ma mbura.",
  },
  {
    label: "Tree of Life (Mũtĩ)",
    text: "Mũtĩ ũrĩa ũkũrĩte wega nĩ ũciaraga matunda.",
  },
];

export default function MugamboPage() {
  // Connection state
  const [connectionStatus, setConnectionStatus] = useState<ConnectionState>("disconnected");

  // TTS State
  const [ttsInput, setTtsInput] = useState("Mũrĩmi nĩ ahandaga mbembe rĩrĩa mbura yagia.");
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [ttsResult, setTtsResult] = useState<TTSResponse | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);

  // Common Voice & STT State
  const [activeTab, setActiveTab] = useState<"common_voice" | "mic_record">("common_voice");
  const [audioList, setAudioList] = useState<ThithoAudioItem[]>([]);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [selectedClip, setSelectedClip] = useState<ThithoAudioItem | null>(null);
  const [sttResult, setSttResult] = useState<STTResponse | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);

  // Microphone Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [recordedBase64, setRecordedBase64] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Audio elements & Canvas Refs
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const clipAudioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Monitor connection status
  useEffect(() => {
    setConnectionStatus(syncEngine.getStatus());
    const handleStatus = (e: any) => setConnectionStatus(e.detail.status);
    syncEngine.addEventListener("statusChange", handleStatus);
    return () => syncEngine.removeEventListener("statusChange", handleStatus);
  }, []);

  // Initial load: Fetch audio dataset and run default synthesis
  useEffect(() => {
    loadAudioDataset();
    handleSynthesize(ttsInput);
  }, []);

  const loadAudioDataset = async () => {
    setIsLoadingAudio(true);
    try {
      const res = await fetchAudioCorpus();
      setAudioList(res.results);
      if (res.results.length > 0 && !selectedClip) {
        setSelectedClip(res.results[0]);
      }
    } catch (e) {
      console.error("Failed to load audio corpus:", e);
    } finally {
      setIsLoadingAudio(false);
    }
  };

  // TTS Synthesis Trigger
  const handleSynthesize = async (textToSynth?: string) => {
    const text = (textToSynth || ttsInput).trim();
    if (!text) return;
    setIsSynthesizing(true);
    try {
      const res = await executeTTS(text);
      setTtsResult(res);

      if (res.audio_base64) {
        setAudioUrl(`data:audio/wav;base64,${res.audio_base64}`);
      } else {
        setAudioUrl(null);
      }
    } catch (err) {
      console.error("TTS synthesis error:", err);
    } finally {
      setIsSynthesizing(false);
    }
  };

  // Draw Pitch Contour Canvas
  useEffect(() => {
    if (!ttsResult || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const syllables = ttsResult.syllables;
    if (syllables.length === 0) return;

    // Draw background grid lines for tones
    const toneLevels = [
      { label: "High (210 Hz)", f0: 210, color: "rgba(168, 85, 247, 0.25)" },
      { label: "Mid (175 Hz)", f0: 175, color: "rgba(245, 158, 11, 0.25)" },
      { label: "Low (140 Hz)", f0: 140, color: "rgba(16, 185, 129, 0.25)" },
    ];

    const minF0 = 110;
    const maxF0 = 230;
    const getY = (f0: number) => height - 30 - ((f0 - minF0) / (maxF0 - minF0)) * (height - 60);

    toneLevels.forEach((level) => {
      const y = getY(level.f0);
      ctx.beginPath();
      ctx.strokeStyle = level.color;
      ctx.setLineDash([4, 4]);
      ctx.moveTo(40, y);
      ctx.lineTo(width - 20, y);
      ctx.stroke();

      ctx.fillStyle = level.color.replace("0.25", "0.8");
      ctx.font = "9px monospace";
      ctx.setLineDash([]);
      ctx.fillText(level.label, 8, y + 3);
    });

    // Draw F0 Smooth Bezier Trajectory
    const step = (width - 70) / Math.max(1, syllables.length - 1);
    const points = syllables.map((s, idx) => ({
      x: 55 + idx * step,
      y: getY(s.target_f0),
      syllable: s.syllable,
      tone: s.tone,
      f0: s.target_f0,
    }));

    // Curve line
    ctx.beginPath();
    ctx.strokeStyle = "#a855f7";
    ctx.lineWidth = 3;
    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 0; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }
    if (points.length > 1) {
      ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    }
    ctx.stroke();

    // Draw points & Syllable labels
    points.forEach((p) => {
      // Glow circle
      ctx.beginPath();
      ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = p.tone === "H" ? "#c084fc" : p.tone === "M" ? "#f59e0b" : "#10b981";
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Syllable text below
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(p.syllable, p.x, height - 10);
    });

    // Playback tracker indicator
    if (playbackProgress > 0 && playbackProgress < 1) {
      const trackerX = 55 + playbackProgress * (width - 70);
      ctx.beginPath();
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 2;
      ctx.setLineDash([2, 2]);
      ctx.moveTo(trackerX, 10);
      ctx.lineTo(trackerX, height - 25);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [ttsResult, playbackProgress]);

  // Audio Playback Handler for Synthesized Voice
  const togglePlayAudio = () => {
    if (!audioUrl && !ttsResult) return;

    if (ttsAudioRef.current) {
      if (isPlayingAudio) {
        ttsAudioRef.current.pause();
        setIsPlayingAudio(false);
      } else {
        ttsAudioRef.current.play().catch(() => {
          // If browser blocked autoplay or base64 audio failed, play tones via Web Audio API
          playSynthesizedTone();
        });
        setIsPlayingAudio(true);
      }
    } else {
      playSynthesizedTone();
    }
  };

  // Web Audio API tone generator fallback / acoustic preview
  const playSynthesizedTone = () => {
    if (!ttsResult || ttsResult.syllables.length === 0) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      let startTime = audioCtx.currentTime;

      setIsPlayingAudio(true);
      const totalDur = ttsResult.syllables.length * 0.23;

      // Animate progress
      const startMs = Date.now();
      const progressTimer = setInterval(() => {
        const elapsed = (Date.now() - startMs) / 1000;
        const p = Math.min(1, elapsed / totalDur);
        setPlaybackProgress(p);
        if (p >= 1) {
          clearInterval(progressTimer);
          setIsPlayingAudio(false);
          setPlaybackProgress(0);
        }
      }, 50);

      ttsResult.syllables.forEach((item) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(item.target_f0, startTime);

        gain.gain.setValueAtTime(0.01, startTime);
        gain.gain.exponentialRampToValueAtTime(0.25, startTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.2);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.22);
        startTime += 0.23;
      });
    } catch (e) {
      console.warn("AudioContext error:", e);
      setIsPlayingAudio(false);
    }
  };

  // Run STT Transcription on Selected Sample
  const handleTranscribeSample = async (clip: ThithoAudioItem) => {
    setSelectedClip(clip);
    setIsTranscribing(true);
    try {
      const res = await executeSTT((clip as any).audio_path || clip.id.toString());
      setSttResult(res);
    } catch (e) {
      console.error("STT transcription error:", e);
    } finally {
      setIsTranscribing(false);
    }
  };

  // Microphone Recording Methods
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(audioBlob);
        setRecordedAudioUrl(url);

        // Convert blob to base64
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          setRecordedBase64(reader.result as string);
        };
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      recordTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone permission denied or unsupported:", err);
      alert("Microphone access is not supported or was denied in this environment. You can test live transcription using the Mozilla Common Voice clips.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
      if (recordTimerRef.current) {
        clearInterval(recordTimerRef.current);
      }
    }
  };

  const handleTranscribeRecording = async () => {
    if (!recordedBase64) return;
    setIsTranscribing(true);
    try {
      const res = await executeSTT(undefined, recordedBase64);
      setSttResult(res);
    } catch (e) {
      console.error("STT microphone transcription error:", e);
    } finally {
      setIsTranscribing(false);
    }
  };

  // Tone statistics
  const toneCount = {
    H: ttsResult?.syllables.filter((s) => s.tone === "H").length || 0,
    M: ttsResult?.syllables.filter((s) => s.tone === "M").length || 0,
    L: ttsResult?.syllables.filter((s) => s.tone === "L").length || 0,
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="border-b border-zinc-800 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mic className="w-6 h-6 text-purple-400" />
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Thitho Mũgambo (Voice & Acoustic Processing)
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-mono flex items-center gap-1.5 border ${
                connectionStatus === "connected"
                  ? "bg-purple-950/60 text-purple-300 border-purple-800/50"
                  : "bg-amber-950/60 text-amber-300 border-amber-800/50"
              }`}
            >
              <Radio className="w-3 h-3 animate-pulse text-purple-400" />
              <span>
                {connectionStatus === "connected" ? "Meta SeamlessM4T Online" : "Acoustic Aligner (Offline-First)"}
              </span>
            </span>
          </div>
        </div>
        <p className="text-xs text-zinc-400 mt-1">
          Bantu tonal frequency contour synthesis ($F_0$ High 210Hz, Mid 175Hz, Low 140Hz), 16kHz PCM audio broadcast, and Mozilla Common Voice acoustic speech-to-text.
        </p>
      </div>

      {/* SECTION 1: TEXT-TO-SPEECH (TTS) SYNTHESIZER */}
      <div className="rounded-2xl border border-zinc-800 bg-[#0e140e] p-6 space-y-6 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-purple-400" />
            <div>
              <h2 className="text-base font-bold text-white">Text-to-Speech (TTS) Synthesizer</h2>
              <p className="text-xs text-zinc-400">Offline formant acoustic synthesizer preserving Gĩkũyũ 7-vowel phonemes and tonal contours</p>
            </div>
          </div>
          {ttsResult && (
            <span className="text-xs px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono">
              Engine: {ttsResult.source}
            </span>
          )}
        </div>

        {/* Input & Presets */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Gĩkũyũ Input Text
            </label>
            <div className="flex gap-1.5 flex-wrap">
              {PRESET_PHRASES.map((p, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setTtsInput(p.text);
                    handleSynthesize(p.text);
                  }}
                  className="text-[11px] px-2 py-0.5 rounded-md bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <input
              type="text"
              value={ttsInput}
              onChange={(e) => setTtsInput(e.target.value)}
              placeholder="Andĩka ciugo cia Gĩkũyũ gũkũ..."
              className="w-full bg-[#131c13] border border-zinc-700/60 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition shadow-inner font-medium"
            />
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={() => handleSynthesize()}
              disabled={isSynthesizing || !ttsInput.trim()}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-2 transition-all shadow-md active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>{isSynthesizing ? "Synthesizing Waveform..." : "Synthesize Voice"}</span>
            </button>

            {ttsResult && (
              <button
                onClick={togglePlayAudio}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-2 transition-all shadow-md active:scale-95"
              >
                {isPlayingAudio ? (
                  <>
                    <Pause className="w-3.5 h-3.5 fill-current" />
                    <span>Pause Waveform</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Play Audio Stream</span>
                  </>
                )}
              </button>
            )}

            {ttsResult && (
              <button
                onClick={playSynthesizedTone}
                className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs flex items-center gap-2 transition shadow"
              >
                <Activity className="w-3.5 h-3.5 text-purple-400" />
                <span>Pure Tonal Oscillator</span>
              </button>
            )}
          </div>

          {/* Hidden audio element for WAV playback */}
          {audioUrl && (
            <audio
              ref={ttsAudioRef}
              src={audioUrl}
              onEnded={() => {
                setIsPlayingAudio(false);
                setPlaybackProgress(0);
              }}
              onTimeUpdate={(e) => {
                const audio = e.currentTarget;
                if (audio.duration > 0) {
                  setPlaybackProgress(audio.currentTime / audio.duration);
                }
              }}
            />
          )}
        </div>

        {/* Acoustic Pitch Visualizer Canvas */}
        {ttsResult && (
          <div className="p-5 rounded-xl border border-zinc-800 bg-[#0a0f0a] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-400" />
                <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                  Tonal Frequency Contour ($F_0$ Trajectory Curve)
                </h3>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono text-zinc-400">
                <span>Duration: {ttsResult.estimated_duration}s</span>
                <span>•</span>
                <span>16,000 Hz Mono PCM</span>
                <span>•</span>
                <span>{ttsResult.byte_size.toLocaleString()} bytes</span>
              </div>
            </div>

            {/* Continuous Bezier Trajectory Graph */}
            <div className="relative bg-zinc-950/90 rounded-xl border border-zinc-900 p-2 overflow-hidden shadow-inner">
              <canvas
                ref={canvasRef}
                width={800}
                height={160}
                className="w-full h-40 block"
              />
            </div>

            {/* Syllable Frequency Breakdown Tiles */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 scrollbar-thin">
              {ttsResult.syllables.map((s, idx) => (
                <div
                  key={idx}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-lg border text-center transition ${
                    s.tone === "H"
                      ? "bg-purple-950/40 border-purple-800/60 text-purple-300"
                      : s.tone === "M"
                      ? "bg-amber-950/40 border-amber-800/60 text-amber-300"
                      : "bg-emerald-950/40 border-emerald-800/60 text-emerald-300"
                  }`}
                >
                  <div className="text-xs font-bold text-white">{s.syllable}</div>
                  <div className="text-[10px] font-mono opacity-80">
                    [{s.tone}] {s.target_f0}Hz
                  </div>
                </div>
              ))}
            </div>

            {/* Tone Legend and Ratio Breakdown */}
            <div className="flex flex-wrap items-center justify-between pt-2 border-t border-zinc-800/60 text-xs text-zinc-400 font-mono gap-4">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" />
                  <span>High Tone (H ~210Hz): {toneCount.H}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                  <span>Mid Tone (M ~175Hz): {toneCount.M}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                  <span>Low Tone (L ~140Hz): {toneCount.L}</span>
                </span>
              </div>
              <span className="text-[11px] text-zinc-500">
                Syllables: {ttsResult.syllables.length}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2: SPEECH-TO-TEXT (STT) & COMMON VOICE */}
      <div className="rounded-2xl border border-zinc-800 bg-[#0e140e] p-6 space-y-6 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Mic className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-base font-bold text-white">Speech-to-Text (STT) Transcription Pipeline</h2>
              <p className="text-xs text-zinc-400">Meta SeamlessM4T acoustic model aligned with Mozilla Common Voice Gĩkũyũ dataset</p>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="flex bg-zinc-900 border border-zinc-800 rounded-xl p-1 gap-1">
            <button
              onClick={() => setActiveTab("common_voice")}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                activeTab === "common_voice"
                  ? "bg-emerald-600 text-white shadow"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Mozilla Common Voice
            </button>
            <button
              onClick={() => setActiveTab("mic_record")}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                activeTab === "mic_record"
                  ? "bg-emerald-600 text-white shadow"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Live Edge Microphone
            </button>
          </div>
        </div>

        {/* TAB 1: MOZILLA COMMON VOICE CLIPS */}
        {activeTab === "common_voice" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span className="font-semibold uppercase tracking-wider text-zinc-300">
                Verified Utterances in Ikũmbi Granary ({audioList.length})
              </span>
              <button
                onClick={loadAudioDataset}
                className="flex items-center gap-1 hover:text-emerald-400 transition"
              >
                <RefreshCw className={`w-3 h-3 ${isLoadingAudio ? "animate-spin" : ""}`} />
                <span>Reload Clips</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {audioList.map((clip) => {
                const isSelected = selectedClip?.id === clip.id;
                return (
                  <div
                    key={clip.id}
                    onClick={() => setSelectedClip(clip)}
                    className={`p-4 rounded-xl border transition cursor-pointer space-y-2.5 ${
                      isSelected
                        ? "bg-[#111a11] border-emerald-500 shadow-md ring-1 ring-emerald-500/20"
                        : "bg-zinc-900/40 border-zinc-800 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-zinc-300 font-semibold flex items-center gap-1.5">
                        <FileAudio className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{(clip as any).audio_path?.split("/").pop() || `cv_clip_${clip.id}.wav`}</span>
                      </span>
                      <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                        <CheckCircle2 className="w-3 h-3" /> Tonal Verified
                      </span>
                    </div>

                    <p className="text-sm font-medium text-zinc-100 line-clamp-2">
                      "{clip.text}"
                    </p>

                    <div className="flex items-center justify-between pt-1 border-t border-zinc-800/60 text-xs text-zinc-400 font-mono">
                      <span>{clip.accent || "Central Kenya"}</span>
                      <span>{clip.duration_sec || 3.2}s</span>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (clipAudioRef.current) {
                            clipAudioRef.current.src = getAudioClipUrl(clip.id);
                            clipAudioRef.current.play().catch(() => {});
                          }
                        }}
                        className="px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Play Audio</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTranscribeSample(clip);
                        }}
                        disabled={isTranscribing}
                        className="px-3 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow"
                      >
                        <Activity className="w-3 h-3" />
                        <span>Transcribe Clip</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Hidden audio element for sample preview */}
            <audio ref={clipAudioRef} />
          </div>
        )}

        {/* TAB 2: LIVE EDGE MICROPHONE RECORDING */}
        {activeTab === "mic_record" && (
          <div className="p-6 rounded-xl border border-zinc-800 bg-[#0a0f0a] space-y-5 text-center">
            <div className="max-w-md mx-auto space-y-2">
              <h3 className="text-sm font-bold text-white">Edge Audio Ingest & Live Recording</h3>
              <p className="text-xs text-zinc-400">
                Record your voice speaking Gĩkũyũ using your local browser microphone. The audio will be streamed to SeamlessM4T STT.
              </p>
            </div>

            <div className="flex flex-col items-center justify-center gap-3 py-4">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-xl active:scale-95 ${
                  isRecording
                    ? "bg-red-600 hover:bg-red-500 animate-pulse ring-4 ring-red-500/30 text-white"
                    : "bg-emerald-600 hover:bg-emerald-500 text-white"
                }`}
              >
                {isRecording ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
              </button>

              <div className="font-mono text-sm text-zinc-300">
                {isRecording ? (
                  <span className="text-red-400 font-bold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                    Recording: 00:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}
                  </span>
                ) : recordedAudioUrl ? (
                  <span>Recording ready for transcription</span>
                ) : (
                  <span className="text-zinc-500">Click to start recording</span>
                )}
              </div>
            </div>

            {recordedAudioUrl && (
              <div className="flex flex-col items-center gap-3 pt-2">
                <audio controls src={recordedAudioUrl} className="max-w-xs mx-auto" />
                <button
                  onClick={handleTranscribeRecording}
                  disabled={isTranscribing}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-2 shadow-lg transition active:scale-95"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>{isTranscribing ? "Transcribing Speech..." : "Transcribe Live Recording"}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* STT TRANSCRIPTION RESULT CARD */}
        {sttResult && (
          <div className="p-5 rounded-xl border border-emerald-800/50 bg-[#0e170e] space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5 font-semibold">
                <CheckCircle2 className="w-4 h-4" /> SeamlessM4T Aligned Transcription
              </span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
                Confidence: {(sttResult.confidence * 100).toFixed(1)}%
              </span>
            </div>

            <p className="text-lg font-bold text-white tracking-wide">
              "{sttResult.transcription}"
            </p>

            <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-zinc-400 pt-2 border-t border-zinc-800/80">
              <span>Accent: {sttResult.speaker_accent}</span>
              <span>•</span>
              <span>Speaker: {sttResult.speaker_id || "spk_edge_local"}</span>
              <span>•</span>
              <span>Duration: {sttResult.duration_sec || 3.0}s</span>
              <span>•</span>
              <span>Engine: {sttResult.engine}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
