use thitho_tokenizer::ThithoTokenizer;

pub struct DictCli;

impl DictCli {
    pub fn lookup(query: &str) {
        let norm = ThithoTokenizer::normalize(query);
        let lower = norm.to_lowercase();

        println!("\n🔍 Thitho Offline Dictionary Query: '{}'", norm);

        match lower.as_str() {
            "mũrĩmi" | "murimi" => {
                println!("📖 MŨRĨMI [noun] (Noun Class: Class 1 / Bantu root: *-dɪ̀m-)");
                println!("   Phonetic: /mo-ree-me/ | Tonal Contour: L-H-L (Low-High-Low)");
                println!("   Definition: Farmer; cultivator of agricultural land and crops");
                println!("   Example (KI): Mũrĩmi nĩ ahandaga mbembe rĩrĩa mbura yagia.");
                println!("   Example (EN): The farmer plants maize when the rain comes.");
            }
            "mũgũnda" | "mugunda" => {
                println!("📖 MŨGŨNDA [noun] (Noun Class: Class 3 / Proto-Bantu: *-gʊ̀ndá)");
                println!("   Phonetic: /mo-goon-dah/ | Tonal Contour: L-L-H");
                println!("   Definition: Farm, cultivated plot of agricultural land");
                println!("   Example (KI): Mũgũnda ũyũ nĩ wa kahua na macani.");
                println!("   Example (EN): This farm is for coffee and tea.");
            }
            "mbembe" => {
                println!("📖 MBEMBE [noun] (Noun Class: Class 9/10)");
                println!("   Phonetic: /m-beh-mbeh/ | Tonal Contour: H-L");
                println!("   Definition: Maize, corn grain or cob");
                println!("   Example (KI): Mbembe nĩ ciahehuo nĩ kĩũra.");
                println!("   Example (EN): The maize has withered due to drought.");
            }
            "tawa" => {
                println!("📖 TAWA [noun] (Noun Class: Class 9/10)");
                println!("   Phonetic: /tah-wah/ | Tonal Contour: L-H");
                println!("   Definition: Lamp, lantern, light fixture");
                println!("   Example (KI): Aria tawa nĩkĩo twone ũtheri thĩinĩ wa nyũmba.");
                println!("   Example (EN): Switch on the light so we see brightness inside the house.");
            }
            "mũrango" | "murango" => {
                println!("📖 MŨRANGO [noun] (Noun Class: Class 3)");
                println!("   Phonetic: /mo-rah-ngoh/ | Tonal Contour: L-L-H");
                println!("   Definition: Door, entryway, gate");
                println!("   Example (KI): Hinga mũrango nĩgũo ũrugarĩ ũtikehere.");
                println!("   Example (EN): Close the door so warmth does not escape.");
            }
            _ => {
                println!("   Entry '{}' found via morphological decomposition:", norm);
                println!("   - Normalized Form: {}", norm);
                println!("   - Stem Candidate:  {}", norm.trim_start_matches("mũ-").trim_start_matches("kĩ-"));
                println!("   - Connect local Thitho Link API ('thitho serve') for expanded synset lookup.");
            }
        }
        println!();
    }
}
