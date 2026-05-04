"use strict";

const cp = require("child_process");
const path = require("path");

async function planWithPython(vscode, extensionContext, command) {
  const config = vscode.workspace.getConfiguration("voiceAgent");
  const pythonPath = config.get("pythonPath") || "python";
  const cliArgs = [
    "-m",
    "voice_agent.cli",
    "--command",
    command
  ];
  const cwd = extensionContext.extensionPath || process.cwd();
  const env = {
    ...process.env,
    PYTHONIOENCODING: "utf-8",
    PYTHONPATH: mergePythonPath(cwd, process.env.PYTHONPATH)
  };

  return new Promise((resolve, reject) => {
    cp.execFile(pythonPath, cliArgs, { cwd, env, windowsHide: true }, (error, stdout, stderr) => {
      if (error) {
        error.message = stderr ? `${error.message}\n${stderr}` : error.message;
        reject(error);
        return;
      }
      try {
        resolve(JSON.parse(stdout));
      } catch (parseError) {
        parseError.message = `Python planner returned invalid JSON: ${parseError.message}`;
        reject(parseError);
      }
    });
  });
}

function mergePythonPath(projectRoot, currentPythonPath) {
  return currentPythonPath
    ? `${projectRoot}${path.delimiter}${currentPythonPath}`
    : projectRoot;
}

module.exports = {
  planWithPython
};
