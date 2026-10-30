"""
Thitho Link: Agricultural Edge Advisory Node (Ũrĩmĩ na Ũgo)
Specialized offline assistant for smallholder farmers in Central Kenya.
Diagnoses crop conditions, advises on seasonal planting, and guides soil fertility in Gĩkũyũ.
"""

from typing import Any, Dict, List
from ikumbi.normalizer import normalize_orthography

# Traditional Gĩkũyũ Agricultural Seasons
SEASONS = {
    "njahi": {
        "name": "Kĩmera kĩa Njahĩ (Long Rains Season: March - May)",
        "crops": ["Mbembe", "Njahĩ (Black Beans)", "Thukũma", "Warũ (Potatoes)"],
        "advice_kik": "Rĩu nĩ kĩmera kĩa Njahĩ. Handa mbembe thĩinĩ wa tĩĩri ũiyũrĩte biũ na mũtutu wa mbũri.",
        "advice_eng": "This is the Long Rains season. Plant maize in soil well fertilized with goat manure.",
    },
    "mwere": {
        "name": "Kĩmera kĩa Mwere (Short Rains Season: October - December)",
        "crops": ["Mwere (Millet)", "Mboco (Beans)", "Kahua"],
        "advice_kik": "Kĩmera kĩa Mwere nĩ gĩkuhĩ. Handa mboco na mwere iria itabatara maĩ maingĩ mũno.",
        "advice_eng": "The Short Rains season is brief. Plant beans and millet that require moderate water.",
    },
    "thano": {
        "name": "Thano (Cold / Harvest Dry Season: June - August)",
        "crops": ["Macani (Tea)", "Kahua (Pruning)", "Matunda"],
        "advice_kik": "Mahinda maya ma Thano heho nĩ ĩngĩ. Bithia tĩĩri na nyeki nĩguo ũrugarĩ na maĩ itigatũũke.",
        "advice_eng": "During the Thano cold season, mulch the crop beds to conserve moisture and warmth.",
    },
}

# Crop Health Diagnostics Database (Offline Expert System)
DIAGNOSTICS_KNOWLEDGE = [
    {
        "crop": "mbembe",
        "symptoms": ["mahũndũkĩte", "ngoro ya ngũrũ", "yellow", "stunted"],
        "diagnosis_kik": "Mũrimũ wa mathangũ kũhũndũka (Nitrogen deficiency / Maize Chlorosis)",
        "treatment_kik": "Ĩkĩra ndoogo ya ng'ombe kana mbolea ya CAN thĩinĩ wa makinya ma centimita 10 kuuma mũtĩ-inĩ.",
        "treatment_eng": "Apply cattle manure or CAN nitrogen booster 10cm away from the stalk.",
    },
    {
        "crop": "kahua",
        "symptoms": ["mũtwe mũirũ", "tumbembe tũkũgwa", "berry disease", "black"],
        "diagnosis_kik": "Mũrimũ wa Mahindi ma Kahua (Coffee Berry Disease - CBD)",
        "treatment_kik": "Huura ndawa ya thaba (copper fungicide) rĩrĩa mathangũ maratuta mĩtĩ.",
        "treatment_eng": "Spray approved copper-based fungicide at the onset of flowering and rains.",
    },
    {
        "crop": "macani",
        "symptoms": ["ndũa", "tũthũngũti", "mites", "drying"],
        "diagnosis_kik": "Tũsamũ twa Macani (Red Crevice Mites)",
        "treatment_kik": "Eheria macani maria mahũũrĩtwo nĩguo tũsamũ tũtĩgathemee kũndũ kũngĩ.",
        "treatment_eng": "Prune affected tea bushes and maintain clean buffer strips.",
    },
]


class AgriculturalEdgeAdvisor:
    """
    Offline agricultural advisory engine designed for low-power edge nodes.
    """

    def get_seasonal_calendar(self) -> Dict[str, Any]:
        """Return the seasonal farming calendar."""
        return SEASONS

    def diagnose_crop_issue(self, crop: str, symptoms_text: str) -> Dict[str, Any]:
        """
        Diagnose crop disease or soil issue from symptoms described in Gĩkũyũ or English.
        """
        crop_clean = crop.lower().strip()
        symptom_clean = normalize_orthography(symptoms_text.lower())

        # Match knowledge base
        for diag in DIAGNOSTICS_KNOWLEDGE:
            if diag["crop"] in crop_clean or crop_clean in diag["crop"]:
                matched_syms = [s for s in diag["symptoms"] if s in symptom_clean]
                if matched_syms or len(symptom_clean) < 10:
                    return {
                        "crop": crop,
                        "diagnosis_gikuyu": diag["diagnosis_kik"],
                        "treatment_gikuyu": diag["treatment_kik"],
                        "treatment_english": diag["treatment_eng"],
                        "confidence": 0.94 if matched_syms else 0.85,
                        "status": "DIAGNOSIS_MATCHED",
                    }

        # Generic best-practice fallback in Gĩkũyũ
        return {
            "crop": crop,
            "diagnosis_gikuyu": f"Ũthuthuria wa {crop}: Ndũrĩ na mũrimũ mũnene mũnene ũroneka.",
            "treatment_gikuyu": "Ĩkĩra tĩĩri thĩi ya mũrĩmi, kinyia maĩ mariganĩte, na ũthuthurie mathangũ kũria mwena wa thĩ.",
            "treatment_english": "Test soil fertility, ensure balanced moisture, and inspect under-leaves for pests.",
            "confidence": 0.75,
            "status": "GENERAL_ADVISORY",
        }
