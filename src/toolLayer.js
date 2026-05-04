"use strict";

class VscodeToolLayer {
  constructor(vscode) {
    this.vscode = vscode;
  }

  async execute(step) {
    const handler = this[step.tool];
    if (typeof handler !== "function") {
      throw new Error(`Unknown tool: ${step.tool}`);
    }
    return handler.call(this, step.args || {});
  }

  async openFile({ query }) {
    const vscode = this.vscode;
    const matches = await vscode.workspace.findFiles(`**/${query}`, "**/node_modules/**", 20);
    const target = matches[0] || vscode.Uri.joinPath(this.workspaceRoot(), query);
    const document = await vscode.workspace.openTextDocument(target);
    await vscode.window.showTextDocument(document);
    return { ok: true, message: `Opened ${vscode.workspace.asRelativePath(target)}` };
  }

  async createFile({ path: filePath }) {
    const vscode = this.vscode;
    const target = vscode.Uri.joinPath(this.workspaceRoot(), filePath);
    await this.ensureParentDirectory(target);
    try {
      await vscode.workspace.fs.stat(target);
    } catch (_error) {
      await vscode.workspace.fs.writeFile(target, Buffer.from("", "utf8"));
    }
    const document = await vscode.workspace.openTextDocument(target);
    await vscode.window.showTextDocument(document);
    return { ok: true, message: `Created ${filePath}` };
  }

  async saveActiveFile() {
    const editor = this.requireEditor();
    const saved = await editor.document.save();
    return { ok: saved, message: saved ? "Saved active file" : "Save failed" };
  }

  async insertAtLine({ line, content }) {
    const vscode = this.vscode;
    const editor = this.requireEditor();
    const targetLine = clamp(Number(line) - 1, 0, editor.document.lineCount);
    const text = inferInsertText(content, editor.document.languageId);
    const position = new vscode.Position(targetLine, 0);
    const inserted = await editor.edit((editBuilder) => {
      editBuilder.insert(position, `${text}\n`);
    });
    return {
      ok: inserted,
      message: inserted ? `Inserted at line ${line}` : `Insert failed at line ${line}`
    };
  }

  async scroll({ direction, amount }) {
    const vscode = this.vscode;
    const command = direction === "up" ? "editorScrollUp" : "editorScrollDown";
    await vscode.commands.executeCommand(command, { to: direction, by: "line", value: amount || 4 });
    return { ok: true, message: `Scrolled ${direction}` };
  }

  async zoom({ direction }) {
    const vscode = this.vscode;
    const command = direction === "out" ? "workbench.action.zoomOut" : "workbench.action.zoomIn";
    await vscode.commands.executeCommand(command);
    return { ok: true, message: `Zoomed ${direction}` };
  }

  async runTerminalCommand({ command }) {
    const vscode = this.vscode;
    const terminal = vscode.window.createTerminal("Voice Agent");
    terminal.show();
    terminal.sendText(command);
    return { ok: true, message: `Sent to terminal: ${command}` };
  }

  async readContext() {
    const vscode = this.vscode;
    const editor = vscode.window.activeTextEditor;
    const diagnostics = editor
      ? vscode.languages.getDiagnostics(editor.document.uri)
      : [];
    const workspaceFolders = vscode.workspace.workspaceFolders || [];
    const context = {
      activeFile: editor ? vscode.workspace.asRelativePath(editor.document.uri) : null,
      selection: editor ? editor.document.getText(editor.selection) : "",
      line: editor ? editor.selection.active.line + 1 : null,
      diagnostics: diagnostics.map((item) => ({
        message: item.message,
        severity: item.severity,
        line: item.range.start.line + 1
      })),
      workspace: workspaceFolders.map((folder) => folder.name)
    };
    return { ok: true, message: "Read current context", context };
  }

  requireEditor() {
    const editor = this.vscode.window.activeTextEditor;
    if (!editor) {
      throw new Error("No active editor");
    }
    return editor;
  }

  workspaceRoot() {
    const vscode = this.vscode;
    const root = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0];
    if (!root) {
      throw new Error("No workspace folder is open");
    }
    return root.uri;
  }

  async ensureParentDirectory(uri) {
    const vscode = this.vscode;
    const parentPath = uri.path.replace(/\/[^/]*$/, "");
    if (!parentPath || parentPath === uri.path) {
      return;
    }
    await vscode.workspace.fs.createDirectory(uri.with({ path: parentPath }));
  }
}

function inferInsertText(content, languageId) {
  const text = String(content || "").trim();
  if (/함수/.test(text) && !/[{}]/.test(text)) {
    const name = text.match(/([A-Za-z_][A-Za-z0-9_]*)/)?.[1] || "generatedFunction";
    if (languageId === "python") {
      return `def ${name}():\n    pass`;
    }
    return `function ${name}() {\n  // TODO: implement\n}`;
  }
  return text;
}

function clamp(value, min, max) {
  if (Number.isNaN(value)) {
    return min;
  }
  return Math.max(min, Math.min(value, max));
}

module.exports = {
  VscodeToolLayer,
  inferInsertText
};
