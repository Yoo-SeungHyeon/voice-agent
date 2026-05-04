"use strict";

const assert = require("assert");
const { parseVoiceCommand } = require("../src/agent");
const { inferInsertText } = require("../src/toolLayer");

const cases = [
  {
    input: "main.py 열어",
    tool: "openFile",
    args: { query: "main.py" }
  },
  {
    input: "화면 천천히 아래로 내려봐",
    tool: "scroll",
    args: { direction: "down" }
  },
  {
    input: "잠깐 화면 크게 보여줘",
    tool: "zoom",
    args: { direction: "in" }
  },
  {
    input: "33번 라인에 validate_user 함수 추가해",
    tool: "insertAtLine",
    args: { line: 33, content: "validate_user 함수" }
  },
  {
    input: "터미널에서 npm test 실행",
    tool: "runTerminalCommand",
    args: { command: "npm test" }
  }
];

for (const item of cases) {
  const plan = parseVoiceCommand(item.input);
  assert.equal(plan.kind, "tool-plan", item.input);
  assert.equal(plan.steps[0].tool, item.tool, item.input);
  for (const [key, value] of Object.entries(item.args)) {
    assert.equal(plan.steps[0].args[key], value, item.input);
  }
}

assert.equal(inferInsertText("validate_user 함수", "python"), "def validate_user():\n    pass");
assert.equal(
  inferInsertText("validateUser 함수", "javascript"),
  "function validateUser() {\n  // TODO: implement\n}"
);

console.log("agent parser tests passed");
