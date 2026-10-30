import { openDB, DBSchema, IDBPDatabase } from "idb";

export interface ThithoWord {
  id?: number;
  lemma: string;
  phonetic?: string;
  tonal_pattern?: string;
  part_of_speech?: string;
  noun_class?: string;
  etymology?: string;
  definitions: Array<{
    id?: number;
    definition: string;
    source: string;
    language?: string;
    example_gikuyu?: string;
    example_english?: string;
  }>;
}

export interface ThithoParallelPair {
  id: number;
  gikuyu_text: string;
  english_text: string;
  domain: string;
  source: string;
}

export interface ThithoAudioItem {
  id: number;
  text: string;
  normalized_text: string;
  speaker_id?: string;
  accent?: string;
  duration_sec?: number;
  up_votes: number;
  tonal_verified: boolean;
}

export interface OutboxItem {
  id?: number;
  type: "TRANSLATE" | "SMARTHOME_COMMAND" | "AGRI_QUERY" | "DICTIONARY_SEARCH";
  payload: any;
  createdAt: number;
  retries: number;
}

interface ThithoDBSchema extends DBSchema {
  dictionary: {
    key: string; // lemma
    value: ThithoWord;
    indexes: { "by-pos": string; "by-class": string };
  };
  parallel: {
    key: number;
    value: ThithoParallelPair;
    indexes: { "by-domain": string };
  };
  audio: {
    key: number;
    value: ThithoAudioItem;
  };
  translations: {
    key: string; // "kik_Latn:text"
    value: {
      key: string;
      sourceText: string;
      translatedText: string;
      sourceLang: string;
      targetLang: string;
      confidence: number;
      engine: string;
      timestamp: number;
    };
  };
  smarthome: {
    key: string; // device identifier
    value: {
      device: string;
      name: string;
      state: string;
      type: string;
      value?: string;
      lastUpdated: number;
    };
  };
  seasons: {
    key: string;
    value: {
      id: string;
      name: string;
      crops: string[];
      advice_kik: string;
      advice_eng: string;
    };
  };
  outbox: {
    key: number;
    value: OutboxItem;
    indexes: { "by-created": number };
  };
  metadata: {
    key: string;
    value: any;
  };
}

const DB_NAME = "thitho_ecosystem_offline_v1";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<ThithoDBSchema>> | null = null;

export function getDB(): Promise<IDBPDatabase<ThithoDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<ThithoDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // 1. Dictionary
        if (!db.objectStoreNames.contains("dictionary")) {
          const dictStore = db.createObjectStore("dictionary", { keyPath: "lemma" });
          dictStore.createIndex("by-pos", "part_of_speech");
          dictStore.createIndex("by-class", "noun_class");
        }

        // 2. Parallel Corpus
        if (!db.objectStoreNames.contains("parallel")) {
          const pStore = db.createObjectStore("parallel", { keyPath: "id" });
          pStore.createIndex("by-domain", "domain");
        }

        // 3. Audio Corpus
        if (!db.objectStoreNames.contains("audio")) {
          db.createObjectStore("audio", { keyPath: "id" });
        }

        // 4. Translations Cache
        if (!db.objectStoreNames.contains("translations")) {
          db.createObjectStore("translations", { keyPath: "key" });
        }

        // 5. Smart Home States
        if (!db.objectStoreNames.contains("smarthome")) {
          db.createObjectStore("smarthome", { keyPath: "device" });
        }

        // 6. Agricultural Seasons
        if (!db.objectStoreNames.contains("seasons")) {
          db.createObjectStore("seasons", { keyPath: "id" });
        }

        // 7. Outbox Queue (for offline optimistic sync)
        if (!db.objectStoreNames.contains("outbox")) {
          const outboxStore = db.createObjectStore("outbox", {
            keyPath: "id",
            autoIncrement: true,
          });
          outboxStore.createIndex("by-created", "createdAt");
        }

        // 8. Metadata
        if (!db.objectStoreNames.contains("metadata")) {
          db.createObjectStore("metadata");
        }
      },
    });
  }
  return dbPromise;
}

// -------------------------------------------------------------
// Helper Persistence Methods
// -------------------------------------------------------------

