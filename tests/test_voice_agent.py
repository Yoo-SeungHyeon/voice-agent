from __future__ import annotations

import json
import os
import subprocess
import sys
import unittest

from voice_agent.agent import VoiceAgent


class VoiceAgentTests(unittest.TestCase):
    def test_readme_example_open_file(self) -> None:
        plan = VoiceAgent(use_agno=False).plan("main.py 열어")
        self.assertEqual(plan.to_dict()["steps"][0], {"tool": "openFile", "args": {"query": "main.py"}})

    def test_readme_example_scroll_down(self) -> None:
        plan = VoiceAgent(use_agno=False).plan("화면 천천히 아래로 내려봐")
        self.assertEqual(plan.to_dict()["steps"][0]["tool"], "scroll")
        self.assertEqual(plan.to_dict()["steps"][0]["args"]["direction"], "down")

    def test_readme_example_zoom_in(self) -> None:
        plan = VoiceAgent(use_agno=False).plan("잠깐 화면 크게 보여줘")
        self.assertEqual(plan.to_dict()["steps"][0], {"tool": "zoom", "args": {"direction": "in"}})

    def test_readme_example_insert_function(self) -> None:
        plan = VoiceAgent(use_agno=False).plan("33번 라인에 validate_user 함수 추가해")
        self.assertEqual(
            plan.to_dict()["steps"][0],
            {"tool": "insertAtLine", "args": {"line": 33, "content": "validate_user 함수"}},
        )

    def test_cli_outputs_json_contract(self) -> None:
        result = subprocess.run(
            [sys.executable, "-m", "voice_agent.cli", "--no-agno", "--command", "터미널에서 npm test 실행"],
            check=True,
            capture_output=True,
            text=True,
            encoding="utf-8",
            env={**os.environ, "PYTHONIOENCODING": "utf-8"},
        )
        payload = json.loads(result.stdout)
        self.assertEqual(payload["kind"], "tool-plan")
        self.assertEqual(payload["steps"][0], {"tool": "runTerminalCommand", "args": {"command": "npm test"}})


if __name__ == "__main__":
    unittest.main()
