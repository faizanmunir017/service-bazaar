import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from api.router import api_router

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

from core.gemini_client import get_api_key, USE_RULE_ORCHESTRATOR, MODEL, gemini

if gemini is None:
    print("[WARN] Gemini Client is not initialized (no API Key or Google Cloud ADC configuration found) — agents will use keyword/rule fallbacks.")
else:
    mode = "rule-based orchestrator" if USE_RULE_ORCHESTRATOR else f"Gemini orchestrator ({MODEL})"
    print(f"[OK] Gemini configured — {mode}")

app = FastAPI(
    title="ServiceBazaar Backend",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
