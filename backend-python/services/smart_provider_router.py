"""Smart Provider Router for High Availability AI Engine Cascade.
Tracks response time, success rate, failure rate, and rate-limit events.
Automatically sorts and selects the fastest healthy AI provider.
"""

import time
import statistics
from typing import Dict, List, Tuple, Any, Callable

class ProviderStats:
    def __init__(self, provider_id: str, default_latency: float):
        self.provider_id = provider_id
        self.total_calls = 0
        self.success_calls = 0
        self.failure_calls = 0
        self.rate_limit_events = 0
        self.latencies: List[float] = [default_latency]
        self.cooldown_until: float = 0.0

    @property
    def avg_latency(self) -> float:
        if not self.latencies:
            return 15.0
        return float(statistics.mean(self.latencies[-10:]))

    @property
    def success_rate(self) -> float:
        if self.total_calls == 0:
            return 100.0
        return (self.success_calls / self.total_calls) * 100.0

    def is_in_cooldown(self) -> bool:
        return time.time() < self.cooldown_until

class SmartProviderRouter:
    _instance = None

    def __init__(self):
        self.stats: Dict[str, ProviderStats] = {
            "HuggingFace IDM-VTON": ProviderStats("HuggingFace IDM-VTON", default_latency=12.0),
            "Replicate IDM-VTON": ProviderStats("Replicate IDM-VTON", default_latency=14.0),
            "Gemini Compositing": ProviderStats("Gemini Compositing", default_latency=6.0),
            "Gemini Imagen 3": ProviderStats("Gemini Imagen 3", default_latency=11.0),
            "OpenAI DALL-E 3": ProviderStats("OpenAI DALL-E 3", default_latency=18.0),
        }

    @classmethod
    def get_instance(cls) -> "SmartProviderRouter":
        if cls._instance is None:
            cls._instance = SmartProviderRouter()
        return cls._instance

    def get_stats(self, provider_name: str) -> ProviderStats:
        if provider_name not in self.stats:
            self.stats[provider_name] = ProviderStats(provider_name, default_latency=15.0)
        return self.stats[provider_name]

    def record_success(self, provider_name: str, latency_sec: float):
        st = self.get_stats(provider_name)
        st.total_calls += 1
        st.success_calls += 1
        st.latencies.append(latency_sec)
        if len(st.latencies) > 15:
            st.latencies.pop(0)
        st.cooldown_until = 0.0
        print(f"[SMART-ROUTER] Recorded SUCCESS for {provider_name} ({latency_sec:.1f}s | Avg: {st.avg_latency:.1f}s | Rate: {st.success_rate:.1f}%)")

    def record_failure(self, provider_name: str, is_rate_limit: bool = False):
        st = self.get_stats(provider_name)
        st.total_calls += 1
        st.failure_calls += 1
        if is_rate_limit:
            st.rate_limit_events += 1
            st.cooldown_until = time.time() + 60.0  # 1 min cooldown for 429
            print(f"[SMART-ROUTER] Recorded RATE-LIMIT (429) for {provider_name}. Placed on 60s cooldown.")
        else:
            # Short 15s cooldown on consecutive failures
            st.cooldown_until = time.time() + 15.0
            print(f"[SMART-ROUTER] Recorded FAILURE for {provider_name}. Placed on 15s cooldown.")

    def order_engines(self, candidate_engines: List[Tuple[str, Callable, float]], speed_mode: str) -> List[Tuple[str, Callable, float]]:
        """Sort candidate engines respecting the strict production cascade priority:
        HuggingFace (Tokens 1-4) -> Replicate IDM-VTON -> Gemini -> OpenAI DALL-E 3.
        Healthy engines are prioritized first; engines on cooldown are appended as retries.
        """
        priority_map = {
            "HuggingFace IDM-VTON": 1,
            "Replicate IDM-VTON": 2,
            "Gemini Compositing": 3,
            "Gemini Imagen 3": 4,
            "OpenAI DALL-E 3": 5
        }

        healthy: List[Tuple[str, Callable, float]] = []
        cooldown: List[Tuple[str, Callable, float]] = []

        for name, func, timeout in candidate_engines:
            st = self.get_stats(name)
            if st.is_in_cooldown():
                cooldown.append((name, func, timeout))
            else:
                healthy.append((name, func, timeout))

        # Sort by strict cascade priority, then by success rate / latency
        healthy.sort(key=lambda x: (priority_map.get(x[0], 99), -self.get_stats(x[0]).success_rate))
        cooldown.sort(key=lambda x: priority_map.get(x[0], 99))

        return healthy + cooldown
