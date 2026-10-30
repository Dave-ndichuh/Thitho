use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs::File;
use std::io::Read;
use std::path::Path;
use unicode_normalization::UnicodeNormalization;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenizerModel {
    pub vocab: HashMap<String, u32>,
    pub merges: Vec<String>,
}

#[derive(Debug, Clone)]
pub struct ThithoTokenizer {
    pub vocab: HashMap<String, u32>,
    pub id_to_token: HashMap<u32, String>,
}

impl ThithoTokenizer {
    /// Create tokenizer from JSON file
    pub fn from_file<P: AsRef<Path>>(path: P) -> Result<Self, Box<dyn std::error::Error>> {
        let mut file = File::open(path)?;
        let mut contents = String::new();
        file.read_to_string(&mut contents)?;
        Self::from_json(&contents)
    }

    /// Parse tokenizer from JSON string
    pub fn from_json(json_str: &str) -> Result<Self, Box<dyn std::error::Error>> {
        let parsed: serde_json::Value = serde_json::from_str(json_str)?;
        let mut vocab = HashMap::new();
        let mut id_to_token = HashMap::new();

        if let Some(model) = parsed.get("model") {
            if let Some(v) = model.get("vocab") {
                if let Some(obj) = v.as_object() {
                    for (k, val) in obj {
                        if let Some(id) = val.as_u64() {
                            vocab.insert(k.clone(), id as u32);
                            id_to_token.insert(id as u32, k.clone());
                        }
                    }
                }
            }
        }

        Ok(Self {
            vocab,
            id_to_token,
        })
    }

    /// Normalize Gikuyu orthography (handling î, û, i~, u~ substitutions and NFC unicode)
    pub fn normalize(text: &str) -> String {
        let mut normalized = text.nfc().collect::<String>();
        normalized = normalized.replace("i~", "ĩ").replace("I~", "Ĩ");
        normalized = normalized.replace("u~", "ũ").replace("U~", "Ũ");
        normalized = normalized.replace("î", "ĩ").replace("Î", "Ĩ");
        normalized = normalized.replace("û", "ũ").replace("Û", "Ũ");
        normalized = normalized.replace("ng’", "ng'").replace("Ng’", "Ng'");
        normalized
    }

    /// Encode normalized Gikuyu text to subword token IDs
    pub fn encode(&self, text: &str) -> Vec<u32> {
        let clean = Self::normalize(text);
        let words: Vec<&str> = clean.split_whitespace().collect();
        let mut token_ids = Vec::new();

        for word in words {
            // Attempt exact match
            if let Some(&id) = self.vocab.get(word) {
                token_ids.push(id);
                continue;
            }

            // Fallback greedy sub-word segmentation
            let chars: Vec<char> = word.chars().collect();
            let mut i = 0;
            while i < chars.len() {
                let mut matched = false;
                for j in (i + 1..=chars.len()).rev() {
                    let sub: String = chars[i..j].iter().collect();
                    if let Some(&id) = self.vocab.get(&sub) {
                        token_ids.push(id);
                        i = j;
                        matched = true;
                        break;
                    }
                }
                if !matched {
                    token_ids.push(0); // <unk>
                    i += 1;
                }
            }
        }

        token_ids
    }

    /// Decode token IDs back to text
    pub fn decode(&self, ids: &[u32]) -> String {
        let mut tokens = Vec::new();
        for &id in ids {
            if let Some(t) = self.id_to_token.get(&id) {
                if t == "<unk>" || t == "<s>" || t == "</s>" || t == "<pad>" {
                    continue;
                }
                let clean_t = t.replace("Ġ", " ");
                tokens.push(clean_t);
            }
        }
        tokens.join("")
    }

    /// Vocabulary size
    pub fn vocab_size(&self) -> usize {
        self.vocab.len()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_normalization() {
        let input = "Mûcîî wa mûrîmi";
        let norm = ThithoTokenizer::normalize(input);
        assert_eq!(norm, "Mũcĩĩ wa mũrĩmi");
    }
}
