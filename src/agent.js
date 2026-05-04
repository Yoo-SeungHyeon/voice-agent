"use strict";

function parseVoiceCommand(input) {
  const text = normalize(input);
  if (!text) {
    return {
      kind: "unknown",
      summary: "명령이 비어 있습니다.",
      steps: []
    };
  }

  const openFile = matchOpenFile(text);
  if (openFile) {
    return plan("파일 열기", [{ tool: "openFile", args: { query: openFile } }]);
  }

  const createFile = matchCreateFile(text);
  if (createFile) {
    return plan("파일 생성", [{ tool: "createFile", args: { path: createFile } }]);
  }

  const lineInsert = matchLineInsert(text);
  if (lineInsert) {
    return plan("라인에 코드 추가", [
      {
        tool: "insertAtLine",
        args: {
          line: lineInsert.line,
          content: lineInsert.content
        }
      }
    ]);
  }

  const terminalCommand = matchTerminalCommand(text);
  if (terminalCommand) {
    return plan("터미널 명령 실행", [
      { tool: "runTerminalCommand", args: { command: terminalCommand } }
    ]);
  }

  if (/(저장|save)/i.test(text)) {
    return plan("파일 저장", [{ tool: "saveActiveFile", args: {} }]);
  }

  if (/(아래|내려|down|scroll down)/i.test(text)) {
    return plan("화면 아래로 스크롤", [{ tool: "scroll", args: { direction: "down", amount: 4 } }]);
  }

  if (/(위|올려|up|scroll up)/i.test(text)) {
    return plan("화면 위로 스크롤", [{ tool: "scroll", args: { direction: "up", amount: 4 } }]);
  }

  if (/(크게|확대|zoom in)/i.test(text)) {
    return plan("화면 확대", [{ tool: "zoom", args: { direction: "in" } }]);
  }

  if (/(작게|축소|zoom out)/i.test(text)) {
    return plan("화면 축소", [{ tool: "zoom", args: { direction: "out" } }]);
  }

  if (/(컨텍스트|상태|diagnostic|진단|git)/i.test(text)) {
    return plan("현재 컨텍스트 읽기", [{ tool: "readContext", args: {} }]);
  }

  return {
    kind: "unknown",
    summary: "지원하지 않는 명령입니다.",
    steps: [],
    originalText: input
  };
}

function normalize(input) {
  return String(input || "").trim().replace(/\s+/g, " ");
}

function plan(summary, steps) {
  return {
    kind: "tool-plan",
    summary,
    steps
  };
}

function matchOpenFile(text) {
  const match = text.match(/([^\s]+?\.[A-Za-z0-9_]+)\s*(?:열어|열기|open)/i)
    || text.match(/(?:열어|열기|open)\s+([^\s]+?\.[A-Za-z0-9_]+)/i);
  return match ? stripQuotes(match[1]) : null;
}

function matchCreateFile(text) {
  const match = text.match(/([^\s]+?\.[A-Za-z0-9_/-]+)\s*(?:만들어|생성|create)/i)
    || text.match(/(?:만들어|생성|create)\s+([^\s]+?\.[A-Za-z0-9_/-]+)/i);
  return match ? stripQuotes(match[1]) : null;
}

function matchLineInsert(text) {
  const match = text.match(/(\d+)\s*번?\s*라인(?:에|으로)?\s+(.+?)(?:\s*(?:추가|넣어|삽입|add|insert))?$/i);
  if (!match) {
    return null;
  }

  return {
    line: Number(match[1]),
    content: cleanCodePhrase(match[2])
  };
}

function matchTerminalCommand(text) {
  const match = text.match(/(?:터미널|terminal)(?:에서)?\s+(.+?)(?:\s*(?:실행|run))?$/i);
  return match ? match[1].trim() : null;
}

function cleanCodePhrase(value) {
  return stripQuotes(value)
    .replace(/\s*(?:추가해|추가|넣어줘|넣어|삽입해|삽입|add|insert)$/i, "")
    .trim();
}

function stripQuotes(value) {
  return String(value || "").trim().replace(/^["'`“”‘’]+|["'`“”‘’]+$/g, "");
}

module.exports = {
  parseVoiceCommand
};
