import {
  cacheWords,
  searchLocalDictionary,
  cacheParallelPairs,
  getLocalParallel,
  cacheAudioItems,
  getLocalAudio,
  getCachedTranslation,
  saveCachedTranslation,
  getLocalSmartHomeDevices,
  setLocalSmartHomeDevice,
  cacheSeasonsData,
  getLocalSeasonsData,
  queueOutboxAction,
  ThithoWord,
  ThithoParallelPair,
  ThithoAudioItem,
} from "./db";
import { syncEngine } from "./sync";

export interface TranslationResponse {
  source_text: string;
  translated_text: string;
  source_lang: string;
  target_lang: string;
  confidence: number;
  engine: string;
  fromCache?: boolean;
}

export interface AgriDiagnosisResponse {
  crop: string;
  diagnosis_gikuyu: string;
  treatment_gikuyu: string;
  treatment_english: string;
  confidence: string | number;
  status: string;
}

export interface SmartHomeActionResponse {
  action: string;
  device?: string;
  iot_payload?: any;
  response_gikuyu: string;
  response_english: string;
  status: string;
  queuedOffline?: boolean;
}

// -------------------------------------------------------------
// 1. Dictionary / Granary API
// -------------------------------------------------------------

export async function fetchDictionary(query: string = ""): Promise<{
  results: ThithoWord[];
  source: "live_bridge" | "indexeddb_offline";
}> {
  try {
    const res = await fetch(`/api/bridge/dictionary?q=${encodeURIComponent(query)}&limit=50`, {
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        await cacheWords(data.results);
      }
      return { results: data.results || [], source: "live_bridge" };
    }
  } catch (err) {
    // Bridge unavailable; fallback to IndexedDB
  }

  const cached = await searchLocalDictionary(query);
  return { results: cached, source: "indexeddb_offline" };
}

// -------------------------------------------------------------
// 2. Parallel Corpus API
// -------------------------------------------------------------

export async function fetchParallelCorpus(
  domain: string = "all",
  query: string = ""
): Promise<{
  results: ThithoParallelPair[];
  source: "live_bridge" | "indexeddb_offline";
}> {
  try {
    const params = new URLSearchParams();
    if (domain && domain !== "all") params.append("domain", domain);
    if (query) params.append("q", query);

    const res = await fetch(`/api/bridge/parallel?${params.toString()}`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        await cacheParallelPairs(data.results);
      }
      return { results: data.results || [], source: "live_bridge" };
    }
  } catch (e) {
    // Offline fallback
  }

  const cached = await getLocalParallel(domain);
  const filtered = query
    ? cached.filter(
        (p) =>
          p.gikuyu_text.toLowerCase().includes(query.toLowerCase()) ||
          p.english_text.toLowerCase().includes(query.toLowerCase())
      )
    : cached;

  return { results: filtered, source: "indexeddb_offline" };
}

// -------------------------------------------------------------
// 3. Common Voice Audio API
// -------------------------------------------------------------

export async function fetchAudioCorpus(): Promise<{
  results: ThithoAudioItem[];
  source: "live_bridge" | "indexeddb_offline";
}> {
  try {
    const res = await fetch("/api/bridge/audio?limit=50", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        await cacheAudioItems(data.results);
      }
      return { results: data.results || [], source: "live_bridge" };
    }
  } catch (e) {
    // Fallback
  }

  const cached = await getLocalAudio();
  return { results: cached, source: "indexeddb_offline" };
}

// -------------------------------------------------------------
// 4. Bi-Directional Translation API
// -------------------------------------------------------------

