/**
 * Entry point: concrete plugin class with Jira adapter.
 */
import type { App, PluginManifest } from "obsidian";
import { PluginBase } from "./framework/PluginBase";
import { JiraAdapter } from "./adapters/jira";

export default class JiraTerminalPlugin extends PluginBase {
  constructor(app: App, manifest: PluginManifest) {
    super(app, manifest, new JiraAdapter());
  }
}
