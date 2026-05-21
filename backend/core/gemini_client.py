"""Shared Gemini client, env loading, and API error helpers."""
import os
from pathlib import Path

from dotenv import load_dotenv
from google import genai

_BACKEND_DIR = Path(__file__).resolve().parent.parent
load_dotenv(_BACKEND_DIR / ".env")

MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
USE_RULE_ORCHESTRATOR = os.getenv("USE_RULE_ORCHESTRATOR", "false").lower() in ("1", "true", "yes")

# Proactive spacing between any two Gemini calls (helps per-minute RPM limits).
GEMINI_MIN_INTERVAL_SEC = float(os.getenv("GEMINI_MIN_INTERVAL_SEC", "2.0"))
# Reactive retries after 429 (helps short bursts; does not fix daily quota).
GEMINI_MAX_RETRIES = int(os.getenv("GEMINI_MAX_RETRIES", "3"))
GEMINI_RETRY_BACKOFF_SEC = float(os.getenv("GEMINI_RETRY_BACKOFF_SEC", "2.0"))


def get_api_key() -> str | None:
    key = os.getenv("GEMINI_API_KEY")
    return key.strip() if key else None


def get_client() -> genai.Client:
    key = get_api_key()
    if key:
        print("[GEMINI] Initializing Gemini Client with GEMINI_API_KEY...")
        return genai.Client(api_key=key)
    
    # Try to resolve GCP Project ID and Location dynamically.
    project = os.getenv("GCP_PROJECT_ID") or os.getenv("GOOGLE_CLOUD_PROJECT") or os.getenv("GCP_PROJECT") or "service-bazaar-496713"
    location = os.getenv("GCP_LOCATION", "global")
    
    print(f"[GEMINI] GEMINI_API_KEY is not set. Falling back to Vertex AI with ADC (Project: {project}, Location: {location})...")
    # genai.Client(vertexai=True) automatically uses standard GCP Application Default Credentials (ADC).
    return genai.Client(vertexai=True, project=project, location=location)


gemini = None
try:
    gemini = get_client()
except Exception as exc:
    print(f"[GEMINI] Warning: Could not initialize Gemini Client (ADC or API Key): {exc}")


def is_quota_error(exc: BaseException) -> bool:
    err = str(exc).lower()
    return (
        "429" in err
        or "resource_exhausted" in err
        or ("quota" in err and ("exceeded" in err or "limit" in err))
    )


def describe_api_error(exc: BaseException) -> str:
    if is_quota_error(exc):
        return f"Gemini quota/rate limit: {exc}"
    err = str(exc).lower()
    if "api key" in err or "401" in err or "403" in err or "invalid" in err:
        return f"Gemini auth/config error: {exc}"
    return f"Gemini API error: {exc}"
