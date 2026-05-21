import csv
from pathlib import Path
from fastapi import APIRouter, HTTPException
import json

router = APIRouter()
DATA_DIR = Path("data")
LEDGER_PATH = DATA_DIR / "bookings_ledger.csv"
RESPONSE_PATH = DATA_DIR / "current_response.json"

@router.get("/bookings")
async def get_bookings(limit: int = 20):
    if not LEDGER_PATH.exists():
        return {"bookings": []}
    
    bookings = []
    with open(LEDGER_PATH, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            bookings.append(row)
            
    return {"bookings": bookings[-limit:]}

@router.get("/bookings/{booking_id}")
async def get_booking_detail(booking_id: str):
    if not LEDGER_PATH.exists():
        raise HTTPException(status_code=404, detail="No bookings found")
        
    booking = None
    with open(LEDGER_PATH, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row.get("booking_id") == booking_id:
                booking = row
                # Note: We take the latest matching if there are duplicates
                
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
        
    # Attempt to enrich with current_response.json if it matches
    enriched = {"booking": booking}
    if RESPONSE_PATH.exists():
        try:
            with open(RESPONSE_PATH, "r", encoding="utf-8") as f:
                res_data = json.load(f)
                if res_data.get("booking_id") == booking_id:
                    enriched["intent"] = res_data.get("intent")
                    enriched["match"] = res_data.get("match")
                    enriched["pricing"] = res_data.get("pricing")
                    enriched["payment"] = res_data.get("payment")
                    enriched["lifecycle"] = res_data.get("lifecycle", ["confirmed", "notified", "en_route", "in_progress", "completed"])
        except Exception as e:
            pass
            
    return enriched
