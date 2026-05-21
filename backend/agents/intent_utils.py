"""Intent merge, enrichment, and bookability checks for fast booking flow."""

from __future__ import annotations

import re
from typing import Any

GENERIC_SERVICE_VALUES = frozenset({
    "",
    "null",
    "none",
    "general service",
    "service",
    "repair",
    "general repair",
    "basic repair",
    "fix",
    "help",
    "other",
})

VAGUE_LOCATION_VALUES = frozenset({
    "",
    "null",
    "none",
    "unknown",
    "islamabad",
})

SERVICE_KEYWORDS: list[tuple[str, str]] = [
    ("electrical", "Electrical Repair"),
    ("electrician", "Electrical Repair"),
    ("bijli", "Electrical Repair"),
    ("wiring", "Electrical Wiring"),
    ("plumb", "Plumbing"),
    ("pipe", "Plumbing"),
    ("leak", "Plumbing"),
    ("ac repair", "AC Repair"),
    ("a/c", "AC Repair"),
    ("air condition", "AC Repair"),
    ("cooling", "AC Repair"),
    ("tutor", "General Tutoring"),
    ("drain", "Drain Cleaning"),
    ("appliance", "Appliance Repair"),
    ("generator", "Generator Repair"),
]

SECTOR_PATTERN = re.compile(
    r"\b([efgih]-?\s?\d{1,2}|blue\s*area|bahria|dha)\b",
    re.IGNORECASE,
)


def _norm(s: Any) -> str:
    if s is None:
        return ""
    t = str(s).strip()
    if t.lower() in ("null", "none"):
        return ""
    return t


def _is_specific_service(service: str) -> bool:
    s = _norm(service).lower()
    return bool(s) and s not in GENERIC_SERVICE_VALUES


def _is_specific_location(location: str) -> bool:
    loc = _norm(location)
    if not loc:
        return False
    if loc.lower() in VAGUE_LOCATION_VALUES:
        return False
    if SECTOR_PATTERN.search(loc):
        return True
    return len(loc) > 3 and loc.lower() != "islamabad"


def _infer_service_from_text(text: str) -> str | None:
    t = text.lower()
    for kw, svc in SERVICE_KEYWORDS:
        if kw in t:
            return svc
    if "repair" in t:
        if any(w in t for w in ("ac", "cool", "air")):
            return "AC Repair"
        if any(w in t for w in ("wire", "electric", "bijli", "light", "socket")):
            return "Electrical Repair"
        if any(w in t for w in ("pipe", "water", "tap", "drain")):
            return "Plumbing"
        if "generator" in t or "jenretar" in t:
            return "Generator Repair"
    return None


def _infer_location_from_text(text: str) -> str | None:
    m = SECTOR_PATTERN.search(text)
    if m:
        raw = m.group(1).upper().replace(" ", "")
        if len(raw) >= 2 and raw[0] in "EFGHI" and "-" not in raw:
            return f"{raw[0]}-{raw[1:]}"
        return raw.replace(" ", " ").title()
    return None


def merge_intent(
    parsed: dict,
    raw: str,
    prior: dict | None = None,
) -> dict:
    """Merge new parse with prior partial intent from last clarification (if any)."""
    out = dict(parsed or {})
    prior = prior or {}

    for src in (prior, out):
        if _is_specific_service(_norm(src.get("service_type"))):
            if not _is_specific_service(_norm(out.get("service_type"))):
                out["service_type"] = _norm(src["service_type"])
            break

    for src in (prior, out):
        if _is_specific_location(_norm(src.get("location"))):
            if not _is_specific_location(_norm(out.get("location"))):
                out["location"] = _norm(src["location"])
            break

    if not _is_specific_service(_norm(out.get("service_type"))):
        inferred = _infer_service_from_text(raw)
        if inferred:
            out["service_type"] = inferred

    if not _is_specific_location(_norm(out.get("location"))):
        inferred_loc = _infer_location_from_text(raw)
        if inferred_loc:
            out["location"] = inferred_loc

    if not _norm(out.get("urgency_level")):
        out["urgency_level"] = prior.get("urgency_level") or "Medium"
    if not _norm(out.get("preferred_time_window")):
        out["preferred_time_window"] = prior.get("preferred_time_window") or "ASAP"
    if not _norm(out.get("price_sensitivity")):
        out["price_sensitivity"] = prior.get("price_sensitivity") or "Medium"

    if intent_is_bookable(out):
        out["confidence_score"] = max(float(out.get("confidence_score") or 0), 0.88)
        out["clarifying_questions"] = []
    else:
        try:
            out["confidence_score"] = float(out.get("confidence_score") or 0.5)
        except (TypeError, ValueError):
            out["confidence_score"] = 0.5

    return out


def intent_is_bookable(intent: dict | None) -> bool:
    if not intent:
        return False
    return _is_specific_service(intent.get("service_type")) and _is_specific_location(
        intent.get("location")
    )


def should_raise_clarification(intent: dict | None) -> bool:
    """Only block the pipeline when we truly cannot match yet."""
    if intent_is_bookable(intent):
        return False
    conf = float((intent or {}).get("confidence_score") or 0)
    if conf < 0.70:
        return True
    svc = _norm((intent or {}).get("service_type"))
    loc = _norm((intent or {}).get("location"))
    return not svc or not loc
