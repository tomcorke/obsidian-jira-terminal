import { Plugin, ItemView, WorkspaceLeaf } from "obsidian";

const VIEW_TYPE = "work-terminal-view";

// Use dynamic require for Node builtins in Electron
declare global {
  interface Window {
    require?: NodeRequire;
  }
}

function getSpawn(): typeof import("child_process").spawn {
  const cp = window.require ? window.require("child_process") : require("child_process");
  return cp.spawn;
}

function expandTilde(p: string): string {
  const home = process.env.HOME || process.env.USERPROFILE || "";
  if (p === "~") return home;
  if (p.startsWith("~/")) return home + p.slice(1);
  return p;
}

// Singleton xterm CSS injection
let xtermCssInjected = false;
function injectXtermCss(): void {
  if (xtermCssInjected) return;
  xtermCssInjected = true;
  const style = document.createElement("style");
  style.id = "xterm-css-work-terminal";
  style.textContent = `
.xterm { cursor: text; position: relative; user-select: none; -ms-user-select: none; -webkit-user-select: none; }
.xterm.focus, .xterm:focus { outline: none; }
.xterm .xterm-helpers { position: absolute; top: 0; z-index: 5; }
.xterm .xterm-helper-textarea { padding: 0; border: 0; margin: 0; position: absolute; opacity: 0; left: -9999em; top: 0; width: 0; height: 0; z-index: -5; white-space: nowrap; overflow: hidden; resize: none; }
.xterm .composition-view { background: #000; color: #FFF; display: none; position: absolute; white-space: nowrap; z-index: 1; }
.xterm .composition-view.active { display: block; }
.xterm .xterm-viewport { background-color: #000; overflow-y: scroll; cursor: default; position: absolute; right: 0; left: 0; top: 0; bottom: 0; }
.xterm .xterm-screen { position: relative; }
.xterm .xterm-screen canvas { position: absolute; left: 0; top: 0; }
.xterm .xterm-scroll-area { visibility: hidden; }
.xterm-char-measure-element { display: inline-block; visibility: hidden; position: absolute; top: 0; left: -9999em; line-height: normal; }
.xterm.enable-mouse-events { cursor: default; }
.xterm.xterm-cursor-pointer, .xterm .xterm-cursor-pointer { cursor: pointer; }
.xterm.column-select.focus { cursor: crosshair; }
.xterm .xterm-accessibility:not(.debug), .xterm .xterm-message { position: absolute; left: 0; top: 0; bottom: 0; right: 0; z-index: 10; color: transparent; pointer-events: none; }
.xterm .xterm-accessibility-tree:not(.debug) *::selection { color: transparent; }
.xterm .xterm-accessibility-tree { user-select: text; white-space: pre; }
.xterm .live-region { position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden; }
.xterm-dim { opacity: 1 !important; }
.xterm-underline-1 { text-decoration: underline; }
.xterm-underline-2 { text-decoration: double underline; }
.xterm-underline-3 { text-decoration: wavy underline; }
.xterm-underline-4 { text-decoration: dotted underline; }
.xterm-underline-5 { text-decoration: dashed underline; }
.xterm-overline { text-decoration: overline; }
.xterm-strikethrough { text-decoration: line-through; }
.xterm-screen .xterm-decoration-container .xterm-decoration { z-index: 6; position: absolute; }
.xterm-screen .xterm-decoration-container .xterm-decoration.xterm-decoration-top-layer { z-index: 7; }
.xterm-decoration-overview-ruler { z-index: 8; position: absolute; top: 0; right: 0; pointer-events: none; }
.xterm-decoration-top { z-index: 2; position: relative; }
  `;
  document.head.appendChild(style);
}

class WorkTerminalView extends ItemView {
  private process: import("child_process").ChildProcess | null = null;
  private terminal: import("@xterm/xterm").Terminal | null = null;
  private fitAddon: import("@xterm/addon-fit").FitAddon | null = null;
  private resizeObserver: ResizeObserver | null = null;

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType(): string { return VIEW_TYPE; }
  getDisplayText(): string { return "Work Terminal"; }
  getIcon(): string { return "terminal"; }

  async onOpen(): Promise<void> {
    const container = this.contentEl;
    container.empty();
    container.style.display = "flex";
    container.style.height = "100%";

    // Left panel placeholder
    const leftPanel = container.createDiv({ cls: "wt-left-panel" });
    leftPanel.style.width = "250px";
    leftPanel.style.flexShrink = "0";
    leftPanel.style.borderRight = "1px solid var(--background-modifier-border)";
    leftPanel.createEl("div", { text: "Work items will appear here", cls: "wt-placeholder" });
    const placeholder = leftPanel.querySelector(".wt-placeholder") as HTMLElement;
    if (placeholder) {
      placeholder.style.cssText = "padding: 16px; color: var(--text-muted); font-size: 12px;";
    }

    // Right panel - terminal
    const rightPanel = container.createDiv({ cls: "wt-right-panel" });
    rightPanel.style.flex = "1";
    rightPanel.style.overflow = "hidden";
    rightPanel.style.position = "relative";

    const termContainer = rightPanel.createDiv({ cls: "wt-terminal-container" });
    termContainer.style.width = "100%";
    termContainer.style.height = "100%";

    // Spawn terminal after a brief delay to let layout settle
    setTimeout(() => this.spawnTerminal(termContainer), 150);
  }

