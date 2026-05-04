"""Agno runtime wiring for the voice-agent planner."""

from __future__ import annotations

from typing import Any


def create_agno_agent() -> Any | None:
    """Create the Agno Agent facade when Agno is installed.

    The extension currently relies on deterministic JSON plans so it can be
    tested without model credentials. Keeping the Agno Agent construction here
    makes the runtime ready for model-backed interpretation without coupling
    tests to an external provider.
    """

    try:
        from agno.agent import Agent
    except ImportError:
        return None

    return Agent(
        name="VSCode Voice Agent",
        tools=[
            open_file_tool,
            create_file_tool,
            insert_at_line_tool,
            scroll_tool,
            zoom_tool,
            run_terminal_command_tool,
            read_context_tool,
            save_active_file_tool,
        ],
        instructions=(
            "Interpret Korean VSCode voice commands and choose the smallest "
            "safe tool plan. Return concise tool-oriented decisions."
        ),
        markdown=False,
    )


def open_file_tool(query: str) -> dict[str, Any]:
    """Plan opening a workspace file by name."""
    return {"tool": "openFile", "args": {"query": query}}


def create_file_tool(path: str) -> dict[str, Any]:
    """Plan creating a workspace file."""
    return {"tool": "createFile", "args": {"path": path}}


def insert_at_line_tool(line: int, content: str) -> dict[str, Any]:
    """Plan inserting text at a one-based line number."""
    return {"tool": "insertAtLine", "args": {"line": line, "content": content}}


def scroll_tool(direction: str, amount: int = 4) -> dict[str, Any]:
    """Plan editor scrolling."""
    return {"tool": "scroll", "args": {"direction": direction, "amount": amount}}


def zoom_tool(direction: str) -> dict[str, Any]:
    """Plan workbench zooming."""
    return {"tool": "zoom", "args": {"direction": direction}}


def run_terminal_command_tool(command: str) -> dict[str, Any]:
    """Plan sending a shell command to the VSCode terminal."""
    return {"tool": "runTerminalCommand", "args": {"command": command}}


def read_context_tool() -> dict[str, Any]:
    """Plan reading the current VSCode context."""
    return {"tool": "readContext", "args": {}}


def save_active_file_tool() -> dict[str, Any]:
    """Plan saving the active editor."""
    return {"tool": "saveActiveFile", "args": {}}
