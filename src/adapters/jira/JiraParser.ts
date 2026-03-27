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
    private settings: Record<string, any>
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

  async loadAll(): Promise<WorkItem[]> {
    const items: WorkItem[] = [];

    for (const col of KANBAN_COLUMNS) {
      const folderPath = `${this.basePath}/${COLUMN_FOLDERS[col]}`;
      const abstractFile = this.app.vault.getAbstractFileByPath(folderPath);
      if (!abstractFile) continue;

      const files = this.app.vault
        .getMarkdownFiles()
        .filter(
          (f) => f.path.startsWith(folderPath + "/") && f.extension === "md"
        );

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
