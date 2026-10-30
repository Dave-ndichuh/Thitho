"""
Train Thitho Gĩkũyũ Custom Tokenizer
Pulls all sentences, definitions, and idioms from Thitho Ikũmbi database
and trains a low-fertility, diacritic-preserving subword tokenizer.
"""

import sys
from pathlib import Path

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

from ikumbi.storage.db import IkumbiDB
from core.tokenizer.gikuyu_tokenizer import ThithoGikuyuTokenizer, DEFAULT_TOKENIZER_PATH


def collect_training_corpus(db: IkumbiDB) -> list[str]:
    """Gather all raw text data from Ikũmbi tables."""
    corpus = []
    
    # 1. Parallel sentences (Gĩkũyũ side)
    pairs = db.get_parallel_dataset()
    for p in pairs:
        corpus.append(p["gikuyu_text"])
        
    # 2. Definitions and usage examples
    with db.get_connection() as conn:
        cur = conn.cursor()
        cur.execute("SELECT example_gikuyu FROM definitions WHERE example_gikuyu IS NOT NULL")
        for r in cur.fetchall():
            corpus.append(r[0])
            
        cur.execute("SELECT lemma FROM words")
        for r in cur.fetchall():
            corpus.append(r[0])
            
        cur.execute("SELECT text FROM audio_corpus")
        for r in cur.fetchall():
            corpus.append(r[0])

    # Augment with core linguistic patterns
    corpus.extend([
        "Mũrĩmi nĩ ahandaga mbembe rĩrĩa mbura yagia thĩinĩ wa mũgũnda.",
        "Aria tawa nĩguo twone ũtheri thĩinĩ wa nyũmba ya kũrĩĩra.",
        "Hinga mũrango nĩgũo ũrugarĩ ũtikehere na heho ĩtonye.",
        "Mũtĩ ũrĩa ũkũrĩte wega nĩ ũciaraga matunda mega ma kũrĩĩka.",
        "Thitho wa ũrĩmi mwega nĩ kũmenya mahinda ma kũhĩnjĩra irio.",
        "Gĩkũyũ nĩ rũrĩmĩ rwĩ ngumo na ũtonga mũingĩ wa kĩũgo.",
        "Ũgo wa kĩmĩtambo nĩ ũrathingata macani, kahua, na irio cia mũgũnda.",
        "Ng'ombe iria ciendete nyeki nĩ irutaga iria rĩingĩ na ũrugarĩ mwega.",
        "Rũĩ rwa Chania na Tana nĩ irutaga maĩ mega ma kũhĩnjĩra arĩmi.",
        "Mũciĩ ũtarĩ ndũgũ nĩ ta kĩrĩma gĩtarĩ nyeki kana mĩtĩ.",
    ])
    return corpus


def main():
    print("🚀 Initializing Thitho Tokenizer Training Pipeline...")
    db = IkumbiDB()
    corpus = collect_training_corpus(db)
    print(f"📚 Collected {len(corpus)} text samples from Ikũmbi.")

    tokenizer = ThithoGikuyuTokenizer()
    tokenizer.train_on_texts(corpus, vocab_size=1000, min_frequency=1, save_path=DEFAULT_TOKENIZER_PATH)

    print(f"✅ Tokenizer successfully trained and saved to: {DEFAULT_TOKENIZER_PATH}")

    # Test sample encoding
    test_phrase = "Mũrĩmi nĩ ahandaga mbembe na kahua mũgũnda-inĩ."
    enc = tokenizer.encode(test_phrase)
    dec = tokenizer.decode(enc["ids"])

    print("\n🔍 Test Encoding Verification:")
    print(f"  Original:   '{test_phrase}'")
    print(f"  Tokens:     {enc['tokens']}")
    print(f"  Token IDs:  {enc['ids']}")
    print(f"  Decoded:    '{dec}'")
    print(f"  Fertility:  {enc['fertility_per_word']:.2f} tokens/word")


if __name__ == "__main__":
    main()
