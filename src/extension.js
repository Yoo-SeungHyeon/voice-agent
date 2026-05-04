"use strict";

const { parseVoiceCommand } = require("./agent");
const { planWithPython } = require("./pythonBridge");
const { VscodeToolLayer } = require("./toolLayer");

let statusBar;

function activate(vscodeContext) {
  const vscode = require("vscode");
  const tools = new VscodeToolLayer(vscode);

  statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBar.text = "$(megaphone) Voice Agent";
  statusBar.tooltip = "Open Voice Agent command panel";
  statusBar.command = "voiceAgent.openPanel";
  statusBar.show();

  vscodeContext.subscriptions.push(
    statusBar,
    vscode.commands.registerCommand("voiceAgent.openPanel", () => openPanel(vscode, vscodeContext, tools)),
    vscode.commands.registerCommand("voiceAgent.runCommand", () => promptAndRun(vscode, vscodeContext, tools)),
    vscode.commands.registerCommand("voiceAgent.showContext", () => showContext(vscode, tools)),
    vscode.commands.registerCommand("voiceAgent.connectExternalInput", () => showExternalInput(vscode))
  );
}

async function promptAndRun(vscode, vscodeContext, tools) {
  const command = await vscode.window.showInputBox({
    title: "Voice Agent",
    prompt: "실행할 자연어 명령을 입력하세요.",
    placeHolder: "예: main.py 열어, 33번 라인에 validate_user 함수 추가해"
  });
  if (command) {
    await runAgentCommand(vscode, vscodeContext, tools, command);
  }
}

async function runAgentCommand(vscode, vscodeContext, tools, command) {
  const plan = await getCommandPlan(vscode, vscodeContext, command);
  if (plan.kind !== "tool-plan") {
    vscode.window.showWarningMessage(`Voice Agent: ${plan.summary}`);
    return plan;
  }

  setStatus(`$(sync~spin) ${plan.summary}`);
  const results = [];
  try {
    for (const step of plan.steps) {
      results.push(await tools.execute(step));
    }
    const last = results[results.length - 1];
    setStatus("$(check) Voice Agent");
    vscode.window.showInformationMessage(`Voice Agent: ${last.message}`);
    return { plan, results };
  } catch (error) {
    setStatus("$(error) Voice Agent");
    vscode.window.showErrorMessage(`Voice Agent failed: ${error.message}`);
    return { plan, error };
  }
}

async function getCommandPlan(vscode, vscodeContext, command) {
  try {
    return await planWithPython(vscode, vscodeContext, command);
  } catch (error) {
    vscode.window.showWarningMessage(`Python planner unavailable; using JS fallback: ${error.message}`);
    return parseVoiceCommand(command);
  }
}

async function showContext(vscode, tools) {
  const result = await tools.readContext();
  const document = await vscode.workspace.openTextDocument({
    content: JSON.stringify(result.context, null, 2),
    language: "json"
  });
  await vscode.window.showTextDocument(document, { preview: true });
}

function showExternalInput(vscode) {
  const url = vscode.workspace.getConfiguration("voiceAgent").get("externalInputUrl");
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(url)}`;
  const panel = vscode.window.createWebviewPanel(
    "voiceAgentExternalInput",
    "Voice Agent External Input",
    vscode.ViewColumn.Beside,
    { enableScripts: false }
  );
  panel.webview.html = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: var(--vscode-font-family); padding: 24px; color: var(--vscode-foreground); }
    img { width: 220px; height: 220px; border: 1px solid var(--vscode-panel-border); }
    code { word-break: break-all; }
  </style>
</head>
<body>
  <h1>External Voice Input</h1>
  <p>향후 모바일 또는 외부 디바이스 음성 입력을 연결할 세션 URL입니다.</p>
  <img alt="External input QR code" src="${qrUrl}">
  <p><code>${escapeHtml(url)}</code></p>
</body>
</html>`;
}

