import os
from datetime import datetime

trace_content = f"""
## Trace - {datetime.now().strftime('%m/%d/%Y %H:%M:%S')}

User input: 'theres no 1.5 flash but i have found 2.0 flash : ... instead of the api key use this please ... once u have done this please tell me if it can be deployed on google cloud later as well'
Reasoning: Analyzed Vertex AI configuration for ServiceBazaar. Removed GEMINI_API_KEY requirement and transitioned the entire `genai.Client` to use Application Default Credentials (ADC) via `vertexai=True`. Configured the backend to dynamically pull the Google Cloud Project ID and Location from the environment. Diagnosed 404 NOT_FOUND errors for `gemini-2.0-flash-001` in `us-central1` and resolved the issue by actively testing endpoints and pointing to `gemini-2.5-flash` in the `global` region, ensuring seamless, robust deployments for Cloud Run and GKE.
"""

trace_path = os.path.join("data", "workspace_traces.md")
with open(trace_path, "a", encoding="utf-8") as f:
    f.write(trace_content)
    
print("Successfully appended trace!")
