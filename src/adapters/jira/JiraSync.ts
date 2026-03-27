/**
 * JiraSync - fetches issues from Jira API and syncs them to vault cache files.
 *
 * Uses the framework's requestRefresh callback (set by the adapter) to trigger
 * a single debounced UI refresh after sync completes, rather than relying on
 * individual vault file change events.
 */
import type { App, TFile } from "obsidian";
import { Notice } from "obsidian";
import { JiraClient } from "./JiraClient";
import { generateCacheContent, updateCacheContent, getCacheFilePath } from "./JiraCacheFile";
import { type JiraIssue, STATUS_TO_COLUMN, KANBAN_COLUMNS, COLUMN_FOLDERS } from "./types";

export class JiraSync {
  private client: JiraClient;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private isSyncing = false;
  private _requestRefresh: (() => void) | null = null;

  /**
   * Set the framework-provided refresh callback. Called by the adapter
   * when the framework assigns requestRefresh to the AdapterBundle.
   */
  setRequestRefresh(fn: () => void): void {
    this._requestRefresh = fn;
  }

  constructor(
    private app: App,
    private settings: Record<string, any>,
  ) {
    const baseUrl = settings["adapter.jiraBaseUrl"] || "https://skyscanner.atlassian.net";
    const username = settings["adapter.jiraUsername"] || "";
    this.client = new JiraClient(baseUrl, username);
  }

  get basePath(): string {
    return this.settings["adapter.jiraCachePath"] || "Jira/Castle Greenflag";
  }

