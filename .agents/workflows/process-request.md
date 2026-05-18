---
description: 
---

## Operational Directives

1. Monitor the file path `data/current_request.json` for new incoming requests where status is "pending".
2. On detection, intercept the string value and activate the **Linguistic Parser Agent**:
   - Classify the mixed English/Urdu text to extract: Service, Location, Urgency Tier, and Constraints.
3. Launch the **Multi-Factor Matcher Agent**:
   - Open `data/providers.json`.
   - Calculate performance scores for all workers using the challenge formula weights: Rating (25%), Reliability (25%), Cancellation (-15%), Distance (-15%), Recency Freshness (20%).
   - Filter out workers with scheduling clashes against their `booked_slots`.
4. Trigger the **Dynamic Pricing Agent**:
   - Calculate surge pricing based on the extracted urgency metrics ($1.30\times$ multiplier if high urgency).
5. Commit results to file system storage:
   - Write the outcome parameters containing `selected_worker_id`, `selected_worker_name`, `quoted_price`, and `confidence` metrics into `data/current_response.json`.
   - Set the response status parameter explicitly to "processed".
6. Generate Evaluation Trail Records:
   - Log the complete reasoning path, scoring breakdown matrix, and parsing confidence variables directly into `data/workspace_traces.md`.age