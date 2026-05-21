"""Gemini calls with proactive spacing + reactive retry on 429."""
import re
import time
import threading

from core.gemini_client import (
    gemini,
    is_quota_error,
    GEMINI_MIN_INTERVAL_SEC,
    GEMINI_MAX_RETRIES,
    GEMINI_RETRY_BACKOFF_SEC,
)

_lock = threading.Lock()
_last_call_at = 0.0


def _wait_before_call() -> None:
    """Space out calls to stay under per-minute RPM limits (free tier ~15 RPM)."""
    global _last_call_at
    if GEMINI_MIN_INTERVAL_SEC <= 0:
        return
    with _lock:
        now = time.monotonic()
        wait = GEMINI_MIN_INTERVAL_SEC - (now - _last_call_at)
        if wait > 0:
            time.sleep(wait)
        _last_call_at = time.monotonic()


def _is_daily_quota_exhausted(exc: BaseException) -> bool:
    err = str(exc).lower()
    return (
        "perday" in err
        or "per day" in err
        or "generatecontentfree_tier_requests" in err.replace("_", "")
    )


def _retry_delay_seconds(exc: BaseException, attempt: int) -> float:
    """Prefer Google's RetryInfo delay when present, else exponential backoff."""
    match = re.search(r"retry in (\d+(?:\.\d+)?)s", str(exc), re.I)
    if match:
        return float(match.group(1)) + 0.5
    return GEMINI_RETRY_BACKOFF_SEC * (2 ** attempt)


def generate_content_with_retry(model: str, contents: str, config=None, max_retries=None, initial_backoff=None):
    if gemini is None:
        raise RuntimeError("Gemini client is not initialized. Please configure a GEMINI_API_KEY or set up Google Cloud ADC.")

    retries = max_retries if max_retries is not None else GEMINI_MAX_RETRIES
    backoff = initial_backoff if initial_backoff is not None else GEMINI_RETRY_BACKOFF_SEC

    last_exc = None
    for attempt in range(retries):
        _wait_before_call()
        try:
            return gemini.models.generate_content(
                model=model,
                contents=contents,
                config=config,
            )
        except Exception as e:
            last_exc = e
            if not is_quota_error(e):
                raise

            # Daily cap (e.g. 20/day on free tier): waiting will not help.
            if _is_daily_quota_exhausted(e):
                raise

            if attempt < retries - 1:
                delay = _retry_delay_seconds(e, attempt) if attempt == 0 else backoff * (2 ** attempt)
                time.sleep(delay)
                continue
            raise

    if last_exc:
        raise last_exc
    raise RuntimeError("Gemini call failed after retries")
