/**
 * JiraParser - parses cached Jira issue files into WorkItems.
 *
 * Settings are provided by the framework via createParser(app, basePath, settings).
 */
import type { App, TFile } from "obsidian";
import type { WorkItem, WorkItemParser } from "../../core/interfaces";
import {
  type KanbanColumn,
  KANBAN_COLUMNS,
  COLUMN_FOLDERS,
  STATUS_TO_COLUMN,
  type JiraStatus,
} from "./types";

export class JiraParser implements WorkItemParser {
  basePath: string;

  constructor(
    private app: App,
    _basePath: string,
    private settings: Record<string, any>,
  ) {
    this.basePath = this.settings["adapter.jiraCachePath"] || "Jira/Castle Greenflag";
  }

  parse(file: TFile): WorkItem | null {
    const cache = this.app.metadataCache.getFileCache(file);
    const fm = cache?.frontmatter;
    if (!fm) return null;

    const jiraKey = fm["jira-key"];
    if (!jiraKey) return null;

    // Determine column from jira-status (authoritative) or state (fallback)
    const jiraStatus = fm["jira-status"] as JiraStatus;
    const column = jiraStatus
      ? STATUS_TO_COLUMN[jiraStatus] || (fm.state as KanbanColumn) || "new"
      : (fm.state as KanbanColumn) || "new";

    return {
      id: fm.id || "",
      path: file.path,
      title: fm.title || file.basename,
      state: column,
      metadata: {
        jiraKey,
        jiraType: fm["jira-type"] || "Task",
        jiraStatus: fm["jira-status"] || "New",
        assignee: fm["jira-assignee"] || "",
        priority: fm["jira-priority"] || "Medium",
        sprint: fm["jira-sprint"] || "",
        storyPoints: fm["jira-story-points"] || 0,
        parentKey: fm["jira-parent"] || "",
        labels: fm["jira-labels"] || [],
        jiraUrl: fm["jira-url"] || "",
        jiraUpdated: fm["jira-updated"] || "",
        rank: fm["jira-rank"] ?? 999,
        pendingTransition: fm["_pending-transition"] || false,
        created: fm.created || "",
        updated: fm.updated || "",
      },
    };
  }

  /**
   * Parse raw Jira issue data into a WorkItem without requiring a TFile.
   * Accepts either a JiraIssue-shaped object or a frontmatter-shaped object.
   * Enables future optimization where JiraSync could provide items directly
   * to the parser without writing cache files first.
   */
  parseData(data: Record<string, unknown>): WorkItem | null {
    // Support JiraIssue shape (from API) - has "key" and "summary"
    if (data.key && data.summary) {
      const status = data.status as JiraStatus;
      const column = status ? STATUS_TO_COLUMN[status] || "new" : "new";
      return {
        id: data.key as string,
        path: "",
        title: data.summary as string,
        state: column,
        metadata: {
          jiraKey: data.key,
          jiraType: data.issueType || "Task",
          jiraStatus: data.status || "New",
          assignee: data.assignee || "",
          priority: data.priority || "Medium",
          sprint: data.sprint || "",
          storyPoints: data.storyPoints || 0,
          parentKey: data.parentKey || "",
          labels: data.labels || [],
          jiraUrl: data.url || "",
          jiraUpdated: data.updated || "",
          rank: data.rank ?? 999,
          pendingTransition: false,
          created: data.created || "",
          updated: data.updated || "",
        },
      };
    }

    // Support frontmatter shape (from cache file data)
    const jiraKey = data["jira-key"] as string | undefined;
    if (!jiraKey) return null;

    const jiraStatus = data["jira-status"] as JiraStatus | undefined;
    const column = jiraStatus
      ? STATUS_TO_COLUMN[jiraStatus] || (data.state as KanbanColumn) || "new"
      : (data.state as KanbanColumn) || "new";

    return {
      id: (data.id as string) || "",
      path: (data.path as string) || "",
      title: (data.title as string) || jiraKey,
      state: column,
      metadata: {
        jiraKey,
        jiraType: data["jira-type"] || "Task",
        jiraStatus: data["jira-status"] || "New",
        assignee: data["jira-assignee"] || "",
        priority: data["jira-priority"] || "Medium",
        sprint: data["jira-sprint"] || "",
        storyPoints: data["jira-story-points"] || 0,
        parentKey: data["jira-parent"] || "",
        labels: data["jira-labels"] || [],
        jiraUrl: data["jira-url"] || "",
        jiraUpdated: data["jira-updated"] || "",
        rank: data["jira-rank"] ?? 999,
        pendingTransition: data["_pending-transition"] || false,
        created: data.created || "",
        updated: data.updated || "",
      },
    };
  }

  async loadAll(): Promise<WorkItem[]> {
    const items: WorkItem[] = [];

    for (const col of KANBAN_COLUMNS) {
      const folderPath = `${this.basePath}/${COLUMN_FOLDERS[col]}`;
      const abstractFile = this.app.vault.getAbstractFileByPath(folderPath);
      if (!abstractFile) continue;

      const files = this.app.vault
        .getMarkdownFiles()
        .filter((f) => f.path.startsWith(folderPath + "/") && f.extension === "md");

      for (const file of files) {
        const item = this.parse(file);
        if (item) items.push(item);
      }
    }

    return items;
  }

  groupByColumn(items: WorkItem[]): Record<string, WorkItem[]> {
    const groups: Record<string, WorkItem[]> = {};
    for (const col of KANBAN_COLUMNS) {
      groups[col] = [];
    }

    for (const item of items) {
      const column = item.state as KanbanColumn;
      if (KANBAN_COLUMNS.includes(column)) {
        groups[column].push(item);
      }
    }

    // Sort each column by Jira rank (API ordering)
    for (const col of KANBAN_COLUMNS) {
      groups[col].sort((a, b) => {
        const aRank = (a.metadata as any)?.rank ?? 999;
        const bRank = (b.metadata as any)?.rank ?? 999;
        return aRank - bRank;
      });
    }

    return groups;
  }

  isItemFile(path: string): boolean {
    return path.startsWith(this.basePath + "/") && path.endsWith(".md");
  }
}
