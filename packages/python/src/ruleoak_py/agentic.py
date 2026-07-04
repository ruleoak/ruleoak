from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List
import json
import re

from .protocol import validate_protocol_evidence_event

SECRET_KEY_RE = re.compile(r"(api[_-]?key|token|secret|password|passwd|authorization|cookie|bearer|private[_-]?key)", re.I)
SECRET_VALUE_RE = re.compile(r"(sk-[A-Za-z0-9_-]{8,}|Bearer\s+\S+|-----BEGIN [A-Z ]*PRIVATE KEY-----)")
REDACTED = "[REDACTED]"


def redact_value(value: Any) -> Any:
    if isinstance(value, dict):
        return {str(k): (REDACTED if SECRET_KEY_RE.search(str(k)) else redact_value(v)) for k, v in value.items()}
    if isinstance(value, list):
        return [redact_value(v) for v in value]
    if isinstance(value, str) and SECRET_VALUE_RE.search(value):
        return REDACTED
    return value


def validate_evidence_event(event: Dict[str, Any]) -> List[str]:
    result = validate_protocol_evidence_event(event)
    return result["errors"]


def validate_evidence_jsonl_text(text: str) -> Dict[str, Any]:
    events: List[Dict[str, Any]] = []
    errors: List[Dict[str, Any]] = []
    for idx, line in enumerate([ln.strip() for ln in text.splitlines() if ln.strip()], start=1):
        try:
            event = json.loads(line)
        except json.JSONDecodeError as exc:
            errors.append({"line": idx, "errors": [f"invalid JSON: {exc}"]})
            continue
        event_errors = validate_evidence_event(event)
        if event_errors:
            errors.append({"line": idx, "errors": event_errors})
        events.append(event)
    return {"ok": not errors, "events": events, "errors": errors, "lineCount": len(events)}


def read_evidence_jsonl(path: str | Path) -> List[Dict[str, Any]]:
    text = Path(path).read_text(encoding="utf-8")
    result = validate_evidence_jsonl_text(text)
    if not result["ok"]:
        raise ValueError(f"invalid evidence jsonl: {result['errors']}")
    return result["events"]
