/**
 * JiraAdapter - adapter for the work-terminal framework that connects to
 * a Jira Kanban board. Fetches issues via REST API and caches them as
 * vault markdown files.
 *
 * Uses the framework's onLoad() hook for async initialization and receives
 * settings directly from createParser/createMover factory methods.
 */
import type { App } from "obsidian";
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
  private _requestRefresh?: () => void;

  /**
   * Override requestRefresh so that when the framework assigns the callback
   * (after onLoad returns), we automatically forward it to JiraSync.
   */
  get requestRefresh(): (() => void) | undefined {
    return this._requestRefresh;
  }

  set requestRefresh(fn: (() => void) | undefined) {
    this._requestRefresh = fn;
    if (fn && this.sync) {
      this.sync.setRequestRefresh(fn);
    }
  }

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
   * The framework caches the parser instance (created once in initPanels,
   * reused in refreshList), so no adapter-side caching is needed.
   */
  createParser(app: App, basePath: string, settings?: Record<string, unknown>): WorkItemParser {
    const s = (settings || {}) as Record<string, any>;
    return new JiraParser(app, basePath, s);
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
    _title: string,
    _settings: Record<string, unknown>,
  ): Promise<{ id: string; columnId: string } | void> {
    // Could create a Jira issue here in future, but for now just inform the user
    const { Notice } = await import("obsidian");
    new Notice("Create tickets in Jira directly. They will appear here on next sync.");
    return;
  }

  /**
   * Handle item deletion. Allow vault.trash() for cache files since they
   * are just local mirrors of Jira data and will be recreated on next sync.
   * The Jira issue itself is NOT deleted.
   */
  async onDelete(item: WorkItem): Promise<boolean> {
    const jiraKey = item.metadata?.jiraKey;
    if (jiraKey) {
      console.log(
        `[jira-terminal] Deleting local cache for ${jiraKey} - Jira issue is NOT deleted`,
      );
    }
    return true;
  }

  /**
   * Adapter-contributed CSS injected by the framework into document.head.
   * Provides Jira-specific section header colors, issue type badge colors,
   * and priority badge colors.
   */
  getStyles(): string {
    return `
      /* Section header colors by column */
      .wt-section-header-new { border-bottom-color: var(--text-muted); }
      .wt-section-header-in-progress { border-bottom-color: var(--interactive-accent); }
      .wt-section-header-ready-for-test { border-bottom-color: #e5a100; }
      .wt-section-header-testing { border-bottom-color: #8b5cf6; }
      .wt-section-header-done { border-bottom-color: #38a169; }

      /* Issue type badge colors */
      .jira-type-bug { background: #e5484d; color: white; }
      .jira-type-story { background: #30a46c; color: white; }
      .jira-type-task { background: #3b82f6; color: white; }
      .jira-type-epic { background: #8b5cf6; color: white; }
      .jira-type-deliverable { background: #d946ef; color: white; }
      .jira-type-sub-task { background: #6b7280; color: white; }

      /* Priority badge colors */
      .jira-priority-highest { background: #e5484d; color: white; }
      .jira-priority-high { background: #f76b15; color: white; }
      .jira-priority-medium { background: #e5a100; color: white; }
      .jira-priority-low { background: #3b82f6; color: white; }
      .jira-priority-lowest { background: #6b7280; color: white; }
    `;
  }

  transformSessionLabel(_oldLabel: string, detectedLabel: string): string {
    return detectedLabel;
  }
}
