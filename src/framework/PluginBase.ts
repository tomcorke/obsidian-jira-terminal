/**
 * PluginBase - abstract Plugin subclass that wires an AdapterBundle to
 * the framework lifecycle: view registration, commands, settings, hot-reload.
 */
import { Plugin } from "obsidian";
import type { AdapterBundle } from "../core/interfaces";

export const VIEW_TYPE = "work-terminal-view";

export abstract class PluginBase extends Plugin {
  protected adapter: AdapterBundle;
  private _isReloading = false;

  constructor(app: any, manifest: any, adapter: AdapterBundle) {
    super(app, manifest);
    this.adapter = adapter;
  }

  async onload(): Promise<void> {
    // Defer view/settings registration to allow lazy imports
    const { MainView } = await import("./MainView");
    const { WorkTerminalSettingsTab } = await import("./SettingsTab");

    this.registerView(VIEW_TYPE, (leaf) => new MainView(leaf, this.adapter, this));

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

    this.addSettingTab(new WorkTerminalSettingsTab(this.app, this, this.adapter));
  }

  async activateView(): Promise<void> {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(VIEW_TYPE)[0];
    if (!leaf) {
      const newLeaf = workspace.getLeaf("tab");
      await newLeaf.setViewState({ type: VIEW_TYPE, active: true });
      leaf = newLeaf;
    }
    workspace.revealLeaf(leaf);
  }

  async hotReload(): Promise<void> {
    this._isReloading = true;
    console.log("[work-terminal] Hot reload...");

    // MainView.prepareReload() is called by onClose when _isReloading is true
    // The view checks the plugin's isReloading flag via the reference we pass

    const plugins = (this.app as any).plugins;
    await plugins.disablePlugin("work-terminal");
    await plugins.enablePlugin("work-terminal");
    console.log("[work-terminal] Hot reload complete");
  }

  get isReloading(): boolean {
    return this._isReloading;
  }

  onunload(): void {
    // cleanup handled by individual views
  }
}
