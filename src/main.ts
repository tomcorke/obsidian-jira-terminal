/**
 * Entry point: concrete plugin class with hardcoded adapter import.
 * Currently uses a stub adapter for framework development/testing.
 * Phase 4 will replace this with the task-agent adapter.
 */
import type { App, PluginManifest } from "obsidian";
import { PluginBase } from "./framework/PluginBase";
import { StubAdapter } from "./adapters/stub";

export default class WorkTerminalPlugin extends PluginBase {
  constructor(app: App, manifest: PluginManifest) {
    super(app, manifest, new StubAdapter());
  }
}
