"""
Thitho Core: Model Quantization & Edge Deployment Protocols
Defines quantization profiles (4-bit NF4, 8-bit int8, GGUF, AWQ, and ONNX)
for Mistral-7B, Llama-3.1-8B, and Aya-23 on constrained edge hardware.
"""

import json
import logging
from dataclasses import asdict, dataclass
from enum import Enum
from pathlib import Path
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)


class FoundationModel(str, Enum):
    MISTRAL_7B = "mistralai/Mistral-7B-v0.3"
    LLAMA_3_1_8B = "meta-llama/Llama-3.1-8B-Instruct"
    AYA_23_8B = "CohereForAI/aya-23-8B"


class QuantizationScheme(str, Enum):
    BITSANDBYTES_4BIT = "bnb_4bit_nf4"
    BITSANDBYTES_8BIT = "bnb_8bit"
    GGUF_Q4_K_M = "gguf_q4_k_m"
    GGUF_Q5_K_M = "gguf_q5_k_m"
    AWQ_4BIT = "awq_4bit"
    ONNX_INT8 = "onnx_int8"


@dataclass
class HardwareTargetProfile:
    target_name: str
    ram_gb: float
    vram_gb: float
    recommended_quant: QuantizationScheme
    recommended_model: FoundationModel
    context_length: int
    notes: str


HARDWARE_PROFILES = {
    "edge_pi": HardwareTargetProfile(
        target_name="Raspberry Pi 5 / 8GB RAM",
        ram_gb=8.0,
        vram_gb=0.0,
        recommended_quant=QuantizationScheme.GGUF_Q4_K_M,
        recommended_model=FoundationModel.MISTRAL_7B,
        context_length=2048,
        notes="Offline CPU-only inference via llama.cpp backend. Expected ~4-6 tokens/sec.",
    ),
    "mini_pc_cluster": HardwareTargetProfile(
        target_name="Intel N100 / AMD Ryzen Mini PC (16GB RAM)",
        ram_gb=16.0,
        vram_gb=0.0,
        recommended_quant=QuantizationScheme.GGUF_Q5_K_M,
        recommended_model=FoundationModel.LLAMA_3_1_8B,
        context_length=4096,
        notes="Ideal for local farm or village hub serving multiple Wi-Fi/LoRa terminals.",
    ),
    "local_gpu_workstation": HardwareTargetProfile(
        target_name="Desktop / Edge Server with NVIDIA RTX (8GB-16GB VRAM)",
        ram_gb=32.0,
        vram_gb=8.0,
        recommended_quant=QuantizationScheme.BITSANDBYTES_4BIT,
        recommended_model=FoundationModel.AYA_23_8B,
        context_length=8192,
        notes="Multilingual foundation with QLoRA adapter for continuous active learning.",
    ),
}


def get_bnb_quantization_config(quant_scheme: QuantizationScheme) -> Dict[str, Any]:
    """Generate Hugging Face BitsAndBytesConfig dictionary."""
    if quant_scheme == QuantizationScheme.BITSANDBYTES_4BIT:
        return {
            "load_in_4bit": True,
            "bnb_4bit_compute_dtype": "bfloat16",
            "bnb_4bit_quant_type": "nf4",
            "bnb_4bit_use_double_quant": True,
        }
    elif quant_scheme == QuantizationScheme.BITSANDBYTES_8BIT:
        return {
            "load_in_8bit": True,
            "llm_int8_threshold": 6.0,
        }
    return {}


def generate_gguf_conversion_guide(model_id: str, output_dir: str) -> str:
    """
    Generate the bash/powershell recipe to convert Hugging Face PyTorch weights
    to GGUF format for llama.cpp execution on local edge nodes.
    """
    script = f"""# ===============================================================
# Thitho GGUF Export Recipe for Offline Edge Execution
# Model: {model_id}
# ===============================================================

# 1. Clone llama.cpp repository
git clone https://github.com/ggerganov/llama.cpp
cd llama.cpp

# 2. Convert Hugging Face directory to FP16 GGUF
python convert_hf_to_gguf.py {output_dir} --outfile {output_dir}/model-fp16.gguf

# 3. Quantize to Q4_K_M (optimal balance between quality and RAM usage on Mini PC / Pi)
./llama-quantize {output_dir}/model-fp16.gguf {output_dir}/model-q4_k_m.gguf Q4_K_M

# 4. Run local offline server without internet
./llama-server -m {output_dir}/model-q4_k_m.gguf --port 8080 --host 0.0.0.0 -c 4096
"""
    return script
