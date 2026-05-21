from core.orchestrator import run_agentic_swarm


async def handle_request(req, bg):
    loc = (getattr(req, "locale", None) or "en").strip().lower()
    if loc not in ("en", "ur"):
        loc = "en"

    location = getattr(req, "location", None)

    bg.add_task(run_agentic_swarm, req.message, loc, location)
    return {"status": "accepted", "message": "Antigravity Swarm Orchestrator initialised."}
