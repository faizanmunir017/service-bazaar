import json
from datetime import datetime
from core.state import TRACES_PATH

def log_trace(agent: str, stage: str, values: str, rationale: str, output: str):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    block = (
        f"\n## [{ts}] [{agent}] [{stage}]\n"
        f"**Confidence Score / Computational Values:**\n{values}\n\n"
        f"**Step Rationale:**\n{rationale}\n\n"
        f"**Core Execution Output:**\n{output}\n\n---\n"
    )
    with open(TRACES_PATH, "a", encoding="utf-8") as f:
        f.write(block)
    
    # Also write to root workspace_traces.md for backwards compatibility
    root_traces = TRACES_PATH.parent.parent.parent / "workspace_traces.md"
    if root_traces.exists():
        with open(root_traces, "a", encoding="utf-8") as f:
            f.write(block)