  private async spawnTerminal(containerEl: HTMLElement): Promise<void> {
    const { Terminal } = await import("@xterm/xterm");
    const { FitAddon } = await import("@xterm/addon-fit");

    injectXtermCss();

    this.terminal = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: "Menlo, Monaco, 'Courier New', monospace",
      macOptionIsMeta: true,
      theme: {
        background: "#1e1e1e",
        foreground: "#d4d4d4",
        cursor: "#d4d4d4",
        selectionBackground: "#264f78",
      },
      allowProposedApi: true,
    });

    this.fitAddon = new FitAddon();
    this.terminal.loadAddon(this.fitAddon);
    this.terminal.open(containerEl);

    // Double-rAF for correct fitAddon measurements
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        try { this.fitAddon?.fit(); } catch { /* silent */ }
        this.spawnPty();
      });
    });

    // Resize observer
    this.resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        if (!this.terminal || !this.fitAddon) return;
        try { this.fitAddon.fit(); } catch { /* silent */ }
        if (this.process && this.terminal.cols && this.terminal.rows) {
          const resizeSeq = `\x1b]777;resize;${this.terminal.cols};${this.terminal.rows}\x07`;
          this.process.stdin?.write(resizeSeq);
        }
      });
    });
    this.resizeObserver.observe(containerEl);

    // Keyboard capture - prevent Obsidian from intercepting
    containerEl.addEventListener("keydown", (e: KeyboardEvent) => { e.stopPropagation(); }, false);
    containerEl.addEventListener("keyup", (e: KeyboardEvent) => { e.stopPropagation(); }, false);
  }

  private spawnPty(): void {
    if (!this.terminal) return;

    const spawn = getSpawn();
    const home = expandTilde("~");
    const shell = process.env.SHELL || "/bin/zsh";

    // Find pty-wrapper.py - it's in the plugin's source directory
    const path = window.require ? window.require("path") : require("path");
    const fs = window.require ? window.require("fs") : require("fs");

    // Look for pty-wrapper.py in several locations
    let ptyWrapperPath = "";
    const candidates = [
      path.join(home, "working/obsidian-work-terminal/pty-wrapper.py"),
      path.join(__dirname, "pty-wrapper.py"),
      path.join(__dirname, "../pty-wrapper.py"),
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) {
        ptyWrapperPath = c;
        break;
      }
    }
    if (!ptyWrapperPath) {
      this.terminal.write("\r\n\x1b[31mError: pty-wrapper.py not found\x1b[0m\r\n");
      return;
    }

    const cols = this.terminal.cols || 80;
    const rows = this.terminal.rows || 24;

    this.process = spawn("python3", [ptyWrapperPath, String(cols), String(rows), "--", shell, "-i"], {
      cwd: home,
      env: { ...process.env, TERM: "xterm-256color" },
    });

    this.process.stdout?.on("data", (data: Buffer) => {
      this.terminal?.write(data);
    });

    this.process.stderr?.on("data", (data: Buffer) => {
      this.terminal?.write(data);
    });

    this.terminal.onData((data: string) => {
      this.process?.stdin?.write(data);
    });

    this.process.on("exit", () => {
      this.terminal?.write("\r\n\x1b[90m[Process exited]\x1b[0m\r\n");
    });
  }

  async onClose(): Promise<void> {
    this.resizeObserver?.disconnect();
    if (this.process) {
      try {
        this.process.kill("SIGTERM");
        setTimeout(() => {
          try { this.process?.kill("SIGKILL"); } catch { /* already dead */ }
        }, 1000);
      } catch { /* already dead */ }
    }
    this.terminal?.dispose();
  }
}

export default class WorkTerminalPlugin extends Plugin {
  async onload(): Promise<void> {
    this.registerView(VIEW_TYPE, (leaf) => new WorkTerminalView(leaf));
    this.addRibbonIcon("terminal", "Work Terminal", () => this.activateView());
    this.addCommand({
      id: "open-work-terminal",
      name: "Open Work Terminal",
      callback: () => this.activateView(),
    });
    this.addCommand({
      id: "reload-plugin",
      name: "Reload Plugin (preserve terminals)",
      callback: () => this.hotReload(),
    });
  }

  private async activateView(): Promise<void> {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(VIEW_TYPE)[0];
    if (!leaf) {
      const newLeaf = workspace.getLeaf("tab");
      await newLeaf.setViewState({ type: VIEW_TYPE, active: true });
      leaf = newLeaf;
    }
    workspace.revealLeaf(leaf);
  }

  private async hotReload(): Promise<void> {
    console.log("[work-terminal] Hot reload...");
    const plugins = (this.app as any).plugins;
    await plugins.disablePlugin("work-terminal");
    await plugins.enablePlugin("work-terminal");
    console.log("[work-terminal] Hot reload complete");
  }

  onunload(): void {}
}
