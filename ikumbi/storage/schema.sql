-- Thitho Ikũmbi (The Granary) - SQLite Unified Schema
-- Isolating Word Definitions, Sentence-Level Context, and Audio Mappings

PRAGMA foreign_keys = ON;

-- 1. Lexical Words Table
CREATE TABLE IF NOT EXISTS words (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lemma TEXT NOT NULL UNIQUE,
    phonetic TEXT,
    tonal_pattern TEXT,
    part_of_speech TEXT,
    noun_class TEXT,
    etymology TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Word Definitions & Sense Nuances
CREATE TABLE IF NOT EXISTS definitions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    word_id INTEGER NOT NULL,
    language TEXT NOT NULL DEFAULT 'eng',
    sense_num INTEGER DEFAULT 1,
    definition TEXT NOT NULL,
    example_gikuyu TEXT,
    example_english TEXT,
    source TEXT NOT NULL,
    confidence REAL DEFAULT 1.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(word_id) REFERENCES words(id) ON DELETE CASCADE
);

-- 3. Parallel Sentence Corpus
CREATE TABLE IF NOT EXISTS parallel_corpus (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gikuyu_text TEXT NOT NULL,
    english_text TEXT NOT NULL,
    domain TEXT DEFAULT 'general',
    source TEXT NOT NULL,
    split TEXT DEFAULT 'train' CHECK(split IN ('train', 'dev', 'test')),
    quality_score REAL DEFAULT 1.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Validated Audio Corpus
CREATE TABLE IF NOT EXISTS audio_corpus (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    normalized_text TEXT NOT NULL,
    audio_path TEXT NOT NULL,
    audio_format TEXT DEFAULT 'wav',
    duration_sec REAL,
    sample_rate INTEGER DEFAULT 16000,
    speaker_id TEXT,
    gender TEXT,
    accent TEXT DEFAULT 'Central Kenya',
    up_votes INTEGER DEFAULT 2,
    down_votes INTEGER DEFAULT 0,
    tonal_verified INTEGER DEFAULT 1,
    source TEXT DEFAULT 'Mozilla Common Voice',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for ultra-fast offline retrieval
CREATE INDEX IF NOT EXISTS idx_words_lemma ON words(lemma);
CREATE INDEX IF NOT EXISTS idx_defs_word_id ON definitions(word_id);
CREATE INDEX IF NOT EXISTS idx_defs_source ON definitions(source);
CREATE INDEX IF NOT EXISTS idx_parallel_domain ON parallel_corpus(domain);
CREATE INDEX IF NOT EXISTS idx_parallel_source ON parallel_corpus(source);
CREATE INDEX IF NOT EXISTS idx_audio_text ON audio_corpus(normalized_text);

-- FTS5 Full-Text Search Virtual Tables
CREATE VIRTUAL TABLE IF NOT EXISTS words_fts USING fts5(
    lemma, 
    part_of_speech, 
    etymology, 
    content='words', 
    content_rowid='id'
);

CREATE VIRTUAL TABLE IF NOT EXISTS definitions_fts USING fts5(
    definition, 
    example_gikuyu, 
    example_english, 
    content='definitions', 
    content_rowid='id'
);

CREATE VIRTUAL TABLE IF NOT EXISTS parallel_fts USING fts5(
    gikuyu_text, 
    english_text, 
    domain, 
    content='parallel_corpus', 
    content_rowid='id'
);
