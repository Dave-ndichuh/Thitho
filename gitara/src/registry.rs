use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PackageMeta {
    pub name: String,
    pub version: String,
    pub description: String,
    pub category: String, // "dictionary", "model", "ui"
    pub size_kb: u64,
    pub files: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegistryIndex {
    pub packages: HashMap<String, PackageMeta>,
}

impl RegistryIndex {
    pub fn default_catalog() -> Self {
        let mut packages = HashMap::new();

        packages.insert(
            "dict/core".to_string(),
            PackageMeta {
                name: "dict/core".to_string(),
                version: "1.0.0".to_string(),
                description: "Foundational Gikuyu lexicon with UKC synsets, Benson entries, and tonal contours".to_string(),
                category: "dictionary".to_string(),
                size_kb: 420,
                files: vec!["thitho_ikumbi.db".to_string(), "normalizer.py".to_string()],
            },
        );

        packages.insert(
            "dict/agri".to_string(),
            PackageMeta {
                name: "dict/agri".to_string(),
                version: "1.1.0".to_string(),
                description: "Specialized agricultural lexicon (crops, diseases, seasons, soils, livestock)".to_string(),
                category: "dictionary".to_string(),
                size_kb: 180,
                files: vec!["agri_lexicon.json".to_string(), "seasons.json".to_string()],
            },
        );

        packages.insert(
            "model/lora-agri".to_string(),
            PackageMeta {
                name: "model/lora-agri".to_string(),
                version: "0.9.0".to_string(),
                description: "Fine-tuned LoRA adapter for Mistral-7B / Llama-3 covering agricultural advisory QA".to_string(),
                category: "model".to_string(),
                size_kb: 48000,
                files: vec!["adapter_config.json".to_string(), "adapter_model.bin".to_string()],
            },
        );

        packages.insert(
            "model/lora-smarthome".to_string(),
            PackageMeta {
                name: "model/lora-smarthome".to_string(),
                version: "0.8.5".to_string(),
                description: "Low-Rank Adaptation weights for offline Gikuyu voice and IoT home command parsing".to_string(),
                category: "model".to_string(),
                size_kb: 32000,
                files: vec!["adapter_config.json".to_string(), "adapter_model.bin".to_string()],
            },
        );

        packages.insert(
            "ui/components".to_string(),
            PackageMeta {
                name: "ui/components".to_string(),
                version: "1.0.0".to_string(),
                description: "Localized React/Next.js UI components with Tailwind CSS & Gikuyu language support".to_string(),
                category: "ui".to_string(),
                size_kb: 85,
                files: vec![
                    "GikuyuDictionarySearch.tsx".to_string(),
                    "VoiceWaveformVisualizer.tsx".to_string(),
                    "AgriculturalAdvisoryCard.tsx".to_string(),
                ],
            },
        );

        Self { packages }
    }
}
