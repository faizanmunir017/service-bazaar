import os
os.environ["GCP_LOCATION"] = "global"

from core.gemini_client import gemini
from google import genai
from core.gemini_retry import generate_content_with_retry

# Re-initialize explicitly with global to test
project = os.getenv("GCP_PROJECT_ID", "service-bazaar-496713")
print(f"Testing with GCP_LOCATION=global and project={project}")

try:
    global_client = genai.Client(vertexai=True, project=project, location="global")
except Exception as e:
    print(f"Failed to init global client: {e}")
    exit(1)

models_to_test = [
    "gemini-2.0-flash-001",
    "gemini-2.5-flash",
    "gemini-1.5-flash-002",
]

for model_name in models_to_test:
    print(f"\n--- Testing Model: {model_name} (global) ---")
    try:
        resp = global_client.models.generate_content(
            model=model_name,
            contents="Say 'Hello!' and nothing else.",
        )
        print(f"SUCCESS: {resp.text.strip()}")
    except Exception as e:
        print(f"FAILED: {e}")
