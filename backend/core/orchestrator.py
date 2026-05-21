import json
import uuid
import asyncio
from datetime import datetime
from google import genai
import os

from core.state import REQUEST_PATH, RESPONSE_PATH
from core.logger import log_trace
from tools.services import append_booking, process_payment, send_sms, send_whatsapp, load_providers
from agents.intent_parser import agent_1_parse
from core.gemini_client import MODEL, USE_RULE_ORCHESTRATOR, describe_api_error, is_quota_error
from core.gemini_retry import generate_content_with_retry
from agents.matcher import agent_2_match, rollback_to_runner_up
from agents.pricing import agent_3_price

ORCHESTRATOR_PROMPT = """You are the ServiceBazaar Antigravity Swarm Orchestrator.
Your job is to drive an informal-economy service request through its full lifecycle
by reading the live system state and choosing the next action.

Current System State:
{state}

Action History (steps already completed this cycle):
{history}

Available Swarm Actions:
1. "RUN_INTENT_PARSER"    — Parse the raw user input into structured fields.
                             Use this FIRST if parsed_intent is null.
2. "TRIGGER_MATCHER"      — Match providers. Use this once parsed_intent exists
                             and matching_data is null.
3. "CALCULATE_PRICING"    — Compute itemised price. Use this once matching_data
                             is populated with a selected provider.
4. "PROCESS_BOOKING"      — Execute payment and write ledger entry. Use this once
                             pricing_data is ready and booking_status is still pending.
5. "TRIGGER_ROLLBACK"     — Auto-assign the runner-up provider. Use this ONLY when
                             payment_result shows a FAILED status.
6. "RAISE_CLARIFICATION"  — Halt and ask the user a clarifying question. Use this
                             when confidence_score < 0.70 or critical fields are missing.
7. "COMPLETE_CYCLE"       — Finalise and exit. Use this ONLY when booking_status is
                             'confirmed' or 'rollback_assigned', never prematurely.

Decision Rules:
- Read the state carefully before choosing. Do NOT repeat an action already in history
  unless the state changed in a way that justifies it (e.g. rollback after failed payment).
- If matching_data has status 'no_match', go to RAISE_CLARIFICATION.
- If booking_status is 'payment_failed', go to TRIGGER_ROLLBACK.
- If booking_status is 'rollback_assigned', go to COMPLETE_CYCLE.

You MUST return a JSON object with exactly these three keys:
{{
    "reasoning_trace": "Detailed paragraph explaining why you chose this action based on the current state values...",
    "next_action": "<ONE_OF_THE_7_ACTIONS>",
    "updated_context_notes": "Any insight you want passed to the next stage"
}}"""

MAX_SWARM_ITERATIONS = 10

def _clarification_intro_note(locale: str) -> str:
    """User-facing clarification intro in the app UI language."""
    texts = {
        "ur": (
            "ہمیں درست ٹیکنیشن بھیجنے کے لیے مزید معلومات درکار ہیں۔ "
            "براہ کرم ذیل میں سے ایک سوال کا جواب منتخب کریں یا نیچے تفصیل لکھیں۔"
        ),
        "en": (
            "We need a bit more detail to match the right technician. "
            "Please tap one of the suggestions below or type your answer in the box."
        ),
    }
    key = locale if locale in texts else "en"
    return texts[key]

def _write_json(path, obj):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, indent=2, ensure_ascii=False)

async def execute_payment_and_ledger(state: dict) -> dict:
    intent   = state["parsed_intent"]
    match    = state["matching_data"]
    pricing  = state["pricing_data"]
    sel      = match["selected"]
    raw_text = state["raw_input"]

    booking_id = f"BK-{uuid.uuid4().hex[:8].upper()}"
    payment    = process_payment(booking_id, pricing["final_price"])

    booking_row = {
        "booking_id":    booking_id,
        "timestamp":     datetime.now().isoformat(),
        "customer_query": raw_text,
        "service_type":  intent.get("service_type"),
        "provider_id":   sel["id"],
        "provider_name": sel["name"],
        "quoted_price":  pricing["final_price"],
        "status":        "confirmed" if payment["status"] == "SUCCESS" else "payment_hold",
        "payment_status": payment["status"],
        "location":      intent.get("location"),
        "urgency":       intent.get("urgency_level"),
    }
    append_booking(booking_row)
    send_sms(
        sel["name"],
        f"New job #{booking_id}: {intent.get('service_type')} at {intent.get('location')}"
    )
    send_whatsapp(
        "Customer",
        f"Your booking #{booking_id} is confirmed! {sel['name']} is on the way."
    )

    log_trace(
        "AGENT_PAYMENT", "LEDGER_WRITE",
        f"Payment status: {payment['status']}  |  Booking ID: {booking_id}",
        "Payment processed and booking row appended to ledger.",
        json.dumps(booking_row, ensure_ascii=False, indent=2),
    )
    return {"payment": payment, "booking": booking_row, "booking_id": booking_id}

