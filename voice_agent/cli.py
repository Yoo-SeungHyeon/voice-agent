"""Command-line JSON bridge used by the VSCode extension."""

from __future__ import annotations

import argparse
import json
import sys

from voice_agent.agent import VoiceAgent


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Plan VSCode tool calls from a voice command.")
    parser.add_argument("--command", "-c", required=True, help="Natural-language command to plan.")
    parser.add_argument(
        "--no-agno",
        action="store_true",
        help="Disable Agno facade creation and use only the deterministic planner.",
    )
    args = parser.parse_args(argv)

    agent = VoiceAgent(use_agno=not args.no_agno)
    plan = agent.plan(args.command)
    json.dump(plan.to_dict(), sys.stdout, ensure_ascii=False)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