  /**
   * Run a full sync: fetch from Jira, create/update/move cache files.
   */
  async sync(): Promise<void> {
    if (this.isSyncing) return;
    this.isSyncing = true;

    try {
      const { jql, useAgileApi } = this.getJqlAndEndpoint();
      let issues;

      if (useAgileApi) {
        const boardId = this.settings["adapter.jiraBoardId"];
        console.log("[jira-terminal] Syncing board", boardId);
        issues = await this.client.getBoardIssues(boardId);
      } else {
        console.log("[jira-terminal] Syncing with JQL:", jql);
        issues = await this.client.searchIssues(jql);
      }
      console.log("[jira-terminal] Fetched", issues.length, "issues");

      await this.ensureFolders();
      await this.reconcile(issues);

      console.log("[jira-terminal] Sync complete");

      // Trigger a single debounced UI refresh instead of relying on
      // individual vault file change events from each cache write
      if (this._requestRefresh) {
        this._requestRefresh();
      }
    } catch (err: any) {
      console.error("[jira-terminal] Sync failed:", err);
      new Notice(`Jira sync failed: ${err.message || err}`);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Sync a single issue by key (for manual refresh).
   */
  async syncOne(key: string): Promise<void> {
    try {
      const issue = await this.client.getIssue(key);
      await this.ensureFolders();
      await this.reconcileOne(issue);
      if (this._requestRefresh) {
        this._requestRefresh();
      }
    } catch (err: any) {
      console.error("[jira-terminal] Single sync failed:", err);
      new Notice(`Failed to refresh ${key}: ${err.message || err}`);
    }
  }

  /**
   * Start the polling loop.
   */
  startPolling(): void {
    const seconds = parseInt(this.settings["adapter.jiraPollSeconds"] || "120", 10);
    if (seconds <= 0) return;

    this.stopPolling();
    this.pollTimer = setInterval(() => this.sync(), seconds * 1000);
    console.log("[jira-terminal] Polling every", seconds, "seconds");
  }

  /**
   * Stop the polling loop.
   */
  stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  /**
   * Get the JiraClient for direct API calls (e.g. transitions).
   */
  getClient(): JiraClient {
    return this.client;
  }

  private getJqlAndEndpoint(): { jql: string; useAgileApi: boolean } {
    const custom = this.settings["adapter.jiraJql"];
    if (custom) return { jql: custom, useAgileApi: false };

    // Use the board ID from settings to scope issues to the configured board
    const boardId = this.settings["adapter.jiraBoardId"];
    if (boardId) {
      return { jql: "", useAgileApi: true };
    }

    return { jql: "status != Done ORDER BY Rank ASC", useAgileApi: false };
  }

  private async ensureFolders(): Promise<void> {
    for (const col of KANBAN_COLUMNS) {
      const folderPath = `${this.basePath}/${COLUMN_FOLDERS[col]}`;
      const exists = this.app.vault.getAbstractFileByPath(folderPath);
      if (!exists) {
        await this.app.vault.createFolder(folderPath);
      }
    }
  }

  /**
   * Reconcile fetched issues with cache files.
   *
   * Framework coupling issue: there's no way to batch-update the UI.
   * Each vault.create/modify/rename fires a separate vault event, causing
   * the framework to re-parse and re-render for every single file change.
   * A better framework would allow batched updates.
   */
  private async reconcile(issues: JiraIssue[]): Promise<void> {
    const issuesByKey = new Map<string, JiraIssue>();
    for (const issue of issues) {
      issuesByKey.set(issue.key, issue);
    }

    // Find existing cache files
    const existingFiles = new Map<string, TFile>();
    for (const col of KANBAN_COLUMNS) {
      const folderPath = `${this.basePath}/${COLUMN_FOLDERS[col]}`;
      const files = this.app.vault
        .getMarkdownFiles()
        .filter((f) => f.path.startsWith(folderPath + "/"));
      for (const file of files) {
        const key = file.basename; // filename without .md = JIRA key
        existingFiles.set(key, file);
      }
    }

    // Create or update
    for (const issue of issues) {
      await this.reconcileOne(issue, existingFiles.get(issue.key));
    }

    // Mark stale: files in cache but not in API results
    // (Don't delete - move to _stale folder for manual review)
    for (const [key, file] of existingFiles) {
      if (!issuesByKey.has(key)) {
        const stalePath = `${this.basePath}/_stale/${file.name}`;
        const staleFolder = this.app.vault.getAbstractFileByPath(`${this.basePath}/_stale`);
        if (!staleFolder) {
          await this.app.vault.createFolder(`${this.basePath}/_stale`);
        }
        console.log("[jira-terminal] Staling:", key);
        await this.app.vault.rename(file, stalePath);
      }
    }
  }

  private async reconcileOne(issue: JiraIssue, existingFile?: TFile): Promise<void> {
    const targetColumn = STATUS_TO_COLUMN[issue.status] || "new";
    const targetPath = getCacheFilePath(this.basePath, targetColumn, issue.key);

    if (!existingFile) {
      // Search across all columns
      for (const col of KANBAN_COLUMNS) {
        const path = getCacheFilePath(this.basePath, col, issue.key);
        const file = this.app.vault.getAbstractFileByPath(path);
        if (file) {
          existingFile = file as TFile;
          break;
        }
      }
    }

    if (!existingFile) {
      // New issue - create cache file
      const content = generateCacheContent(issue);
      await this.app.vault.create(targetPath, content);
      console.log("[jira-terminal] Created cache:", issue.key);
      return;
    }

    // Existing - check if update needed
    const content = await this.app.vault.read(existingFile);
    const jiraUpdatedMatch = content.match(/^jira-updated:\s*"?(.+?)"?\s*$/m);
    const cachedUpdated = jiraUpdatedMatch ? jiraUpdatedMatch[1] : "";

    if (cachedUpdated === issue.updated && existingFile.path === targetPath) {
      // No changes
      return;
    }

    // Update content (preserves Local Notes section)
    const updated = updateCacheContent(content, issue);

    // Write-then-move pattern (same as TaskMover)
    await this.app.vault.modify(existingFile, updated);

    // Move file if status changed (and not pending transition)
    if (existingFile.path !== targetPath) {
      const pendingMatch = content.match(/^_pending-transition:\s*(.+)$/m);
      const isPending = pendingMatch && pendingMatch[1].trim() === "true";

      if (!isPending) {
        await this.app.vault.rename(existingFile, targetPath);
        console.log("[jira-terminal] Moved:", issue.key, "->", targetColumn);
      }
    }
  }
}
