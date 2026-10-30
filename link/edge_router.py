"""
Thitho Link: Hardware-Aware Edge Router
Routes inference requests across available local compute tiers (CPU, Mini PC, Raspberry Pi, GPU)
and optimizes latency and memory footprint for offline deployments.
"""

import os
import platform
from dataclasses import dataclass
from enum import Enum
from typing import Any, Dict, Optional

from core.models.quantization import HardwareTargetProfile, HARDWARE_PROFILES


class NodeTier(str, Enum):
    EMBEDDED_IOT = "embedded_iot"          # Raspberry Pi, ESP32 gateway
    MINI_PC_HUB = "mini_pc_hub"            # Intel N100, AMD Ryzen local village/farm server
    WORKSTATION_GPU = "workstation_gpu"    # Local GPU server with NVIDIA RTX / DirectML


@dataclass
class EdgeHardwareStatus:
    node_tier: NodeTier
    cpu_cores: int
    ram_total_gb: float
    ram_available_gb: float
    os_name: str
    active_profile: HardwareTargetProfile
    can_run_full_weights: bool
    recommended_backend: str


class EdgeRouter:
    """
    Monitors host hardware environment and routes inference calls to optimal offline engine.
    """

    def __init__(self):
        self.status = self._detect_hardware()

    def _detect_hardware(self) -> EdgeHardwareStatus:
        cpu_count = os.cpu_count() or 4
        # Total system memory
        try:
            import psutil
            mem = psutil.virtual_memory()
            ram_total_gb = round(mem.total / (1024 ** 3), 1)
            ram_avail_gb = round(mem.available / (1024 ** 3), 1)
        except Exception:
            ram_total_gb = 16.0
            ram_avail_gb = 8.0

        os_name = f"{platform.system()} {platform.release()}"

        # Determine Node Tier
        if ram_total_gb <= 8.5:
            tier = NodeTier.EMBEDDED_IOT
            profile = HARDWARE_PROFILES["edge_pi"]
            can_run_full = False
            backend = "llama.cpp_q4_k_m"
        elif ram_total_gb <= 20.0:
            tier = NodeTier.MINI_PC_HUB
            profile = HARDWARE_PROFILES["mini_pc_cluster"]
            can_run_full = True
            backend = "gguf_q5_k_m_hybrid"
        else:
            tier = NodeTier.WORKSTATION_GPU
            profile = HARDWARE_PROFILES["local_gpu_workstation"]
            can_run_full = True
            backend = "transformers_bnb_4bit"

        return EdgeHardwareStatus(
            node_tier=tier,
            cpu_cores=cpu_count,
            ram_total_gb=ram_total_gb,
            ram_available_gb=ram_avail_gb,
            os_name=os_name,
            active_profile=profile,
            can_run_full_weights=can_run_full,
            recommended_backend=backend,
        )

    def route_request(self, task_type: str, payload_size: int = 1) -> Dict[str, Any]:
        """
        Determine optimal execution path (memory cache -> rule-based -> quantized model).
        """
        return {
            "tier": self.status.node_tier.value,
            "backend": self.status.recommended_backend,
            "use_cache_first": True,
            "max_tokens_budget": 512 if self.status.node_tier == NodeTier.EMBEDDED_IOT else 2048,
        }

    def get_status_dict(self) -> Dict[str, Any]:
        return {
            "node_tier": self.status.node_tier.value,
            "cpu_cores": self.status.cpu_cores,
            "ram_total_gb": self.status.ram_total_gb,
            "ram_available_gb": self.status.ram_available_gb,
            "os_name": self.status.os_name,
            "recommended_backend": self.status.recommended_backend,
            "can_run_full_weights": self.status.can_run_full_weights,
            "profile_notes": self.status.active_profile.notes,
        }
