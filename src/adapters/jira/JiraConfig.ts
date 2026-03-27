import type { PluginConfig } from "../../core/interfaces";
import { KANBAN_COLUMNS, COLUMN_LABELS, COLUMN_FOLDERS } from "./types";

export const JIRA_CONFIG: PluginConfig = {
  columns: KANBAN_COLUMNS.map((col) => ({
    id: col,
    label: COLUMN_LABELS[col],
    folderName: COLUMN_FOLDERS[col],
  })),
  creationColumns: [
    { id: "new", label: "New", default: true },
    { id: "in-progress", label: "In Progress" },
  ],
  settingsSchema: [
    {
      key: "jiraCachePath",
      name: "Cache path",
      description: "Vault path for cached Jira issue files",
      type: "text",
      default: "Jira/Castle Greenflag",
    },
    {
      key: "jiraBaseUrl",
      name: "Jira base URL",
      description: "Jira instance URL (e.g. https://skyscanner.atlassian.net)",
      type: "text",
      default: "https://skyscanner.atlassian.net",
    },
    {
      key: "jiraBoardId",
      name: "Board ID",
      description: "Jira Kanban board ID",
      type: "text",
      default: "2621",
    },
    {
      key: "jiraJql",
      name: "JQL override",
      description: "Custom JQL (leave empty for board default: non-Done issues)",
      type: "text",
      default: "",
    },
    {
      key: "jiraUsername",
      name: "Jira username (email)",
      description: "Atlassian account email for API authentication",
      type: "text",
      default: "",
    },
    {
      key: "jiraPollSeconds",
      name: "Poll interval (seconds)",
      description: "How often to sync from Jira (0 to disable)",
      type: "text",
      default: "120",
    },
  ],
  defaultSettings: {
    jiraCachePath: "Jira/Castle Greenflag",
    jiraBaseUrl: "https://skyscanner.atlassian.net",
    jiraBoardId: "2621",
    jiraJql: "",
    jiraUsername: "",
    jiraPollSeconds: "120",
  },
  itemName: "ticket",
};
