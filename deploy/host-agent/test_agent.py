import http.client
import io
import os
import tempfile
import threading
import unittest
from pathlib import Path
from unittest.mock import Mock, patch
import socketserver

import agent


class AgentTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.state = patch.object(agent, "STATE", Path(self.directory.name) / "state.json")
        self.state.start()
        self.environment = patch.dict(os.environ, {"HOST_AGENT_TOKEN": "a" * 64})
        self.environment.start()
        agent.status = {"state": "idle", "phase": "Ready", "updatedAt": None, "output": ""}

    def tearDown(self):
        self.state.stop()
        self.environment.stop()
        self.directory.cleanup()

    def test_commands_are_argument_arrays_with_fixed_project(self):
        with patch.dict(os.environ, {"COMPOSE_DIRECTORY": "/opt/site with spaces", "COMPOSE_PROJECT_NAME": "existing"}):
            command = agent.compose_command(["up", "-d"])
        self.assertEqual(command, ["docker", "compose", "--project-directory",
                                  "/opt/site with spaces", "--project-name", "existing",
                                  "--env-file", str(Path("/opt/site with spaces") / ".env"), "-f",
                                  str(Path("/opt/site with spaces") / "docker-compose.yml"), "up", "-d"])

    def test_pull_failure_never_runs_up(self):
        agent.UPDATE_LOCK.acquire()
        with patch.object(agent, "run", return_value=(1, "pull denied")) as run:
            agent.update()
        self.assertEqual(run.call_args_list[0].args[0], ["pull"])
        self.assertEqual(run.call_count, 1)
        self.assertEqual(agent.status["state"], "failed")
        self.assertFalse(agent.UPDATE_LOCK.locked())

    def test_subprocess_has_no_shell_or_stdin_and_output_is_bounded(self):
        process = Mock(stdout=io.BytesIO(b"x" * (agent.LIMIT * 2) + b"tail"))
        process.wait.return_value = 0
        with patch.dict(os.environ, {"COMPOSE_DIRECTORY": "/opt/site", "COMPOSE_PROJECT_NAME": "site"}):
            with patch.object(agent.subprocess, "Popen", return_value=process) as popen:
                code, output = agent.run(["pull"], 900)
        self.assertEqual(code, 0)
        self.assertEqual(len(output), agent.LIMIT)
        self.assertTrue(output.endswith("tail"))
        self.assertFalse(popen.call_args.kwargs.get("shell", False))
        self.assertEqual(popen.call_args.kwargs["stdin"], agent.subprocess.DEVNULL)

    def test_pull_then_up_and_persist_success(self):
        agent.UPDATE_LOCK.acquire()
        with patch.object(agent, "run", return_value=(0, "done")) as run:
            agent.update()
        self.assertEqual([call.args[0] for call in run.call_args_list], [["pull"], ["up", "-d"]])
        self.assertEqual(agent.status["state"], "succeeded")
        self.assertIn('"succeeded"', agent.STATE.read_text())

    def test_up_failure_and_exception_release_lock(self):
        for result in [[(0, "pulled"), (2, "up failed")], RuntimeError("Docker unavailable")]:
            agent.UPDATE_LOCK.acquire()
            with patch.object(agent, "run", side_effect=result):
                agent.update()
            self.assertEqual(agent.status["state"], "failed")
            self.assertFalse(agent.UPDATE_LOCK.locked())

    def test_http_boundary_and_duplicate_update(self):
        with socketserver.TCPServer(("127.0.0.1", 0), agent.Handler) as server:
            worker = threading.Thread(target=server.serve_forever, daemon=True)
            worker.start()
            try:
                with patch.object(agent, "run") as run:
                    for method, path, body, expected in [
                        ("POST", "/update?command=id", None, 404),
                        ("POST", "/exec", None, 404),
                        ("POST", "/update", '{"command":"id"}', 400),
                        ("GET", "/status?service=db", None, 404),
                        ("DELETE", "/update", None, 501),
                    ]:
                        client = http.client.HTTPConnection(*server.server_address)
                        client.request(method, path, body=body, headers={"Authorization": "Bearer " + "a" * 64})
                        response = client.getresponse()
                        self.assertEqual(response.status, expected)
                        response.read()
                        client.close()
                    run.assert_not_called()
                    agent.UPDATE_LOCK.acquire()
                    try:
                        client = http.client.HTTPConnection(*server.server_address)
                        client.request("POST", "/update", headers={"Authorization": "Bearer " + "a" * 64})
                        self.assertEqual(client.getresponse().status, 409)
                        client.close()
                    finally:
                        agent.UPDATE_LOCK.release()
            finally:
                server.shutdown()
                worker.join()

    def test_http_authentication_and_read_only_endpoints(self):
        with socketserver.TCPServer(("127.0.0.1", 0), agent.Handler) as server:
            worker = threading.Thread(target=server.serve_forever, daemon=True)
            worker.start()
            try:
                with patch.object(agent, "run", return_value=(0, "container log")) as run:
                    for method, path in [("GET", "/status"), ("POST", "/update"), ("GET", "/health")]:
                        for token in ["", "Bearer wrong"]:
                            client = http.client.HTTPConnection(*server.server_address)
                            client.request(method, path, headers={"Authorization": token})
                            response = client.getresponse()
                            self.assertEqual(response.status, 401)
                            response.read()
                            client.close()
                    run.assert_not_called()
                    for path in ["/health", "/status"]:
                        client = http.client.HTTPConnection(*server.server_address)
                        client.request("GET", path, headers={"Authorization": "Bearer " + "a" * 64})
                        response = client.getresponse()
                        self.assertEqual(response.status, 200)
                        response.read()
                        client.close()
                    self.assertEqual(run.call_count, 1)
                    self.assertEqual(run.call_args.args[0], ["logs", "--no-color", "--timestamps", "--tail", "200"])
            finally:
                server.shutdown()
                worker.join()

    def test_configuration_rejects_missing_token_and_self_updates(self):
        directory = Path(self.directory.name)
        (directory / "docker-compose.yml").touch()
        (directory / ".env").touch()
        with patch.dict(os.environ, {"COMPOSE_DIRECTORY": str(directory), "COMPOSE_PROJECT_NAME": "site"}):
            agent.validate_configuration()
            with patch.dict(os.environ, {"HOST_AGENT_TOKEN": ""}):
                with self.assertRaises(ValueError):
                    agent.validate_configuration()
            with patch.dict(os.environ, {"COMPOSE_PROJECT_NAME": "portfolio-host"}):
                with self.assertRaises(ValueError):
                    agent.validate_configuration()

    def test_accepted_update_outlives_request_and_rejects_overlap(self):
        started = threading.Event()
        release = threading.Event()
        finished = threading.Event()
        original_update = agent.update

        def run(action, *_args, **_kwargs):
            if action == ["pull"]:
                started.set()
                release.wait(timeout=5)
            return 0, "done"

        def update():
            try:
                original_update()
            finally:
                finished.set()

        with socketserver.TCPServer(("127.0.0.1", 0), agent.Handler) as server:
            worker = threading.Thread(target=server.serve_forever, daemon=True)
            worker.start()
            try:
                with patch.object(agent, "run", side_effect=run), patch.object(agent, "update", side_effect=update):
                    for expected in [202, 409]:
                        client = http.client.HTTPConnection(*server.server_address, timeout=3)
                        client.request("POST", "/update", headers={"Authorization": "Bearer " + "a" * 64})
                        response = client.getresponse()
                        self.assertEqual(response.status, expected)
                        response.read()
                        client.close()
                        self.assertTrue(started.wait(timeout=3))
                    release.set()
                    self.assertTrue(finished.wait(timeout=3))
                    self.assertEqual(agent.status["state"], "succeeded")
            finally:
                release.set()
                finished.wait(timeout=3)
                server.shutdown()
                worker.join()


if __name__ == "__main__":
    unittest.main()