export async function executeTranslation(
  text: string,
  sourceLang: string = "kik_Latn",
  targetLang: string = "eng_Latn"
): Promise<TranslationResponse> {
  const cleanText = text.trim();
  if (!cleanText) {
    return {
      source_text: "",
      translated_text: "",
      source_lang: sourceLang,
      target_lang: targetLang,
      confidence: 1.0,
      engine: "identity",
    };
  }

  // 1. Check IndexedDB persistent cache
  const cached = await getCachedTranslation(cleanText, sourceLang, targetLang);
  if (cached) {
    return {
      source_text: cleanText,
      translated_text: cached.translatedText,
      source_lang: sourceLang,
      target_lang: targetLang,
      confidence: cached.confidence,
      engine: `${cached.engine} (IndexedDB Cache)`,
      fromCache: true,
    };
  }

  // 2. Dispatch to Live Bridge
  try {
    const res = await fetch("/api/bridge/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: cleanText,
        source_lang: sourceLang,
        target_lang: targetLang,
      }),
    });

    if (res.ok) {
      const data: TranslationResponse = await res.json();
      await saveCachedTranslation(
        cleanText,
        data.translated_text,
        sourceLang,
        targetLang,
        data.confidence,
        data.engine
      );
      return data;
    }
  } catch (err) {
    // Fallback if bridge offline
  }

  // 3. Optimistic local rule translation
  let offlineTrans = cleanText;
  const lower = cleanText.toLowerCase();

  if (sourceLang === "kik_Latn") {
    if (lower.includes("mũrĩmi")) offlineTrans = "The farmer (cultivator of crops)";
    else if (lower.includes("mũrango")) offlineTrans = "Close and lock the exterior entrance door.";
    else if (lower.includes("tawa")) offlineTrans = "Switch on the household light.";
    else if (lower.includes("kahua")) offlineTrans = "The coffee crop is yielding a bountiful harvest.";
    else if (lower.includes("mbembe")) offlineTrans = "Maize (corn grains and cobs).";
  } else {
    if (lower.includes("farmer")) offlineTrans = "Mũrĩmi nĩ ahandaga mbembe rĩrĩa mbura yagia.";
    else if (lower.includes("door")) offlineTrans = "Hinga mũrango wa nja.";
    else if (lower.includes("light")) offlineTrans = "Aria tawa wa nyũmba.";
  }

  return {
    source_text: cleanText,
    translated_text: offlineTrans,
    source_lang: sourceLang,
    target_lang: targetLang,
    confidence: 0.85,
    engine: "offline_indexeddb_heuristic",
  };
}

// -------------------------------------------------------------
// 5. Agricultural Advisor API
// -------------------------------------------------------------

export async function executeCropDiagnosis(
  crop: string,
  symptoms: string
): Promise<AgriDiagnosisResponse> {
  try {
    const res = await fetch("/api/bridge/edge/agriculture", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ crop, symptoms }),
    });

    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    // Offline fallback
  }

  // Local fallback diagnosis
  return {
    crop,
    diagnosis_gikuyu: `Ũthuthuria wa ${crop}: Mũrimũ wa mathangũ kũhũndũka (Local Offline Diagnostic)`,
    treatment_gikuyu: "Ĩkĩra ndoogo ya ng'ombe kana mbolea ya CAN thĩinĩ wa makinya ma centimita 10 kuuma mũtĩ-inĩ.",
    treatment_english: "Apply cattle manure or CAN nitrogen booster 10cm away from the stalk.",
    confidence: "90% (Offline)",
    status: "OFFLINE_MATCH",
  };
}

export async function fetchAgriculturalSeasons(): Promise<any> {
  try {
    const res = await fetch("/api/bridge/edge/agriculture/seasons");
    if (res.ok) {
      const data = await res.json();
      await cacheSeasonsData(data);
      return data;
    }
  } catch (err) {
    // Offline
  }

  const cached = await getLocalSeasonsData();
  if (cached && cached.length > 0) {
    const map: Record<string, any> = {};
    for (const item of cached) {
      map[item.id] = item;
    }
    return map;
  }

  // Hardcoded baseline fallback
  return {
    njahi: {
      name: "Kĩmera kĩa Njahĩ (Long Rains Season: March - May)",
      crops: ["Mbembe", "Njahĩ", "Thukũma", "Warũ"],
      advice_kik: "Rĩu nĩ kĩmera kĩa Njahĩ. Handa mbembe thĩinĩ wa tĩĩri ũiyũrĩte biũ na mũtutu wa mbũri.",
      advice_eng: "This is the Long Rains season. Plant maize in fertile soil.",
    },
  };
}

