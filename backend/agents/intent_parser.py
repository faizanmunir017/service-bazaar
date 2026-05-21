import json
from google import genai

from core.logger import log_trace
from core.gemini_client import MODEL, describe_api_error, is_quota_error
from core.gemini_retry import generate_content_with_retry

INTENT_PROMPT = """You are ServiceBazaar's multilingual intent extraction engine.
The user message may mix English, Urdu, and Roman Urdu freely.

Extract these tokens:
1. service_type – e.g. "AC Repair", "Plumbing", "Electrical Repair", "Math Tutoring"
2. location – Islamabad sector e.g. "G-13", "F-10", "Blue Area"
3. urgency_level – "Low" | "Medium" | "High"
4. preferred_time_window – e.g. "tomorrow morning", "ASAP"
5. price_sensitivity – "Low" | "Medium" | "High"
6. confidence_score – 0.0-1.0
7. clarifying_questions – array of strings (populate if confidence < 0.70)

App UI language code: "{locale}" (en = English, ur = Urdu).
If locale is "ur", write clarifying_questions entirely in clear, simple Urdu.
If locale is "en", write clarifying_questions in English.

User message: "{raw}"

Return ONLY a JSON object with those 7 keys."""

async def agent_1_parse(raw: str, locale: str = "en") -> dict:
    loc = locale if locale in ("en", "ur") else "en"
    prompt = INTENT_PROMPT.replace("{raw}", raw).replace("{locale}", loc)
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

    log_trace(
        "AGENT_1", "INTENT_PARSE",
        f"confidence_score: {result.get('confidence_score')}  |  locale: {loc}",
        f"Parsed input via {'Gemini' if '_fallback' not in result else 'keyword fallback'}.",
        json.dumps(result, ensure_ascii=False),
    )
    return result

def _fallback_parse(text: str, locale: str = "en") -> dict:
    t = text.lower()
    svc = "General Service"
    for kw, sv in [("ac","AC Repair"),("plumb","Plumbing"),("pipe","Plumbing"),
                   ("electric","Electrical Repair"),("bijli","Electrical Repair"),
                   ("tutor","General Tutoring"),("teacher","General Tutoring"),
                   ("wiring","Electrical Wiring"),("drain","Drain Cleaning")]:
        if kw in t:
            svc = sv; break
    loc_sector = None
    for lk in ["g-13","g-11","g-9","f-10","f-8","f-7","f-6","blue area",
               "i-8","i-10","h-8","e-11","bahria","dha"]:
        if lk in t:
            loc_sector = lk.upper(); break
    if not loc_sector:
        loc_sector = "Islamabad"

    urg = "High" if any(w in t for w in ["urgent","jaldi","asap","abhi","foran"]) else "Medium"
    ps  = "High" if any(w in t for w in ["budget","sasta","cheap","kam","zyada nahi"]) else "Medium"

    has_service = svc != "General Service"
    has_sector = loc_sector != "Islamabad"
    confidence = 0.82 if (has_service and has_sector) else (0.72 if has_service or has_sector else 0.55)

    questions = []
    if locale == "ur":
        if not has_service:
            questions.append("آپ کو کون سی سروس درکار ہے؟ (مثال: اے سی مرمت، پلمبنگ)")
        if not has_sector:
            questions.append("آپ کس علاقے یا سیکٹر میں ہیں؟ (مثال: جی-13، ایف-7)")
        if confidence < 0.70:
            questions.append("آپ کے لیے کون سا وقت بہتر ہے؟")
    else:
        if not has_service:
            questions.append("What exact service do you need? (e.g. AC repair, plumbing)")
        if not has_sector:
            questions.append("Which area or sector are you in? (e.g. G-13, F-7)")
        if confidence < 0.70:
            questions.append("What time works best for you?")

    return {
        "service_type": svc, "location": loc_sector, "urgency_level": urg,
        "preferred_time_window": "flexible", "price_sensitivity": ps,
        "confidence_score": confidence,
        "clarifying_questions": questions,
    }