def _fallback_orchestrate(state: dict) -> dict:
    history = state.get("history", [])

    if state.get("parsed_intent") is None:
        return {
            "reasoning_trace": "Parsed intent is null. Automatically falling back to RUN_INTENT_PARSER action to parse raw request.",
            "next_action": "RUN_INTENT_PARSER",
            "updated_context_notes": "Executing backup parsing subroutine (parsed_intent not yet available)."
        }

    parsed = state.get("parsed_intent") or {}
    if parsed.get("confidence_score", 1.0) < 0.70 and "RAISE_CLARIFICATION" not in history:
        return {
            "reasoning_trace": "Parsed intent confidence score is below 0.70. Raising clarifying questions to resolve user intent.",
            "next_action": "RAISE_CLARIFICATION",
            "updated_context_notes": "Clarification loop triggered by low confidence fallback."
        }

    if state.get("matching_data") is None:
        return {
            "reasoning_trace": "Provider matching has not run yet. Invoking TRIGGER_MATCHER to search the provider directory.",
            "next_action": "TRIGGER_MATCHER",
            "updated_context_notes": "Executing matching filters."
        }

    match = state.get("matching_data") or {}
    if match.get("status") != "matched" and "RAISE_CLARIFICATION" not in history:
        return {
            "reasoning_trace": "No matching providers found in the system. Halting to request details.",
            "next_action": "RAISE_CLARIFICATION",
            "updated_context_notes": "No providers available fallback."
        }

    if state.get("pricing_data") is None:
        return {
            "reasoning_trace": "Selected provider matched but price not calculated. Invoking CALCULATE_PRICING to generate itemized invoice.",
            "next_action": "CALCULATE_PRICING",
            "updated_context_notes": "Pricing engine dispatch."
        }

    if state.get("booking_status") == "pending":
        return {
            "reasoning_trace": "Pricing is finalized. Proceeding to PROCESS_BOOKING to run transaction and save to append-only ledger.",
            "next_action": "PROCESS_BOOKING",
            "updated_context_notes": "Payment gateway processing."
        }

    if state.get("booking_status") == "payment_failed":
        return {
            "reasoning_trace": "Primary payment transaction failed. Automatically routing to TRIGGER_ROLLBACK for runner-up assignment.",
            "next_action": "TRIGGER_ROLLBACK",
            "updated_context_notes": "Executing safety protocol rollback."
        }

    return {
        "reasoning_trace": "All pipeline processes completed successfully. Completing lifecycle.",
        "next_action": "COMPLETE_CYCLE",
        "updated_context_notes": "Full cycle complete."
    }