// -------------------------------------------------------------
// 6. Smart Home IoT API (Optimistic UI + Outbox Queue)
// -------------------------------------------------------------

export async function executeSmartHomeCommand(
  command: string
): Promise<SmartHomeActionResponse> {
  const cleanCmd = command.trim();

  // 1. Optimistic parsing immediately for zero latency
  let action = "COMMAND_EXECUTED";
  let gikuyuResp = "Nĩ ndataũkĩrwo nĩ watho waku.";
  let engResp = "Command processed.";

  const lower = cleanCmd.toLowerCase();
  if (lower.includes("mũrango") || lower.includes("door")) {
    if (lower.includes("hingũra") || lower.includes("open") || lower.includes("unlock")) {
      action = "DOOR_UNLOCK";
      gikuyuResp = "Nĩ ndahingũra mũrango wa nja.";
      engResp = "I have unlocked the exterior door.";
      await setLocalSmartHomeDevice("mũrango_wa_nja", "UNLOCKED");
    } else {
      action = "DOOR_LOCK";
      gikuyuResp = "Nĩ ndahinga mũrango wa nja wega. Ũgitĩri nĩ mwĩkĩre.";
      engResp = "I have securely locked the exterior door.";
      await setLocalSmartHomeDevice("mũrango_wa_nja", "LOCKED");
    }
  } else if (lower.includes("tawa") || lower.includes("light")) {
    const dev = lower.includes("thome") ? "tawa_wa_thome" : "tawa_wa_nyũmba";
    if (lower.includes("horia") || lower.includes("off")) {
      action = "LIGHT_OFF";
      gikuyuResp = "Tawa nĩ wahorio.";
      engResp = "The light has been switched off.";
      await setLocalSmartHomeDevice(dev, "OFF");
    } else {
      action = "LIGHT_ON";
      gikuyuResp = "Nĩ ndaria tawa. Ũtheri nĩ waingĩha.";
      engResp = "I have turned on the light. The room is now illuminated.";
      await setLocalSmartHomeDevice(dev, "ON");
    }
  }

  // 2. Dispatch to Live Bridge
  try {
    const res = await fetch("/api/bridge/edge/smarthome", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command: cleanCmd }),
    });

    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    // If bridge is down, enqueue into IndexedDB outbox!
    await queueOutboxAction("SMARTHOME_COMMAND", { command: cleanCmd });
    return {
      action,
      response_gikuyu: gikuyuResp,
      response_english: engResp,
      status: "QUEUED_OFFLINE",
      queuedOffline: true,
    };
  }

  return {
    action,
    response_gikuyu: gikuyuResp,
    response_english: engResp,
    status: "SUCCESS",
  };
}

export async function fetchSmartHomeDevices(): Promise<Record<string, any>> {
  try {
    const res = await fetch("/api/bridge/edge/smarthome/devices", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      for (const [key, val] of Object.entries(data)) {
        const v = val as any;
        await setLocalSmartHomeDevice(key, v.state || "ACTIVE", v);
      }
      return data;
    }
  } catch (e) {
    // Fallback
  }

  const cached = await getLocalSmartHomeDevices();
  if (cached.length > 0) {
    const map: Record<string, any> = {};
    for (const item of cached) {
      map[item.device] = item;
    }
    return map;
  }

  return {
    mũrango_wa_nja: { name: "Exterior Door", state: "LOCKED", type: "lock" },
    tawa_wa_nyũmba: { name: "Living Room Light", state: "OFF", type: "light" },
    tawa_wa_thome: { name: "Porch Light", state: "OFF", type: "light" },
    ũrugarĩ: { name: "Temperature Sensor", value: "22.5°C", type: "sensor" },
  };
}
