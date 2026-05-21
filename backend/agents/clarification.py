import json
from google import genai

from core.logger import log_trace
from core.gemini_client import MODEL, describe_api_error
from core.gemini_retry import generate_content_with_retry

CLARIFICATION_PROMPT = """You are ServiceBazaar's friendly service assistant for Islamabad home services.
The user writes in English, Urdu, or Roman Urdu. App UI language: "{locale}" (en or ur).

User message:
"{raw}"

Parsed intent snapshot (may be incomplete):
{intent_json}

Suggested missing-detail prompts from the parser (reference only, do not copy verbatim if unnatural):
{questions_json}

Write a short, warm reply in the app UI language ({locale}).
- If the user is only greeting or making small talk, respond naturally and invite them to describe what service they need.
- If details are missing for booking, explain clearly what is still needed.
- Never claim a booking is confirmed.
- Keep under 120 words.

Return ONLY JSON:
{{
  "message": "your full reply to show in chat",
  "missing_items": ["bullet 1", "bullet 2"]
}}
missing_items: short labels of what is missing (empty array if only a greeting / no gaps)."""


def _fallback_clarification(raw: str, intent: dict, locale: str) -> dict:
    loc = locale if locale in ("en", "ur") else "en"
    t = raw.lower().strip()
    greeting_words = (
        "hi", "hello", "hey", "salam", "assalam", "aoa", "kia hal", "kaise ho",
        "good morning", "good evening", "thanks", "thank you", "shukriya",
    )
    is_greeting = len(t) < 40 and any(w in t for w in greeting_words)

    questions = intent.get("clarifying_questions") or []
    missing = [q for q in questions if isinstance(q, str) and q.strip()]

    if is_greeting and not missing:
        if loc == "ur":
            message = (
                "وعلیکم السلام! ServiceBazaar میں خوش آمدید۔ "
                "بتائیں آپ کو کون سی سروس چاہیے — جیسے بجلی، پلمبنگ، یا اے سی مرمت — اور کس سیکٹر میں ہیں۔"
            )
        else:
            message = (
                "Hello! Welcome to ServiceBazaar. "
                "Tell me what service you need — plumbing, electrical, AC repair, etc. — "
                "and which Islamabad sector you're in."
            )
        return {"message": message, "missing_items": []}

    if loc == "ur":
        intro = "بکنگ کے لیے تھوڑی مزید معلومات درکار ہے۔"
        hint = "نیچے اپنی تفصیل لکھ کر بھیجیں۔"
    else:
        intro = "I need a few more details before I can match a technician."
        hint = "Please type your answer below and send."

    message = f"{intro} {hint}"
    if not missing:
        missing = (
            ["سروس کی قسم", "علاقہ / سیکٹر"]
            if loc == "ur"
            else ["Type of service", "Area / sector"]
        )

    return {"message": message, "missing_items": missing[:5]}


async def generate_clarification_response(
    raw: str,
    intent: dict,
    locale: str = "en",
) -> dict:
    loc = locale if locale in ("en", "ur") else "en"
    questions = intent.get("clarifying_questions") or []

    prompt = (
        CLARIFICATION_PROMPT.replace("{locale}", loc)
        .replace("{raw}", raw.replace('"', "'")[:2000])
        .replace("{intent_json}", json.dumps(intent, ensure_ascii=False, default=str)[:3000])
        .replace("{questions_json}", json.dumps(questions, ensure_ascii=False))
    )

    try:
        resp = generate_content_with_retry(
            model=MODEL,
            contents=prompt,
            config=genai.types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.35,
            ),
        )
        result = json.loads(resp.text)
        message = (result.get("message") or "").strip()
        missing = result.get("missing_items") or []
        if not isinstance(missing, list):
            missing = []
        missing = [str(x).strip() for x in missing if str(x).strip()][:6]
        if not message:
            raise ValueError("Empty clarification message from model")
        if not missing and questions:
            missing = [str(q).strip() for q in questions if str(q).strip()][:5]
        out = {"message": message, "missing_items": missing}
    except Exception as exc:
        print(f"[CLARIFICATION] {describe_api_error(exc)} — using fallback.")
        out = _fallback_clarification(raw, intent, loc)
        out["_fallback"] = True

    log_trace(
        "AGENT_CLARIFY",
        "CLARIFICATION_REPLY",
        f"locale: {loc}  |  items: {len(out.get('missing_items', []))}",
        "Generated user-facing clarification.",
        json.dumps(out, ensure_ascii=False),
    )
    return out
