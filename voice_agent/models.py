"""Serializable command plan models shared by the CLI and VSCode bridge."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal


@dataclass(frozen=True)
class ToolStep:
    tool: str
    args: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {"tool": self.tool, "args": self.args}


@dataclass(frozen=True)
class CommandPlan:
    kind: Literal["tool-plan", "unknown"]
    summary: str
    steps: list[ToolStep] = field(default_factory=list)
    original_text: str | None = None

    def to_dict(self) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "kind": self.kind,
            "summary": self.summary,
            "steps": [step.to_dict() for step in self.steps],
        }
        if self.original_text is not None:
            payload["originalText"] = self.original_text
        return payload
