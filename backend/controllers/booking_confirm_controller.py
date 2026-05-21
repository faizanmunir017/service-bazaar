import json
from datetime import datetime
from fastapi import HTTPException

from core.state import RESPONSE_PATH
from core.orchestrator import execute_payment_and_ledger, _write_json


async def confirm_pending_booking() -> dict:
    if not RESPONSE_PATH.exists():
        raise HTTPException(status_code=404, detail="No pending quote found.")

    try:
        with open(RESPONSE_PATH, "r", encoding="utf-8") as f:
            pending = json.load(f)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not read pending quote: {exc}") from exc

    if pending.get("status") != "awaiting_confirmation":
        raise HTTPException(
            status_code=400,
            detail=f"Nothing to confirm (current status: {pending.get('status', 'unknown')}).",
        )

    payload = pending.get("data") or {}
    state = {
        "parsed_intent":  payload.get("intent"),
        "matching_data":  payload.get("match"),
        "pricing_data":   payload.get("pricing"),
        "raw_input":      payload.get("raw_input", ""),
        "locale":         payload.get("locale", "en"),
    }

    if not all([state["parsed_intent"], state["matching_data"], state["pricing_data"]]):
        raise HTTPException(status_code=400, detail="Incomplete quote data.")

    result = await execute_payment_and_ledger(state)
    response = {
        "status": "processed",
        "data": {
            "booking_id":  result["booking_id"],
            "intent":      state["parsed_intent"],
            "match":       state["matching_data"],
            "pricing":     state["pricing_data"],
            "payment":     result["payment"],
            "booking":     result["booking"],
            "swarm_steps": payload.get("swarm_steps", []) + ["PROCESS_BOOKING"],
        },
        "timestamp": datetime.now().isoformat(),
    }
    _write_json(RESPONSE_PATH, response)
    return response


async def cancel_pending_booking() -> dict:
    _write_json(RESPONSE_PATH, {
        "status": "cancelled",
        "data": {"message": "Booking was not confirmed by the user."},
        "timestamp": datetime.now().isoformat(),
    })
    return {"status": "cancelled", "message": "Quote dismissed."}
