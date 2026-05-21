import json
import re
from datetime import datetime
from core.logger import log_trace
from tools.services import load_providers, balance_workload
from tools.maps_client import resolve_location, calculate_travel_matrix

W = {"rating": 0.25, "reliability": 0.25, "distance": 0.15,
     "risk": 0.15, "workload": 0.10, "recency": 0.10}

def _time_overlaps(existing_blocks: list, requested: str) -> bool:
    if not requested or not existing_blocks:
        return False
    try:
        rs, re_ = requested.split("-")
        r_start = int(rs.replace(":", ""))
        r_end   = int(re_.replace(":", ""))
    except Exception:
        return False
    for blk in existing_blocks:
        try:
            bs, be_ = blk.split("-")
            b_start = int(bs.replace(":", ""))
            b_end   = int(be_.replace(":", ""))
            if r_start < b_end + 30 and r_end > b_start - 30:  # 30-min buffer
                return True
        except Exception:
            continue
    return False

def _suggest_alt_slots(existing_blocks: list) -> list:
    all_hours = set()
    for blk in existing_blocks:
        try:
            s, e = blk.split("-")
            sh = int(s.split(":")[0])
            eh = int(e.split(":")[0])
            for h in range(sh, eh + 1):
                all_hours.add(h)
        except Exception:
            pass
    alts = []
    for h in range(8, 18):
        if h not in all_hours and (h + 1) not in all_hours:
            alts.append(f"{h:02d}:00-{h+1:02d}:30")
            if len(alts) >= 2:
                break
    return alts or ["09:00-10:30", "15:00-16:30"]

async def agent_2_match(intent: dict) -> dict:
    providers = load_providers()
    svc = intent.get("service_type", "").lower()

    matched = []
    for p in providers:
        skills_lower = [s.lower() for s in p.get("skills", [])]
        if any(svc in sk or sk in svc for sk in skills_lower):
            matched.append(p)
    if not matched:
        for p in providers:
            joined = " ".join(p.get("skills", [])).lower()
            if any(w in joined for w in svc.split()):
                matched.append(p)
    if not matched:
        return {"status": "no_match", "message": "No providers found.", "alternatives": []}

    coords = resolve_location(intent.get("location", ""))
    travel = calculate_travel_matrix(matched, coords[0], coords[1])
    dist_map = {t["provider_id"]: t for t in travel}

    matched = balance_workload(matched)

    scored = []
    for p in matched:
        d = dist_map.get(p["id"], {"distance_km": 10, "travel_time_min": 24})
        rating_n     = p.get("rating", 3) / 5.0
        reliab_n     = p.get("reliability_score", 0.5)
        dist_n       = min(d["distance_km"] / 20.0, 1.0)
        risk_n       = p.get("risk_score", 0.5)
        work_n       = p.get("_fairness_index", 0.5)
        recency_n    = max(0, 1.0 - p.get("review_recency_days", 30) / 90.0)

        score = (W["rating"]     * rating_n
               + W["reliability"] * reliab_n
               - W["distance"]    * dist_n
               - W["risk"]        * risk_n
               - W["workload"]    * work_n
               + W["recency"]     * recency_n)

        today_str = datetime.now().strftime("%Y-%m-%d")
        today_blocks = []
        for entry in p.get("calendar_schedule", []):
            if entry.get("date") == today_str:
                today_blocks = entry.get("blocks", [])
        has_clash = False
        alt_slots = []
        time_window = intent.get("preferred_time_window") or ""
        time_match = re.search(r"(\d{1,2}:\d{2})-(\d{1,2}:\d{2})", time_window)
        if time_match:
            requested_slot = time_match.group(0)
            if _time_overlaps(today_blocks, requested_slot):
                has_clash = True
                alt_slots = _suggest_alt_slots(today_blocks)

        scored.append({
            "provider": p,
            "score": round(score, 4),
            "distance_km": d["distance_km"],
            "travel_time_min": d["travel_time_min"],
            "has_clash": has_clash,
            "alt_slots": alt_slots,
            "breakdown": {
                "rating": round(rating_n, 3),
                "reliability": round(reliab_n, 3),
                "distance": round(dist_n, 3),
                "risk": round(risk_n, 3),
                "workload": round(work_n, 3),
                "recency": round(recency_n, 3),
            },
        })

    scored.sort(key=lambda x: x["score"], reverse=True)
    top = scored[0]
    runner_up = scored[1] if len(scored) > 1 else None

    result = {
        "status": "matched",
        "selected": {
            "id": top["provider"]["id"],
            "name": top["provider"]["name"],
            "score": top["score"],
            "distance_km": top["distance_km"],
            "travel_time_min": top["travel_time_min"],
            "has_clash": top["has_clash"],
            "alt_slots": top["alt_slots"],
            "breakdown": top["breakdown"],
        },
        "runner_up": {
            "id": runner_up["provider"]["id"],
            "name": runner_up["provider"]["name"],
            "score": runner_up["score"],
        } if runner_up else None,
        "total_evaluated": len(scored),
    }

    log_trace(
        "AGENT_2", "MATCHING_RATIONALE",
        f"Top score: {top['score']}  |  Evaluated: {len(scored)} providers",
        f"6-factor weighted scoring applied. Weights: {W}",
        json.dumps(result, ensure_ascii=False, indent=2),
    )
    return result

def rollback_to_runner_up(match_result: dict) -> dict:
    ru = match_result.get("runner_up")
    if not ru:
        return {"status": "rollback_failed", "message": "No runner-up available."}
    log_trace(
        "AGENT_2", "ROLLBACK",
        f"Runner-up ID: {ru['id']}  score: {ru['score']}",
        "Primary provider cancelled. Executing automatic rollback subroutine.",
        json.dumps(ru, ensure_ascii=False),
    )
    return {"status": "rollback_ok", "new_provider": ru}