export async function cacheWords(words: ThithoWord[]) {
  const db = await getDB();
  const tx = db.transaction("dictionary", "readwrite");
  for (const w of words) {
    await tx.store.put(w);
  }
  await tx.done;
}

export async function searchLocalDictionary(query: string): Promise<ThithoWord[]> {
  const db = await getDB();
  const all = await db.getAll("dictionary");
  const cleanQ = query.toLowerCase().trim();

  // Normalize diacritics for flexible offline matching
  const asciiQ = cleanQ
    .replace(/[ĩîi~]/g, "i")
    .replace(/[ũûu~]/g, "u")
    .replace(/ng’/g, "ng'");

  return all.filter((item) => {
    const lemma = item.lemma.toLowerCase();
    const asciiLemma = lemma.replace(/[ĩ]/g, "i").replace(/[ũ]/g, "u");
    const matchesLemma = lemma.includes(cleanQ) || asciiLemma.includes(asciiQ);
    const matchesDef = item.definitions.some((d) =>
      d.definition.toLowerCase().includes(cleanQ)
    );
    return matchesLemma || matchesDef;
  });
}

export async function cacheParallelPairs(pairs: ThithoParallelPair[]) {
  const db = await getDB();
  const tx = db.transaction("parallel", "readwrite");
  for (const p of pairs) {
    await tx.store.put(p);
  }
  await tx.done;
}

export async function getLocalParallel(domain?: string): Promise<ThithoParallelPair[]> {
  const db = await getDB();
  if (domain && domain !== "all") {
    return await db.getAllFromIndex("parallel", "by-domain", domain);
  }
  return await db.getAll("parallel");
}

export async function cacheAudioItems(items: ThithoAudioItem[]) {
  const db = await getDB();
  const tx = db.transaction("audio", "readwrite");
  for (const a of items) {
    await tx.store.put(a);
  }
  await tx.done;
}

export async function getLocalAudio(): Promise<ThithoAudioItem[]> {
  const db = await getDB();
  return await db.getAll("audio");
}

export async function getCachedTranslation(text: string, srcLang: string, tgtLang: string) {
  const db = await getDB();
  const key = `${srcLang}:${tgtLang}:${text.toLowerCase().trim()}`;
  return await db.get("translations", key);
}

export async function saveCachedTranslation(
  sourceText: string,
  translatedText: string,
  srcLang: string,
  tgtLang: string,
  confidence: number,
  engine: string
) {
  const db = await getDB();
  const key = `${srcLang}:${tgtLang}:${sourceText.toLowerCase().trim()}`;
  await db.put("translations", {
    key,
    sourceText,
    translatedText,
    sourceLang: srcLang,
    targetLang: tgtLang,
    confidence,
    engine,
    timestamp: Date.now(),
  });
}

export async function getLocalSmartHomeDevices() {
  const db = await getDB();
  return await db.getAll("smarthome");
}

export async function setLocalSmartHomeDevice(device: string, state: string, details?: any) {
  const db = await getDB();
  await db.put("smarthome", {
    device,
    name: details?.name || device,
    state,
    type: details?.type || "device",
    value: details?.value,
    lastUpdated: Date.now(),
  });
}

export async function cacheSeasonsData(seasonsDict: Record<string, any>) {
  const db = await getDB();
  const tx = db.transaction("seasons", "readwrite");
  for (const [id, data] of Object.entries(seasonsDict)) {
    await tx.store.put({ id, ...data });
  }
  await tx.done;
}

export async function getLocalSeasonsData() {
  const db = await getDB();
  return await db.getAll("seasons");
}

// Outbox Sync Queue for offline execution
export async function queueOutboxAction(type: OutboxItem["type"], payload: any): Promise<number> {
  const db = await getDB();
  return await db.add("outbox", {
    type,
    payload,
    createdAt: Date.now(),
    retries: 0,
  });
}

export async function getPendingOutbox(): Promise<OutboxItem[]> {
  const db = await getDB();
  return await db.getAllFromIndex("outbox", "by-created");
}

export async function removeOutboxItem(id: number) {
  const db = await getDB();
  await db.delete("outbox", id);
}
