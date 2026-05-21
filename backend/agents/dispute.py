import json
from fastapi import HTTPException
from tools.services import load_providers, update_provider
from core.logger import log_trace
from core.gemini_retry import generate_content_with_retry
from core.gemini_client import MODEL

async def agent_4_dispute(data) -> dict:
    pid = data.provider_id
    prov = None
    for p in load_providers():
        if p["id"] == pid:
            prov = p; break
    if not prov:
        raise HTTPException(404, f"Provider {pid} not found")

    old_rel  = prov.get("reliability_score", 0.5)
    old_risk = prov.get("risk_score", 0.5)
    action   = "none"

    if data.severity == "extreme" or data.rating == 1:
        new_rel  = max(0, old_rel - 0.20)
        new_risk = min(1, old_risk + 0.25)
        action   = "TEMPORARY_BLACKLIST"
    elif data.severity == "high" or data.rating <= 2:
        new_rel  = max(0, old_rel - 0.10)
        new_risk = min(1, old_risk + 0.15)
        action   = "FLAGGED"
    elif data.severity == "medium" or data.rating <= 3:
        new_rel  = max(0, old_rel - 0.05)
        new_risk = min(1, old_risk + 0.05)
        action   = "WARNING"
    else:
        new_rel  = min(1, old_rel + 0.01)
        new_risk = max(0, old_risk - 0.01)
        action   = "POSITIVE_FEEDBACK"

    update_provider(pid, {
        "reliability_score": round(new_rel, 3),
        "risk_score": round(new_risk, 3),
    })

    ai_reply = ""
    try:
        dp = (
            f"A customer filed a complaint about provider '{prov['name']}': "
            f"\"{data.complaint}\". Severity: {data.severity}, Rating: {data.rating}/5. "
            f"Action taken: {action}. Write a brief, empathetic acknowledgement (2-3 sentences)."
        )
        dr = generate_content_with_retry(model=MODEL, contents=dp)
        ai_reply = dr.text.strip()
    except Exception:
        ai_reply = "We've received your feedback and taken appropriate action. Thank you."

    result = {
        "provider_id": pid,
        "provider_name": prov["name"],
        "action": action,
        "reliability_score": {"old": old_rel, "new": round(new_rel, 3)},
        "risk_score": {"old": old_risk, "new": round(new_risk, 3)},
        "ai_response": ai_reply,
    }

    log_trace(
        "AGENT_4", "DISPUTE_RESOLUTION",
        f"Rating: {data.rating}/5  Severity: {data.severity}  Action: {action}",
        f"Reliability {old_rel} → {round(new_rel,3)}, Risk {old_risk} → {round(new_risk,3)}",
        json.dumps(result, ensure_ascii=False, indent=2),
    )
    return result
