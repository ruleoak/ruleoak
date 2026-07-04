from __future__ import annotations
from pathlib import Path
from typing import Any, Dict, List
import json
class MemorySink:
    def __init__(self): self.events: List[Dict[str, Any]] = []
    def write(self, event: Dict[str, Any]): self.events.append(event); return event
    def list(self): return list(self.events)
class JsonlSink:
    def __init__(self, path): self.path = Path(path); self.path.parent.mkdir(parents=True, exist_ok=True)
    def write(self, event: Dict[str, Any]):
        with self.path.open("a", encoding="utf-8") as f: f.write(json.dumps(event, separators=(",", ":")) + "\n")
        return event
class NullSink:
    def write(self, event: Dict[str, Any]): return event
class RotatingJsonlSink(JsonlSink):
    def __init__(self, path, max_bytes: int = 1_000_000): super().__init__(path); self.max_bytes = max_bytes
    def write(self, event):
        if self.path.exists() and self.path.stat().st_size > self.max_bytes:
            self.path.rename(self.path.with_suffix(self.path.suffix + ".1"))
        return super().write(event)
