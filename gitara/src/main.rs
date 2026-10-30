mod dict_cli;
mod modules;
mod registry;
mod translate_cli;

use clap::{Parser, Subcommand};
use dict_cli::DictCli;
use modules::ModuleManager;
use std::path::PathBuf;
use translate_cli::TranslateCli;

#[derive(Parser)]
#[command(
    name = "thitho",
    author = "Thitho Ecosystem Maintainers",
    version = "1.0.0",
    about = "Thitho Gĩtara: Complete Offline-First Package Manager & CLI for the Gikuyu Language"
)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Initialize a new Gikuyu offline-first application workspace
    Init {
        #[arg(default_value = ".")]
        path: PathBuf,
    },

    /// Install a module from the Thitho Gĩtara registry (e.g. dict/agri, model/lora-agri, ui/components)
    Install {
        /// Package identifier (e.g., dict/core, model/lora-agri, ui/components)
        package: String,
        #[arg(short, long, default_value = ".")]
        target: PathBuf,
    },

    /// List all packages available in the Thitho Gĩtara registry
    List,

    /// Query the offline Gikuyu dictionary for headwords, phonetics, and tonal patterns
    Dict {
        /// Word to look up (e.g., 'mũrĩmi', 'mũgũnda', 'tawa')
        word: String,
    },

    /// Offline bidirectional translation between Gikuyu and English
    Translate {
        /// Text to translate
        text: String,
        #[arg(long, default_value = "kik_Latn")]
        from: String,
        #[arg(long, default_value = "eng_Latn")]
        to: String,
    },

    /// Launch the local Thitho Link API bridge (REST & GraphQL)
    Serve {
        #[arg(short, long, default_value_t = 8000)]
        port: u16,
    },
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let cli = Cli::parse();
    let manager = ModuleManager::new();

    match cli.command {
        Commands::Init { path } => {
            println!("🌿 Initializing Thitho workspace at {:?}...", path);
            ModuleManager::init_project(&path)?;
        }
        Commands::Install { package, target } => {
            manager.install_package(&package, &target)?;
        }
        Commands::List => {
            manager.list_packages();
        }
        Commands::Dict { word } => {
            DictCli::lookup(&word);
        }
        Commands::Translate { text, from, to } => {
            TranslateCli::translate(&text, &from, &to);
        }
        Commands::Serve { port } => {
            println!("🚀 Launching Thitho Link API Bridge on http://127.0.0.1:{}...", port);
            println!("   Running: python -m link.app");
            // Invoke python link.app
            let mut child = std::process::Command::new("python")
                .args(["-m", "link.app"])
                .spawn()?;
            child.wait()?;
        }
    }

    Ok(())
}
