"""Voice command planner used by the Agno-backed VSCode bridge."""

from __future__ import annotations

import re

from voice_agent.agno_runtime import create_agno_agent
from voice_agent.models import CommandPlan, ToolStep


class VoiceAgent:
    """Plan VSCode tool calls from Korean natural-language commands.

    The deterministic planner is the runtime contract for the VSCode extension.
    `agno_agent` is created lazily as the extension point for model-backed
    interpretation once provider credentials are configured.
    """

    def __init__(self, use_agno: bool = True) -> None:
        self.agno_agent = create_agno_agent() if use_agno else None

    def plan(self, command: str) -> CommandPlan:
        text = normalize(command)
        if not text:
            return CommandPlan(kind="unknown", summary="명령이 비어 있습니다.")

        if file_name := match_open_file(text):
            return tool_plan("파일 열기", "openFile", {"query": file_name})

        if file_path := match_create_file(text):
            return tool_plan("파일 생성", "createFile", {"path": file_path})

        if line_insert := match_line_insert(text):
            return tool_plan("라인에 코드 추가", "insertAtLine", line_insert)

        if terminal_command := match_terminal_command(text):
            return tool_plan("터미널 명령 실행", "runTerminalCommand", {"command": terminal_command})

        if re.search(r"(저장|save)", text, re.IGNORECASE):
            return tool_plan("파일 저장", "saveActiveFile", {})

        if re.search(r"(아래|내려|down|scroll down)", text, re.IGNORECASE):
            return tool_plan("화면 아래로 스크롤", "scroll", {"direction": "down", "amount": 4})

        if re.search(r"(위|올려|up|scroll up)", text, re.IGNORECASE):
            return tool_plan("화면 위로 스크롤", "scroll", {"direction": "up", "amount": 4})

        if re.search(r"(크게|확대|zoom in)", text, re.IGNORECASE):
            return tool_plan("화면 확대", "zoom", {"direction": "in"})

        if re.search(r"(작게|축소|zoom out)", text, re.IGNORECASE):
            return tool_plan("화면 축소", "zoom", {"direction": "out"})

        if re.search(r"(컨텍스트|상태|diagnostic|진단|git)", text, re.IGNORECASE):
            return tool_plan("현재 컨텍스트 읽기", "readContext", {})

        return CommandPlan(
            kind="unknown",
            summary="지원하지 않는 명령입니다.",
            original_text=command,
        )


def normalize(command: str) -> str:
    return re.sub(r"\s+", " ", str(command or "").strip())


def tool_plan(summary: str, tool: str, args: dict[str, object]) -> CommandPlan:
    return CommandPlan(kind="tool-plan", summary=summary, steps=[ToolStep(tool=tool, args=args)])


def match_open_file(text: str) -> str | None:
    patterns = [
        r"([^\s]+?\.[A-Za-z0-9_]+)\s*(?:열어|열기|open)",
        r"(?:열어|열기|open)\s+([^\s]+?\.[A-Za-z0-9_]+)",
    ]
    return first_match(text, patterns)


def match_create_file(text: str) -> str | None:
    patterns = [
        r"([^\s]+?\.[A-Za-z0-9_/-]+)\s*(?:만들어|생성|create)",
        r"(?:만들어|생성|create)\s+([^\s]+?\.[A-Za-z0-9_/-]+)",
    ]
    return first_match(text, patterns)


def match_line_insert(text: str) -> dict[str, object] | None:
    match = re.search(
        r"(\d+)\s*번?\s*라인(?:에|으로)?\s+(.+?)(?:\s*(?:추가|넣어|삽입|add|insert))?$",
        text,
        re.IGNORECASE,
    )
    if not match:
        return None
    return {"line": int(match.group(1)), "content": clean_code_phrase(match.group(2))}


def match_terminal_command(text: str) -> str | None:
    match = re.search(r"(?:터미널|terminal)(?:에서)?\s+(.+?)(?:\s*(?:실행|run))?$", text, re.IGNORECASE)
    return match.group(1).strip() if match else None


def first_match(text: str, patterns: list[str]) -> str | None:
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return strip_quotes(match.group(1))
    return None


def clean_code_phrase(value: str) -> str:
    return re.sub(
        r"\s*(?:추가해|추가|넣어줘|넣어|삽입해|삽입|add|insert)$",
        "",
        strip_quotes(value),
        flags=re.IGNORECASE,
    ).strip()


def strip_quotes(value: str) -> str:
    return str(value or "").strip().strip("\"'`“”‘’")
