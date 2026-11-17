"""One approved Railway stop/recovery; run from the deployed source checkout."""
import datetime
import json
from pathlib import Path
import subprocess
import time
import urllib.request

origin = "https://e2e-harness-board.vercel.app"
report = {"origin": origin, "events": []}
output = Path("evidence/production/recovery-timing.json")

def event(name, **details):
    row = {"event": name, "at": datetime.datetime.now(datetime.timezone.utc).isoformat(), **details}
    report["events"].append(row)
    print(json.dumps(row), flush=True)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2))

def railway(*args):
    return subprocess.run(["npx", "--yes", "@railway/cli", *args], capture_output=True, text=True, timeout=60)

event("stop_requested")
stopped = railway("down", "--yes")
if stopped.returncode:
    event("stop_failed", detail=stopped.stderr)
    raise SystemExit(1)
event("stop_command_completed")
outage_ok = False
try:
    # Wait for the stop to be visible before asserting the UI's error state.
    deadline = time.monotonic() + 45
    while time.monotonic() < deadline:
        try:
            with urllib.request.urlopen(origin + "/api/health", timeout=10) as response:
                if response.status != 200:
                    break
        except Exception:
            break
        time.sleep(2)
    outage = subprocess.run(["node", "scripts/cloud-check.mjs", "outage", origin], timeout=60)
    outage_ok = outage.returncode == 0
    event("outage_check_completed", passed=outage_ok)
finally:
    recovery_start = time.monotonic()
    event("recovery_requested")
    restored = railway("redeploy", "--yes", "--json")
    event("redeploy_command_completed", code=restored.returncode, detail=restored.stdout if restored.returncode == 0 else restored.stderr)
    if restored.returncode and "No deployment found" in restored.stderr:
        # down removes the redeploy target. This fallback was used in the live drill;
        # unchanged Docker inputs produced the identical image digest.
        restored = railway("up", "--detach", "--json", "--message", "recovery-same-source")
        event("source_recovery_submitted", code=restored.returncode, detail=restored.stdout if restored.returncode == 0 else restored.stderr)

healthy = False
while time.monotonic() - recovery_start < 120:
    try:
        with urllib.request.urlopen(origin + "/api/health", timeout=10) as response:
            healthy = response.status == 200 and json.load(response) == {"status": "UP"}
    except Exception:
        healthy = False
    if healthy:
        break
    time.sleep(3)
event("health_recovery_result", passed=healthy, elapsedSeconds=round(time.monotonic() - recovery_start, 2))
if not healthy:
    raise SystemExit(1)
result = subprocess.run(["node", "scripts/cloud-check.mjs", "recovery", origin], timeout=120)
event("data_recovery_result", passed=result.returncode == 0)
raise SystemExit(0 if outage_ok and result.returncode == 0 else 1)
