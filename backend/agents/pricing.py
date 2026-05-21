import json
from google import genai
import os
from core.logger import log_trace
from core.gemini_retry import generate_content_with_retry
from core.gemini_client import MODEL

COMPLEXITY_MULT = {"Basic": 1.0, "Intermediate": 1.35, "Complex": 1.75}
SURGE_MAP       = {"Low": 0, "Medium": 150, "High": 400}
DIST_RATE       = 25  # PKR per km beyond 5 km
LOYALTY_DISC    = 0.05  # 5 %

async def agent_3_price(intent: dict, provider: dict, distance_km: float) -> dict:
    complexity = "Basic"
    try:
        cprompt = (
            f"Classify this service request into exactly one tier: Basic, Intermediate, or Complex.\n"
            f"Service: {intent.get('service_type')}\n"
            f"Details: {intent.get('preferred_time_window', '')}\n"
            f"Return JSON: {{\"tier\": \"...\"}}"
        )
        cr = generate_content_with_retry(
            model=MODEL, contents=cprompt,
            config=genai.types.GenerateContentConfig(
                response_mime_type="application/json", temperature=0.0,
            ),
        )
        complexity = json.loads(cr.text).get("tier", "Basic")
    except Exception:
        complexity = "Intermediate"

    base       = provider.get("base_rate", 1000)
    mult       = COMPLEXITY_MULT.get(complexity, 1.0)
    surge      = SURGE_MAP.get(intent.get("urgency_level", "Medium"), 150)
    dist_sur   = max(0, (distance_km - 5)) * DIST_RATE
    subtotal   = base * mult + surge + dist_sur
    loyalty    = round(subtotal * LOYALTY_DISC)
    final      = round(subtotal - loyalty)

    breakdown_md = (
        f"| Item | Amount (PKR) |\n|---|---|\n"
        f"| Base Rate ({provider.get('name')}) | {base} |\n"
        f"| Complexity ({complexity} ×{mult}) | {round(base*mult - base)} |\n"
        f"| Surge ({intent.get('urgency_level')}) | {surge} |\n"
        f"| Distance Surcharge ({round(distance_km,1)} km) | {round(dist_sur)} |\n"
        f"| Loyalty Discount | -{loyalty} |\n"
        f"| **Final Price** | **{final}** |"
    )

    result = {
        "base_rate": base,
        "complexity_tier": complexity,
        "complexity_multiplier": mult,
        "surge_fee": surge,
        "distance_surcharge": round(dist_sur),
        "loyalty_discount": loyalty,
        "final_price": final,
        "breakdown_md": breakdown_md,
    }

    log_trace(
        "AGENT_3", "PRICING_BREAKDOWN",
        f"Final = ({base} × {mult}) + {surge} + {round(dist_sur)} − {loyalty} = {final}",
        f"Complexity classified as {complexity}. Surge for {intent.get('urgency_level')} urgency.",
        breakdown_md,
    )
    return result
