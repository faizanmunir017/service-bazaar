import json
from google import genai

from core.logger import log_trace
from core.gemini_client import MODEL, describe_api_error
from core.gemini_retry import generate_content_with_retry
from agents.intent_utils import merge_intent, _infer_location_from_text, _infer_service_from_text

INTENT_PROMPT = """You are ServiceBazaar's multilingual intent extraction engine.
The user message may mix English, Urdu, and Roman Urdu freely.

Extract these tokens:
1. service_type – e.g. "AC Repair", "Plumbing", "Electrical Repair", "Math Tutoring"
2. location – Islamabad sector e.g. "G-13", "F-10", "Blue Area"
3. urgency_level – "Low" | "Medium" | "High"
4. preferred_time_window – e.g. "tomorrow morning", "ASAP"
5. price_sensitivity – "Low" | "Medium" | "High"
6. confidence_score – 0.0-1.0
7. clarifying_questions – array of strings (only if service OR sector is still missing)

Rules:
- Use confidence_score >= 0.85 when service_type AND location (sector) are both clear in this message.
- Use confidence_score < 0.70 ONLY for greetings or when service OR sector is still unknown.
- service_type must be specific (e.g. "Electrical Repair"), not vague words like "Repair" alone.
- If the user is only greeting, set confidence below 0.70 and ask what service they need.

App UI language code: "{locale}" (en = English, ur = Urdu).
If locale is "ur", write clarifying_questions entirely in clear, simple Urdu.
If locale is "en", write clarifying_questions in English.

User message: "{raw}"

Return ONLY a JSON object with those 7 keys."""


async def agent_1_parse(
    raw: str,
    locale: str = "en",
    prior_intent: dict | None = None,
) -> dict:
    loc = locale if locale in ("en", "ur") else "en"
    prompt = (
        INTENT_PROMPT.replace("{raw}", raw.replace('"', "'")[:2000])
        .replace("{locale}", loc)
    )
    try:
        resp = generate_content_with_retry(
            model=MODEL,
            contents=prompt,
            config=genai.types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.1,
            ),
        )
        result = json.loads(resp.text)
    except Exception as exc:
        result = _fallback_parse(raw, loc)
        err_desc = describe_api_error(exc)
        result["_fallback"] = err_desc
        print(f"[AGENT_1] {err_desc}. Using keyword parser fallback.")

    result = merge_intent(result, raw, prior_intent)

    log_trace(
        "AGENT_1", "INTENT_PARSE",
        f"confidence_score: {result.get('confidence_score')}  |  locale: {loc}",
        f"Parsed input via {'Gemini' if '_fallback' not in result else 'keyword fallback'}.",
        json.dumps(result, ensure_ascii=False),
    )
    return result


def _fallback_parse(text: str, locale: str = "en") -> dict:
    t = text.lower()
    svc = _infer_service_from_text(text) or "General Service"
    loc_sector = _infer_location_from_text(text)
    if not loc_sector:
        loc_sector = "Islamabad"

    urg = "High" if any(w in t for w in ["urgent", "jaldi", "asap", "abhi", "foran"]) else "Medium"
    ps = "High" if any(w in t for w in ["budget", "sasta", "cheap", "kam", "zyada nahi"]) else "Medium"

    has_service = svc != "General Service"
    has_sector = loc_sector != "Islamabad"
    confidence = 0.82 if (has_service and has_sector) else (0.72 if has_service or has_sector else 0.55)

    questions = []
    if locale == "ur":
        if not has_service:
            questions.append("آپ کو کون سی سروس درکار ہے؟ (مثال: اے سی مرمت، پلمبنگ)")
        if not has_sector:
            questions.append("آپ کس علاقے یا سیکٹر میں ہیں؟ (مثال: جی-13، ایف-7)")
    else:
        if not has_service:
            questions.append("What exact service do you need? (e.g. AC repair, plumbing)")
        if not has_sector:
            questions.append("Which area or sector are you in? (e.g. G-13, F-7)")

    return {
        "service_type": svc,
        "location": loc_sector,
        "urgency_level": urg,
        "preferred_time_window": "flexible",
        "price_sensitivity": ps,
        "confidence_score": confidence,
        "clarifying_questions": questions,
    }
