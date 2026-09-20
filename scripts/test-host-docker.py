"""Real Docker smoke test using UUID-scoped disposable resources, never the live site."""
import json
import os
from pathlib import Path
import secrets
import subprocess
import tempfile
import time
import uuid

ROOT = Path(__file__).resolve().parents[1]
IMAGE = "portfolio-host-smoke:local"
PREFIX = "codex-host-smoke-" + uuid.uuid4().hex[:10]
PROJECT = PREFIX + "-site"
BRIDGE = PREFIX + "-bridge"
CLIENT = PREFIX + "-client"
VOLUME = PREFIX + "-deployment"
TOKEN = secrets.token_hex(32)


def docker(*args, check=True, env=None):
    result = subprocess.run(["docker", *args], capture_output=True, text=True,
                            timeout=240, env=env)
    if check and result.returncode:
        # Do not dump command arguments: they may contain the ephemeral test token.
        raise RuntimeError(result.stderr)
    return result.stdout.strip()


def request(method, path, token=TOKEN, body=None):
    code = """
import http.client,json,sys
method,path,token,body=json.loads(sys.argv[1])
c=http.client.HTTPConnection('host-bridge',8080,timeout=20)
c.request(method,path,body=body,headers={'Authorization':'Bearer '+token})
r=c.getresponse()
print(json.dumps({'status':r.status,'body':json.loads(r.read())}))
"""
    return json.loads(docker("exec", CLIENT, "python3", "-c", code,
                             json.dumps([method, path, token, body])))


def status():
    response = request("GET", "/status")
    assert response["status"] == 200, response
    return response["body"]


def wait_for_job():
    deadline = time.monotonic() + 180
    while time.monotonic() < deadline:
        result = status()
        if result["state"] != "running":
            return result
        time.sleep(1)
    raise AssertionError("Deployment did not finish within 180 seconds")


def main():
    docker("version", "--format", "{{.Server.Version}}")
    docker("build", "-t", IMAGE, str(ROOT / "deploy/host-agent"))
    print("PASS: real bridge image build", flush=True)
    with tempfile.TemporaryDirectory(prefix="portfolio-host-smoke-") as temporary:
        folder = Path(temporary).resolve()
        assert folder.is_relative_to(Path(tempfile.gettempdir()).resolve())
        empty_env = folder / ".env"
        empty_env.write_text("")
        environment = dict(os.environ, HOST_AGENT_TOKEN=TOKEN,
                           HOST_COMPOSE_DIRECTORY="/smoke-project", HOST_COMPOSE_PROJECT_NAME=PROJECT)
        model = json.loads(docker("compose", "-p", BRIDGE, "--env-file", str(empty_env),
                                  "-f", str(ROOT / "deploy/host-agent/compose.yml"),
                                  "config", "--format", "json", env=environment))
        service = model["services"]["host-bridge"]
        assert "build" not in service, "VM installation must use a prebuilt image"
        assert service["image"] == "ghcr.io/nousernameavailable1/magic-portfolio-host-bridge:latest"
        service["image"] = IMAGE
        # Docker Desktop cannot mount a native Windows path at the same Linux path.
        # A fixture volume substitutes only for the read-only deployment bind mount.
        service["volumes"][1] = {"type": "volume", "source": "fixture",
                                 "target": "/smoke-project", "read_only": True}
        model["volumes"]["fixture"] = {"external": True, "name": VOLUME}
        model["networks"]["host_control"]["name"] = PREFIX + "-control"
        compose_file = folder / "bridge.json"
        compose_file.write_text(json.dumps(model))
        compose = ["compose", "-p", BRIDGE, "-f", str(compose_file)]
        fixture = folder / "docker-compose.yml"

        def write_fixture(version, image="alpine:3.22"):
            fixture.write_text(json.dumps({"services": {"site": {
                "image": image,
                "command": ["sh", "-c", f"echo smoke-{version}; exec sleep 3600"],
            }}}))
            docker("cp", str(fixture), CLIENT + ":/smoke-project/docker-compose.yml")

        try:
            docker("volume", "create", VOLUME)
            docker("run", "-d", "--name", CLIENT, "--mount", f"type=volume,source={VOLUME},target=/smoke-project",
                   "--entrypoint", "python3", IMAGE, "-c", "import time; time.sleep(1200)")
            docker("cp", str(empty_env), CLIENT + ":/smoke-project/.env")
            write_fixture("v1")
            docker(*compose, "up", "-d", "--wait", "--wait-timeout", "60")
            bridge_id = docker(*compose, "ps", "-q", "host-bridge")
            docker("network", "connect", PREFIX + "-control", CLIENT)
            details = json.loads(docker("inspect", bridge_id))[0]
            assert not details["HostConfig"]["PortBindings"]
            assert details["HostConfig"]["ReadonlyRootfs"]
            assert request("GET", "/health")["status"] == 200
            for method, path, token, body, expected in [
                ("GET", "/status", "", None, 401),
                ("POST", "/update", "wrong", None, 401),
                ("POST", "/exec", TOKEN, None, 404),
                ("POST", "/update?command=id", TOKEN, None, 404),
                ("POST", "/update", TOKEN, '{"command":"id"}', 400),
            ]:
                assert request(method, path, token, body)["status"] == expected
            print("PASS: private network, no published ports, auth and command-input rejection", flush=True)
            assert request("POST", "/update")["status"] == 202
            result = wait_for_job()
            assert result["state"] == "succeeded", result
            assert "smoke-v1" in status()["logs"]
            original_site = docker("ps", "-q", "--filter", f"label=com.docker.compose.project={PROJECT}")
            print("PASS: real compose pull + up and read-only container logs", flush=True)
            write_fixture("v2")
            assert request("POST", "/update")["status"] == 202
            result = wait_for_job()
            assert result["state"] == "succeeded", result
            replacement = docker("ps", "-q", "--filter", f"label=com.docker.compose.project={PROJECT}")
            assert replacement and replacement != original_site
            assert docker(*compose, "ps", "-q", "host-bridge") == bridge_id
            assert "smoke-v2" in status()["logs"]
            print("PASS: site container replaced while bridge remained running", flush=True)
            docker(*compose, "restart", "host-bridge")
            docker(*compose, "up", "-d", "--wait", "--wait-timeout", "60")
            assert status()["state"] == "succeeded"
            print("PASS: job history persists across bridge restart", flush=True)
            write_fixture("must-not-deploy", "alpine:codex-host-smoke-tag-does-not-exist")
            assert request("POST", "/update")["status"] == 202
            result = wait_for_job()
            assert result["state"] == "failed" and "pull failed" in result["phase"], result
            assert docker("ps", "-q", "--filter", f"label=com.docker.compose.project={PROJECT}") == replacement
            print("PASS: failed image pull leaves existing site container untouched", flush=True)
        finally:
            # Every resource is scoped to this invocation's randomly generated project names.
            for container in docker("ps", "-aq", "--filter", f"label=com.docker.compose.project={PROJECT}", check=False).split():
                docker("rm", "-f", container)
            for network in docker("network", "ls", "-q", "--filter", f"label=com.docker.compose.project={PROJECT}", check=False).split():
                docker("network", "rm", network)
            docker("rm", "-f", CLIENT, check=False)
            docker(*compose, "down", "--volumes")
            docker("volume", "rm", VOLUME)
            print("Cleaned up disposable containers, networks and volumes.", flush=True)


if __name__ == "__main__":
    main()
