"""Persist partial intent between clarification turns."""

import json
from core.state import RESPONSE_PATH


def load_prior_intent() -> dict | None:
    if not RESPONSE_PATH.exists():
        return None
    try:
        with open(RESPONSE_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception:
        return None
    if data.get("status") != "clarification_needed":
        return None
    intent = (data.get("data") or {}).get("intent")
    return intent if isinstance(intent, dict) else None


def clear_prior_intent_marker() -> None:
    """No-op placeholder; prior intent is read only while status is clarification_needed."""
    pass
