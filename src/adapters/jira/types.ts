/** Jira status values from the Castle Greenflag board. */
export type JiraStatus =
  | "New"
  | "In Progress"
  | "Ready for Test"
  | "Testing"
  | "Done";

/** Column IDs used in the kanban config. */
export type KanbanColumn =
  | "new"
  | "in-progress"
  | "ready-for-test"
  | "testing"
  | "done";

/** Bi-directional mapping between Jira statuses and column IDs. */
export const STATUS_TO_COLUMN: Record<JiraStatus, KanbanColumn> = {
  "New": "new",
  "In Progress": "in-progress",
  "Ready for Test": "ready-for-test",
  "Testing": "testing",
  "Done": "done",
};

export const COLUMN_TO_STATUS: Record<KanbanColumn, JiraStatus> = {
  "new": "New",
  "in-progress": "In Progress",
  "ready-for-test": "Ready for Test",
  "testing": "Testing",
  "done": "Done",
};

export const KANBAN_COLUMNS: KanbanColumn[] = [
  "new",
  "in-progress",
  "ready-for-test",
  "testing",
  "done",
];

export const COLUMN_LABELS: Record<KanbanColumn, string> = {
  "new": "New",
  "in-progress": "In Progress",
  "ready-for-test": "Ready for Test",
  "testing": "Testing",
  "done": "Done",
};

export const COLUMN_FOLDERS: Record<KanbanColumn, string> = {
  "new": "new",
  "in-progress": "in-progress",
  "ready-for-test": "ready-for-test",
  "testing": "testing",
  "done": "done",
};

/** Jira issue type for display styling. */
export type JiraIssueType = "Bug" | "Story" | "Task" | "Epic" | "Deliverable" | "Sub-task";

/** Parsed Jira issue data. */
export interface JiraIssue {
  key: string;
  summary: string;
  status: JiraStatus;
  issueType: JiraIssueType;
  assignee: string;
  assigneeAccountId: string;
  priority: string;
  labels: string[];
  sprint: string;
  storyPoints: number;
  parentKey: string;
  created: string;
  updated: string;
  url: string;
  rank: number;
}

/** Shape of the frontmatter in a Jira cache file. */
export interface JiraCacheFrontmatter {
  id: string;
  "jira-key": string;
  "jira-status": JiraStatus;
  "jira-type": string;
  "jira-assignee": string;
  "jira-priority": string;
  "jira-sprint": string;
  "jira-story-points": number;
  "jira-parent": string;
  "jira-labels": string[];
  "jira-url": string;
  "jira-updated": string;
  "jira-rank": number;
  title: string;
  state: KanbanColumn;
  "_pending-transition"?: boolean;
  created: string;
  updated: string;
}
