---
description: 4-Agent Cooperative Swarm — State Machine for ServiceBazaar Request Processing
---

## Operational Directives

### Step 0 — File Monitoring
Monitor `data/current_request.json` for new requests where `status == "pending"`.
On detection, activate the full 4-agent pipeline below.

---

### Step 1 — Agent 1: Multilingual Intent Parser
- **Input**: Raw conversational text (English / Urdu / Roman Urdu code-switching).
- **Process**: Route through Gemini `gemini-2.0-flash` with `response_mime_type: "application/json"`.
- **Extract**: `service_type`, `location`, `urgency_level`, `preferred_time_window`, `price_sensitivity`.
- **Guard**: Calculate `confidence_score`. If `< 0.70`, write clarifying questions to `current_response.json` and HALT.
- **Fallback**: If Gemini call fails, use keyword-based extraction with `confidence_score = 0.55`.
- **Trace**: Log to `workspace_traces.md` with stage `INTENT_PARSE`.

---

### Step 2 — Agent 2: 6-Factor Matcher
- **Input**: Structured intent from Agent 1.
- **Process**:
  1. Load `data/providers.json` and filter by skill match.
  2. Calculate Haversine distances via `tools/maps_client.py`.
  3. Apply workload balancing via `tools/services.py`.
  4. Compute weighted score:
     ```
     Score = (0.25 × Rating) + (0.25 × Reliability) - (0.15 × Distance) - (0.15 × Risk) - (0.10 × Workload) + (0.10 × Recency)
     ```
  5. Check calendar overlaps with 30-minute travel buffer.
  6. Auto-generate 2 alternative slots on collision.
- **Output**: Top-scored provider + runner-up for rollback.
- **Rollback**: If primary provider cancels → auto-assign runner-up.
- **Trace**: Log to `workspace_traces.md` with stage `MATCHING_RATIONALE`.

---

### Step 3 — Agent 3: Dynamic Complex Pricing Engine
- **Input**: Intent + selected provider + distance.
- **Process**:
  1. Classify request tier via Gemini: `Basic` (×1.0), `Intermediate` (×1.35), `Complex` (×1.75).
  2. Apply formula:
     ```
     Final = (Base Rate × Complexity Multiplier) + Surge Fee + Distance Surcharge − Loyalty Discount
     ```
  3. Generate itemized markdown breakdown.
- **Trace**: Log to `workspace_traces.md` with stage `PRICING_BREAKDOWN`.

---

### Step 4 — Booking & Notification
- Generate unique `booking_id`.
- Process payment via `tools/services.py` (15% simulated failure rate).
- On payment failure: hold booking for 3 minutes, trigger rollback to runner-up.
- Append to `data/bookings_ledger.csv`.
- Fire mock SMS to provider and WhatsApp to customer.
- Write final state to `data/current_response.json` with `status: "processed"`.

---

### Step 5 — Agent 4: Lifecycle & Dispute Simulator
- **Trigger**: `POST /api/dispute` endpoint.
- **Input**: `booking_id`, `provider_id`, `rating`, `complaint`, `severity`.
- **Rules**:
  | Severity / Rating | Reliability Δ | Risk Δ | Action |
  |---|---|---|---|
  | extreme / 1★ | −0.20 | +0.25 | TEMPORARY_BLACKLIST |
  | high / ≤2★ | −0.10 | +0.15 | FLAGGED |
  | medium / ≤3★ | −0.05 | +0.05 | WARNING |
  | low / 4-5★ | +0.01 | −0.01 | POSITIVE_FEEDBACK |
- **Post**: Update `providers.json`, generate empathetic Gemini response.
- **Trace**: Log to `workspace_traces.md` with stage `DISPUTE_RESOLUTION`.

---

### Trace Schema
All traces follow:
```
[TIMESTAMP] [AGENT_ID] [STAGE]
Confidence Score / Computational Values: ...
Step Rationale: ...
Core Execution Output: ...
```