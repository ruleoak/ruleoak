from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List

from .core import verify_evidence


def replay_jsonl_text(text: str) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    for idx, line in enumerate([ln for ln in text.splitlines() if ln.strip()], start=1):
        ev = json.loads(line)
        out.append({
            "index": ev.get("index", idx),
            "type": ev.get("action", {}).get("type") or ev.get("action", {}).get("action"),
            "decision": ev.get("decision", {}).get("action"),
            "actor": ev.get("action", {}).get("metadata", {}).get("actor"),
            "hash": ev.get("hash"),
        })
    return out


def replay_jsonl(path) -> List[Dict[str, Any]]:
    return replay_jsonl_text(Path(path).read_text(encoding="utf-8"))


def verify_jsonl_text(text: str) -> Dict[str, Any]:
    events = [json.loads(line) for line in text.splitlines() if line.strip()]
    return verify_evidence(events)


def verify_jsonl(path) -> Dict[str, Any]:
    return verify_jsonl_text(Path(path).read_text(encoding="utf-8"))
