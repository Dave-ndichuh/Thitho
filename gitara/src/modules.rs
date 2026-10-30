use crate::registry::RegistryIndex;
use std::fs::{self, File};
use std::io::Write;
use std::path::Path;

pub struct ModuleManager {
    pub catalog: RegistryIndex,
}

impl ModuleManager {
    pub fn new() -> Self {
        Self {
            catalog: RegistryIndex::default_catalog(),
        }
    }

    pub fn init_project(target_dir: &Path) -> Result<(), Box<dyn std::error::Error>> {
        let config_file = target_dir.join("thitho.json");
        if config_file.exists() {
            println!("Project configuration 'thitho.json' already exists.");
            return Ok(());
        }

        let default_config = serde_json::json!({
            "name": "thitho-app",
            "version": "0.1.0",
            "language": "kik_Latn",
            "offline_mode": true,
            "dependencies": {
                "dict/core": "^1.0.0",
                "ui/components": "^1.0.0"
            },
            "edge": {
                "target": "mini_pc",
                "quantization": "gguf_q4_k_m"
            }
        });

        fs::create_dir_all(target_dir.join("thitho_modules"))?;
        fs::create_dir_all(target_dir.join("components").join("thitho"))?;

        let mut f = File::create(config_file)?;
        f.write_all(serde_json::to_string_pretty(&default_config)?.as_bytes())?;
        println!("Initialized Thitho offline configuration at 'thitho.json'.");
        Ok(())
    }

    pub fn install_package(
        &self,
        pkg_name: &str,
        dest_root: &Path,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let pkg = self
            .catalog
            .packages
            .get(pkg_name)
            .ok_or_else(|| format!("Package '{}' not found in Thitho Gitara registry.", pkg_name))?;

        println!("📦 Resolving package: {} (v{})", pkg.name, pkg.version);
        println!("   Category: {}", pkg.category);
        println!("   Size: {} KB", pkg.size_kb);

        let target_dir = if pkg.category == "ui" {
            dest_root.join("components").join("thitho")
        } else {
            dest_root.join("thitho_modules").join(pkg_name)
        };

        fs::create_dir_all(&target_dir)?;

        // Write package manifest
        let manifest_file = target_dir.join("package.json");
        let manifest_content = serde_json::to_string_pretty(pkg)?;
        let mut f = File::create(manifest_file)?;
        f.write_all(manifest_content.as_bytes())?;

        // Write installed stub files for offline availability
        for file in &pkg.files {
            let file_path = target_dir.join(file);
            if !file_path.exists() {
                let mut out = File::create(file_path)?;
                if file.ends_with(".tsx") {
                    out.write_all(format!("// Localized Gĩkũyũ UI Component: {}\nexport default function {}() {{\n  return <div>Thitho Component</div>;\n}}\n", file, file.replace(".tsx", "")).as_bytes())?;
                } else if file.ends_with(".json") {
                    out.write_all(b"{\"installed\": true, \"source\": \"thitho-gitara-registry\"}")?;
                } else {
                    out.write_all(b"THITHO_OFFLINE_PACKAGE_BINARY_DATA")?;
                }
            }
        }

        println!("✅ Installed {} into {:?}/", pkg.name, target_dir);
        Ok(())
    }

    pub fn list_packages(&self) {
        println!("\n📚 === Thitho Gĩtara Module Registry ===");
        println!("{:<24} | {:<10} | {:<12} | {}", "MODULE NAME", "VERSION", "CATEGORY", "DESCRIPTION");
        println!("{}", "-".repeat(95));
        for (name, pkg) in &self.catalog.packages {
            println!(
                "{:<24} | {:<10} | {:<12} | {}",
                name, pkg.version, pkg.category, pkg.description
            );
        }
        println!("{}\n", "-".repeat(95));
    }
}
