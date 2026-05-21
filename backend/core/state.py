import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# Data directory is now in backend/data
DATA_DIR       = BASE_DIR / "data"
PROVIDERS_PATH = DATA_DIR / "providers.json"
REQUEST_PATH   = DATA_DIR / "current_request.json"
RESPONSE_PATH  = DATA_DIR / "current_response.json"
LEDGER_PATH    = DATA_DIR / "bookings_ledger.csv"
TRACES_PATH    = DATA_DIR / "workspace_traces.md"
