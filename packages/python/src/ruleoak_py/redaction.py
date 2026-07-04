from __future__ import annotations
from typing import Any
import re
SECRET_KEY_RE = re.compile(r"(api[_-]?key|token|secret|password|passwd|authorization|cookie|bearer|private[_-]?key)", re.I)
SECRET_VALUE_RE = re.compile(r"(sk-[A-Za-z0-9_-]{8,}|Bearer\s+\S+|-----BEGIN [A-Z ]*PRIVATE KEY-----)")
def redact(value: Any) -> Any:
    if isinstance(value, dict):
        return {str(k): ("[REDACTED]" if SECRET_KEY_RE.search(str(k)) else redact(v)) for k, v in value.items()}
    if isinstance(value, list):
        return [redact(v) for v in value]
    if isinstance(value, str) and SECRET_VALUE_RE.search(value):
        return "[REDACTED]"
    return value