async def run_agentic_swarm(raw_text: str, locale: str = "en", history: list[dict] = [], location: str | None = None):
    loc = locale if locale in ("en", "ur") else "en"
    _write_json(REQUEST_PATH, {
        "message": raw_text,
        "raw_input": raw_text,
        "locale": loc,
        "location": "Islamabad",
        "status": "pending",
        "timestamp": datetime.now().isoformat()
    })
    _write_json(RESPONSE_PATH, {"status": "processing", "data": None,
                                 "timestamp": datetime.now().isoformat()})

    state: dict = {
        "raw_input": raw_text,
        "locale": loc,
        "location": "Islamabad",
        "request_history": [],
        "parsed_intent":  None,
        "matching_data":  None,
        "pricing_data":   None,
        "booking_status": "pending",
        "payment_result": None,
        "final_booking":  None,
        "history":        [],
        "error_log":      [],
    }

    cycle_active = True
    iterations   = 0

    while cycle_active and iterations < MAX_SWARM_ITERATIONS:
        iterations += 1
        await asyncio.sleep(2.0)

        prompt = ORCHESTRATOR_PROMPT.format(
            state=json.dumps(
                {k: v for k, v in state.items() if k != "history"},
                indent=2, ensure_ascii=False, default=str
            ),
            history=json.dumps(state["history"], ensure_ascii=False),
        )
        if USE_RULE_ORCHESTRATOR:
            decision = _fallback_orchestrate(state)
        else:
            try:
                import google.genai as genai
                resp = generate_content_with_retry(
                    model=MODEL,
                    contents=prompt,
                    config=genai.types.GenerateContentConfig(
                        response_mime_type="application/json",
                        temperature=0.1,
                    ),
                )
                decision = json.loads(resp.text)
            except Exception as exc:
                print(f"[ORCHESTRATOR] {describe_api_error(exc)}")
                if is_quota_error(exc):
                    print("[ORCHESTRATOR] Using rule-based state machine (Gemini quota/rate limit).")
                    decision = _fallback_orchestrate(state)
                else:
                    state["error_log"].append(f"Orchestrator error: {exc}")
                    break

        action  = decision.get("next_action", "COMPLETE_CYCLE")
        trace   = decision.get("reasoning_trace", "(no trace)")
        context = decision.get("updated_context_notes", "")

        log_trace(
            "ANTIGRAVITY_ORCHESTRATOR",
            f"STEP_{iterations} → {action}",
            f"Iteration: {iterations}/{MAX_SWARM_ITERATIONS}  |  History: {state['history']}",
            trace,
            f"Context notes: {context}",
        )

        state["history"].append(action)

        try:
            if action == "RUN_INTENT_PARSER":
                state["parsed_intent"] = await agent_1_parse(state["raw_input"], state["locale"])

            elif action == "TRIGGER_MATCHER":
                state["matching_data"] = await agent_2_match(state["parsed_intent"])

            elif action == "CALCULATE_PRICING":
                sel = state["matching_data"]["selected"]
                provider = next(
                    (p for p in load_providers() if p["id"] == sel["id"]),
                    {"id": sel["id"], "name": sel["name"], "base_rate": 1000}
                )
                state["pricing_data"] = await agent_3_price(
                    state["parsed_intent"], provider, sel["distance_km"]
                )

            elif action == "PROCESS_BOOKING":
                result = await execute_payment_and_ledger(state)
                state["payment_result"]  = result["payment"]
                state["final_booking"]   = result["booking"]
                if result["payment"]["status"] == "SUCCESS":
                    state["booking_status"] = "confirmed"
                else:
                    state["booking_status"] = "payment_failed"

            elif action == "TRIGGER_ROLLBACK":
                rb = rollback_to_runner_up(state["matching_data"])
                state["final_booking"]["_rollback"] = rb
                state["booking_status"] = "rollback_assigned"

            elif action == "RAISE_CLARIFICATION":
                state["booking_status"] = "clarification_needed"
                intent = state["parsed_intent"] or {}
                note = _clarification_intro_note(state.get("locale", "en"))
                _write_json(RESPONSE_PATH, {
                    "status": "clarification_needed",
                    "data": {
                        "intent":    intent,
                        "questions": intent.get("clarifying_questions", []),
                        "orchestrator_note": note,
                    },
                    "timestamp": datetime.now().isoformat(),
                })
                cycle_active = False

            elif action == "COMPLETE_CYCLE":
                cycle_active = False

            else:
                state["error_log"].append(f"Unknown action: {action}")
                cycle_active = False

        except Exception as exc:
            # Log the exception and ensure the frontend receives an error response
            state["error_log"].append(f"{action} raised: {exc}")
            # Write error response to RESPONSE_PATH so pollServiceResponse can return it
            _write_json(RESPONSE_PATH, {
                "status": "error",
                "data": {"error_log": state["error_log"], "swarm_steps": state["history"]},
                "timestamp": datetime.now().isoformat(),
            })
            cycle_active = False


    if state["booking_status"] in ("confirmed", "rollback_assigned"):
        _write_json(RESPONSE_PATH, {
            "status":    "processed",
            "data": {
                "booking_id":  state["final_booking"]["booking_id"],
                "intent":      state["parsed_intent"],
                "match":       state["matching_data"],
                "pricing":     state["pricing_data"],
                "payment":     state["payment_result"],
                "booking":     state["final_booking"],
                "swarm_steps": state["history"],
            },
            "timestamp": datetime.now().isoformat(),
        })
    elif state["booking_status"] not in ("clarification_needed",):
        _write_json(RESPONSE_PATH, {
            "status":    "error",
            "data":      {"error_log": state["error_log"], "swarm_steps": state["history"]},
            "timestamp": datetime.now().isoformat(),
        })

    _write_json(REQUEST_PATH, {"message": raw_text, "status": state["booking_status"],
                                "timestamp": datetime.now().isoformat()})