function openPanel(vscode, vscodeContext, tools) {
  const panel = vscode.window.createWebviewPanel(
    "voiceAgentPanel",
    "Voice Agent",
    vscode.ViewColumn.Beside,
    { enableScripts: true, retainContextWhenHidden: true }
  );

  panel.webview.html = commandPanelHtml();
  panel.webview.onDidReceiveMessage(async (message) => {
    if (message.type !== "run" || !message.command) {
      return;
    }
    const result = await runAgentCommand(vscode, vscodeContext, tools, message.command);
    panel.webview.postMessage({
      type: "result",
      payload: summarizeRunResult(result)
    });
  }, undefined, vscodeContext.subscriptions);
}

function commandPanelHtml() {
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    :root { color-scheme: light dark; }
    body {
      margin: 0;
      padding: 20px;
      font-family: var(--vscode-font-family);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
    }
    .layout { display: grid; gap: 12px; max-width: 720px; }
    textarea {
      width: 100%;
      min-height: 108px;
      box-sizing: border-box;
      resize: vertical;
      color: var(--vscode-input-foreground);
      background: var(--vscode-input-background);
      border: 1px solid var(--vscode-input-border);
      padding: 10px;
      font: inherit;
    }
    .actions { display: flex; gap: 8px; flex-wrap: wrap; }
    button {
      color: var(--vscode-button-foreground);
      background: var(--vscode-button-background);
      border: 0;
      padding: 8px 12px;
      cursor: pointer;
    }
    button.secondary {
      color: var(--vscode-button-secondaryForeground);
      background: var(--vscode-button-secondaryBackground);
    }
    pre {
      min-height: 88px;
      white-space: pre-wrap;
      background: var(--vscode-textCodeBlock-background);
      padding: 12px;
      overflow: auto;
    }
  </style>
</head>
<body>
  <main class="layout">
    <h1>Voice Agent</h1>
    <textarea id="command" placeholder="main.py 열어&#10;33번 라인에 validate_user 함수 추가해&#10;화면 천천히 아래로 내려봐"></textarea>
    <div class="actions">
      <button id="run">Run</button>
      <button class="secondary" id="listen">Voice</button>
      <button class="secondary" id="stop">Stop</button>
    </div>
    <pre id="output">Ready</pre>
  </main>
  <script>
    const vscode = acquireVsCodeApi();
    const command = document.getElementById("command");
    const output = document.getElementById("output");
    let recognition;

    document.getElementById("run").addEventListener("click", () => {
      const value = command.value.trim();
      if (!value) return;
      output.textContent = "Running: " + value;
      vscode.postMessage({ type: "run", command: value });
    });

    document.getElementById("listen").addEventListener("click", () => {
      const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!Recognition) {
        output.textContent = "SpeechRecognition is not available in this VSCode webview.";
        return;
      }
      recognition = new Recognition();
      recognition.lang = "ko-KR";
      recognition.interimResults = false;
      recognition.onresult = (event) => {
        command.value = event.results[0][0].transcript;
        document.getElementById("run").click();
      };
      recognition.onerror = (event) => {
        output.textContent = "Voice error: " + event.error;
      };
      recognition.start();
      output.textContent = "Listening...";
    });

    document.getElementById("stop").addEventListener("click", () => {
      if (recognition) recognition.stop();
      output.textContent = "Stopped";
    });

    window.addEventListener("message", (event) => {
      if (event.data.type === "result") {
        output.textContent = event.data.payload;
      }
    });
  </script>
</body>
</html>`;
}

function summarizeRunResult(result) {
  if (!result) {
    return "No result";
  }
  if (result.error) {
    return `Failed: ${result.error.message}`;
  }
  if (result.plan && result.results) {
    return [
      result.plan.summary,
      ...result.results.map((item) => `- ${item.message}`)
    ].join("\n");
  }
  return JSON.stringify(result, null, 2);
}

function setStatus(text) {
  if (statusBar) {
    statusBar.text = text;
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function deactivate() {}

module.exports = {
  activate,
  deactivate
};
