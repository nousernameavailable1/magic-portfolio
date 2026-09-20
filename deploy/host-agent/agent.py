#!/usr/bin/env python3
"""Private, authenticated HTTP bridge. Only fixed Docker Compose operations."""
import datetime
import hmac
import json
import os
import re
from pathlib import Path
import signal
import socketserver
import subprocess
import threading
from http.server import BaseHTTPRequestHandler

LIMIT = 128 * 1024
STATE = Path("/var/lib/portfolio-host/state.json")
LOCK = threading.Lock()
UPDATE_LOCK = threading.Lock()
LOG_LOCK = threading.Lock()
status = {"state": "idle", "phase": "Ready", "updatedAt": None, "output": ""}


def compose_command(action):
    # These values come only from the administrator's container configuration.
    directory = os.environ["COMPOSE_DIRECTORY"]
    return ["docker", "compose", "--project-directory", directory,
            "--project-name", os.environ["COMPOSE_PROJECT_NAME"],
            "--env-file", str(Path(directory) / ".env"),
            "-f", str(Path(directory) / "docker-compose.yml"), *action]


def save(**values):
    with LOCK:
        status.update(values, updatedAt=datetime.datetime.now(datetime.timezone.utc).isoformat())
        temporary = STATE.with_suffix(".tmp")
        temporary.write_text(json.dumps(status))
        temporary.replace(STATE)


def run(action, timeout, publish=False):
    output = bytearray()
    process = subprocess.Popen(compose_command(action), stdout=subprocess.PIPE,
                               stderr=subprocess.STDOUT, stdin=subprocess.DEVNULL,
                               start_new_session=True, cwd=os.environ["COMPOSE_DIRECTORY"],
                               # Override inherited settings AND the deployment .env. A profiled
                               # bridge must never be included in the update it is executing.
                               env=dict(os.environ, COMPOSE_PROFILES=""))

    def read():
        while chunk := process.stdout.read1(4096):
            output.extend(chunk)
            del output[:-LIMIT]
            if publish:
                with LOCK:
                    status["output"] = output.decode("utf-8", errors="replace")

    reader = threading.Thread(target=read, daemon=True)
    reader.start()
    try:
        code = process.wait(timeout=timeout)
    except subprocess.TimeoutExpired:
        os.killpg(process.pid, signal.SIGKILL)
        process.wait()
        code = -1
    reader.join(timeout=5)
    text = output.decode("utf-8", errors="replace")
    if code == -1:
        text += "\nCommand timed out. Inspect the VM before retrying."
    return code, text


def update():
    try:
        for phase, action in [("pull", ["pull"]), ("up", ["up", "-d"])]:
            save(state="running", phase=phase, output="")
            code, output = run(action, 900, publish=True)
            save(output=output)
            if code:
                save(state="failed", phase=f"{phase} failed (exit {code})")
                return
        save(state="succeeded", phase="Compose completed; verify site health")
    except Exception:
        save(state="failed", phase="Bridge error; inspect bridge configuration and Docker access")
    finally:
        UPDATE_LOCK.release()


class Handler(BaseHTTPRequestHandler):
    def setup(self):
        super().setup()
        self.connection.settimeout(10)

    def log_message(self, *_args):
        pass

    def reply(self, code, payload):
        body = json.dumps(payload).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def valid(self, path):
        token = os.environ.get("HOST_AGENT_TOKEN", "")
        authorization = self.headers.get("Authorization", "")
        if not re.fullmatch(r"[a-f0-9]{64}", token) or not hmac.compare_digest(
                authorization.encode(), f"Bearer {token}".encode()):
            self.reply(401, {"error": "Unauthorized."})
            return False
        if self.path != path:
            self.reply(404, {"error": "Unknown operation."})
            return False
        if self.headers.get("Transfer-Encoding") or self.headers.get("Content-Length", "0") != "0":
            self.reply(400, {"error": "Input is not accepted."})
            return False
        return True

    def do_GET(self):
        if self.path == "/health":
            if self.valid("/health"):
                self.reply(200, {"ok": True})
            return
        if not self.valid("/status"):
            return
        if not LOG_LOCK.acquire(blocking=False):
            self.reply(429, {"error": "Log read already in progress."})
            return
        try:
            try:
                code, logs = run(["logs", "--no-color", "--timestamps", "--tail", "200"], 8)
                error = "Could not read container logs." if code else None
            except Exception:
                logs, error = "", "Could not read container logs. Check the agent configuration."
            with LOCK:
                payload = dict(status, logs=logs, logsError=error)
            self.reply(200, payload)
        finally:
            LOG_LOCK.release()

    def do_POST(self):
        if not self.valid("/update"):
            return
        if not UPDATE_LOCK.acquire(blocking=False):
            self.reply(409, {"error": "An update is already running."})
            return
        # Persist acceptance before responding; execution is independent of the app connection.
        try:
            save(state="running", phase="Queued", output="")
            threading.Thread(target=update, daemon=True).start()
        except Exception:
            UPDATE_LOCK.release()
            raise
        self.reply(202, {"accepted": True})


def main():
    global status
    class Server(socketserver.ThreadingMixIn, socketserver.TCPServer):
        daemon_threads = True
        allow_reuse_address = True

    validate_configuration()
    os.umask(0o077)
    STATE.parent.mkdir(parents=True, exist_ok=True)
    if STATE.exists():
        status = json.loads(STATE.read_text())
        if status["state"] == "running":
            save(state="failed", phase="Agent restarted during update; inspect deployment before retrying")
    with Server(("0.0.0.0", 8080), Handler) as server:
        server.serve_forever()


def validate_configuration():
    if not re.fullmatch(r"[a-f0-9]{64}", os.environ.get("HOST_AGENT_TOKEN", "")):
        raise ValueError("HOST_AGENT_TOKEN must be 64 lowercase hexadecimal characters")
    directory = Path(os.environ["COMPOSE_DIRECTORY"])
    if not directory.is_absolute() or not all((directory / name).is_file() for name in ["docker-compose.yml", ".env"]):
        raise ValueError("COMPOSE_DIRECTORY must be an absolute directory containing docker-compose.yml and .env")
    project = os.environ.get("COMPOSE_PROJECT_NAME", "")
    if not re.fullmatch(r"[a-z0-9][a-z0-9_-]*", project) or project == "portfolio-host":
        raise ValueError("Use the existing site's project name, not the portfolio-host bridge project")


if __name__ == "__main__":
    main()
