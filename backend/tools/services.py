"""
ServiceBazaar Service Layer
============================
Bookings ledger I/O, SMS/WhatsApp mock notifications, mock payment processing
with failure edge-cases, and provider workload balancing utilities.
"""

import csv
import json
import random
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

from core.state import DATA_DIR, LEDGER_PATH, PROVIDERS_PATH

LEDGER_FIELDS = [
    "booking_id", "timestamp", "customer_query", "service_type",
    "provider_id", "provider_name", "quoted_price", "status",
    "payment_status", "location", "urgency",
]


# ------------------------------------------------------------------ #
#  Bookings Ledger                                                    #
# ------------------------------------------------------------------ #

def append_booking(booking: Dict) -> str:
    """Append a single booking row to the CSV ledger (append-only)."""
    file_exists = LEDGER_PATH.exists() and LEDGER_PATH.stat().st_size > 0
    with open(LEDGER_PATH, "a", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=LEDGER_FIELDS, extrasaction="ignore")
        if not file_exists:
            writer.writeheader()
        writer.writerow(booking)
    return booking.get("booking_id", "UNKNOWN")


# ------------------------------------------------------------------ #
#  Notification Mocks                                                 #
# ------------------------------------------------------------------ #

def send_sms(recipient: str, message: str) -> Dict:
    """Console-logged SMS notification mock."""
    entry = {
        "timestamp": datetime.now().isoformat(),
        "type": "SMS",
        "recipient": recipient,
        "message": message,
        "status": "DELIVERED_MOCK",
    }
    print(f"\U0001f4f1 [SMS \u2192 {recipient}]: {message}")
    return entry


def send_whatsapp(recipient: str, message: str) -> Dict:
    """Console-logged WhatsApp notification mock."""
    entry = {
        "timestamp": datetime.now().isoformat(),
        "type": "WHATSAPP",
        "recipient": recipient,
        "message": message,
        "status": "DELIVERED_MOCK",
    }
    print(f"\U0001f4ac [WhatsApp \u2192 {recipient}]: {message}")
    return entry


# ------------------------------------------------------------------ #
#  Payment Processing                                                 #
# ------------------------------------------------------------------ #

def process_payment(booking_id: str, amount: float, method: str = "COD") -> Dict:
    """
    Mock payment with a ~15 % simulated failure rate.
    On failure the booking is held for 180 s (3 min) before auto-cancel.
    """
    if random.random() < 0.15:
        print(f"\u26a0\ufe0f  [PAYMENT FAILED] {booking_id}: PKR {amount} via {method}")
        return {
            "booking_id": booking_id,
            "amount": amount,
            "method": method,
            "status": "FAILED",
            "hold_until": datetime.now().isoformat(),
            "retry_window_seconds": 180,
            "message": "Payment failed. Booking held for 3 minutes for retry.",
        }

    txn_id = f"TXN_{booking_id}_{int(datetime.now().timestamp())}"
    print(f"\u2705 [PAYMENT OK] {booking_id}: PKR {amount} via {method}  txn={txn_id}")
    return {
        "booking_id": booking_id,
        "amount": amount,
        "method": method,
        "status": "SUCCESS",
        "transaction_id": txn_id,
        "message": "Payment processed successfully.",
    }


# ------------------------------------------------------------------ #
#  Workload Balancing                                                 #
# ------------------------------------------------------------------ #

def balance_workload(providers: List[Dict]) -> List[Dict]:
    """
    Assign a _fairness_index to each provider (lower = more deserving of work).
    Sorts ascending so the least-loaded / least-earned provider comes first.
    """
    if not providers:
        return providers
    max_earn = max((p.get("historical_earnings", 0) for p in providers), default=1) or 1
    max_hrs  = max((p.get("workload_hours_assigned", 0) for p in providers), default=1) or 1
    for p in providers:
        e_ratio = p.get("historical_earnings", 0) / max_earn
        h_ratio = p.get("workload_hours_assigned", 0) / max_hrs
        p["_fairness_index"] = round(e_ratio * 0.6 + h_ratio * 0.4, 4)
    return sorted(providers, key=lambda x: x.get("_fairness_index", 0))


# ------------------------------------------------------------------ #
#  Provider CRUD                                                      #
# ------------------------------------------------------------------ #

def load_providers() -> List[Dict]:
    """Load all providers from disk."""
    with open(PROVIDERS_PATH, "r", encoding="utf-8") as fh:
        return json.load(fh)


def save_providers(providers: List[Dict]) -> None:
    """Persist the full provider list back to disk."""
    with open(PROVIDERS_PATH, "w", encoding="utf-8") as fh:
        json.dump(providers, fh, indent=2, ensure_ascii=False)


def get_provider_by_id(provider_id: str) -> Optional[Dict]:
    """Fetch a single provider by ID."""
    for p in load_providers():
        if p["id"] == provider_id:
            return p
    return None


def update_provider(provider_id: str, updates: Dict) -> bool:
    """Merge *updates* into the matching provider record and save."""
    providers = load_providers()
    for i, p in enumerate(providers):
        if p["id"] == provider_id:
            providers[i].update(updates)
            save_providers(providers)
            return True
    return False
