/**
 * JiraAdapter - adapter for the work-terminal framework that connects to
 * a Jira Kanban board. Fetches issues via REST API and caches them as
 * vault markdown files.
 *
 * Uses the framework's onLoad() hook for async initialization and receives
 * settings directly from createParser/createMover factory methods.
 */
import type { App, WorkspaceLeaf } from "obsidian";
import {
  BaseAdapter,
  type WorkItem,
  type WorkItemParser,
  type WorkItemMover,
  type CardRenderer,
  type WorkItemPromptBuilder,
  type PluginConfig,
} from "../../core/interfaces";
import { JIRA_CONFIG } from "./JiraConfig";
import { JiraParser } from "./JiraParser";
import { JiraMover } from "./JiraMover";
import { JiraCard } from "./JiraCard";
import { JiraPromptBuilder } from "./JiraPromptBuilder";
import { JiraSync } from "./JiraSync";

export class JiraAdapter extends BaseAdapter {
  config: PluginConfig = JIRA_CONFIG;

  private sync: JiraSync | null = null;
  private _parser: JiraParser | null = null;

  /**
   * Async initialization hook called by the framework before
   * createParser/createMover. Starts JiraSync with real settings.
   */
  async onLoad(app: App, settings: Record<string, unknown>): Promise<void> {
    const s = settings as Record<string, any>;
    this.sync = new JiraSync(app, s);
    this.sync.sync();
    this.sync.startPolling();

    // Listen for single-issue refresh requests from context menu
    document.addEventListener("jira-terminal:refresh-issue", ((e: CustomEvent) => {
      const key = e.detail?.key;
      if (key && this.sync) {
        this.sync.syncOne(key);
      }
    }) as EventListener);
  }

  /**
   * Create parser for loading/parsing work items from the vault.
   * Settings are provided by the framework - no need to reconstruct them.
   */
  createParser(app: App, basePath: string, settings?: Record<string, unknown>): WorkItemParser {
    const s = (settings || {}) as Record<string, any>;

    // Cache parser to avoid recreating on every refresh cycle
    if (!this._parser) {
      this._parser = new JiraParser(app, basePath, s);
    }
    return this._parser;
  }

  createMover(app: App, basePath: string, settings?: Record<string, unknown>): WorkItemMover {
    const s = (settings || {}) as Record<string, any>;
    if (!this.sync) {
      this.sync = new JiraSync(app, s);
    }
    return new JiraMover(app, basePath, s, this.sync);
  }

  createCardRenderer(): CardRenderer {
    return new JiraCard();
  }

  createPromptBuilder(): WorkItemPromptBuilder {
    return new JiraPromptBuilder();
  }

  /**
   * Handle new item creation via PromptBox.
   * For Jira, we don't create issues from the terminal - just show a notice.
   * Users should create issues in Jira directly.
   */
  async onItemCreated(
    title: string,
    settings: Record<string, unknown>
  ): Promise<{ id: string; columnId: string } | void> {
    // Could create a Jira issue here in future, but for now just inform the user
    const { Notice } = await import("obsidian");
    new Notice("Create tickets in Jira directly. They will appear here on next sync.");
    return;
  }

  transformSessionLabel(
    _oldLabel: string,
    detectedLabel: string
  ): string {
    return detectedLabel;
  }
}
