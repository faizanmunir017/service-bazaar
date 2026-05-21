import json
from core.state import RESPONSE_PATH

async def handle_poll():
    if not RESPONSE_PATH.exists():
        return {"status": "idle", "data": None}
    try:
        with open(RESPONSE_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception:
        # File might be in the middle of a write operation
        return {"status": "idle", "data": None}
        
    if data.get("status") == "processed":
        # Inject additional metadata for the mobile app UI demo
        data["swarm_steps"] = ["Parsing intent", "Matching", "Pricing", "Booking"]
        data["notifications"] = [
            {"type": "sms", "recipient": "user", "status": "sent"},
            {"type": "whatsapp", "recipient": "provider", "status": "delivered"}
        ]
        data["lifecycle"] = ["confirmed", "notified", "en_route", "in_progress", "completed"]
        
    return data
