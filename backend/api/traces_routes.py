import os
from pathlib import Path
from fastapi import APIRouter

router = APIRouter()
DATA_DIR = Path("data")
# Actually, the prompt says workspace_traces.md is in the root, let's check path.
# wait, the project overview said:
# ├── data/
# │   ├── providers.json
# │   ├── current_request.json
# │   ├── current_response.json
# │   └── bookings_ledger.csv
# └── workspace_traces.md

# So it's in the parent of data directory, or just workspace_traces.md. Let's use Path("workspace_traces.md")

TRACES_PATH = Path("workspace_traces.md")

@router.get("/traces/latest")
async def get_latest_traces(limit: int = 30):
    if not TRACES_PATH.exists():
        return {"traces": []}
        
    try:
        with open(TRACES_PATH, "r", encoding="utf-8") as f:
            lines = f.readlines()
            
        # Get the last `limit` lines
        tail_lines = lines[-limit:]
        
        # We might want to parse it, but for a raw markdown display, returning the raw text or list of lines is fine.
        return {"traces": "".join(tail_lines)}
    except Exception as e:
        return {"traces": f"Error reading traces: {str(e)}"}
