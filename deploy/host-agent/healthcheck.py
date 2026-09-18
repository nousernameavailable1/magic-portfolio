"""Authenticated local probe; does not invoke Docker or print secrets."""
import os
import urllib.request

request = urllib.request.Request(
    "http://127.0.0.1:8080/health",
    headers={"Authorization": f"Bearer {os.environ['HOST_AGENT_TOKEN']}"},
)
with urllib.request.urlopen(request, timeout=3) as response:
    if response.status != 200:
        raise SystemExit(1)
