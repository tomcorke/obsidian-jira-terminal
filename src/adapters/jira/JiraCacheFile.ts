/**
 * JiraCacheFile - generates and updates markdown cache files for Jira issues.
 */
import type { JiraIssue, KanbanColumn } from "./types";
import { STATUS_TO_COLUMN } from "./types";

/**
 * Generate the full content for a Jira cache file.
 * Content below "## Local Notes" is preserved across syncs.
 */
export function generateCacheContent(issue: JiraIssue): string {
  const id = crypto.randomUUID();
  const column = STATUS_TO_COLUMN[issue.status] || "new";
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

  const safeTitle = `"${issue.summary.replace(/"/g, '\\"')}"`;
  const labelsYaml = issue.labels.length > 0
    ? issue.labels.map((l) => `\n  - "${l}"`).join("")
    : "";

  return `---
id: ${id}
jira-key: ${issue.key}
jira-status: "${issue.status}"
jira-type: "${issue.issueType}"
jira-assignee: "${issue.assignee}"
jira-priority: "${issue.priority}"
jira-sprint: "${issue.sprint}"
jira-story-points: ${issue.storyPoints}
jira-parent: "${issue.parentKey}"
jira-labels:${labelsYaml || " []"}
jira-url: "${issue.url}"
jira-updated: "${issue.updated}"
jira-rank: ${issue.rank}
title: ${safeTitle}
state: ${column}
_pending-transition: false
created: ${now}
updated: ${now}
---
# ${issue.key}: ${issue.summary}

## Local Notes

`;
}

/**
 * Update the frontmatter of an existing cache file, preserving content
 * below the frontmatter (especially "## Local Notes").
 */
export function updateCacheContent(
  existingContent: string,
  issue: JiraIssue
): string {
  const column = STATUS_TO_COLUMN[issue.status] || "new";
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

  // Split at end of frontmatter
  const fmEnd = existingContent.indexOf("---", 4);
  if (fmEnd === -1) return existingContent;

  const body = existingContent.substring(fmEnd + 3);

  // Extract existing id
  const idMatch = existingContent.match(/^id:\s*(.+)$/m);
  const id = idMatch ? idMatch[1].trim() : crypto.randomUUID();

  // Extract existing created timestamp
  const createdMatch = existingContent.match(/^created:\s*(.+)$/m);
  const created = createdMatch ? createdMatch[1].trim() : now;

  // Check if there's a pending transition - don't update status if so
  const pendingMatch = existingContent.match(/^_pending-transition:\s*(.+)$/m);
  const isPending = pendingMatch && pendingMatch[1].trim() === "true";

  // If pending transition, keep the existing state
  const stateMatch = existingContent.match(/^state:\s*(.+)$/m);
  const effectiveColumn = isPending && stateMatch
    ? stateMatch[1].trim()
    : column;

  const safeTitle = `"${issue.summary.replace(/"/g, '\\"')}"`;
  const labelsYaml = issue.labels.length > 0
    ? issue.labels.map((l) => `\n  - "${l}"`).join("")
    : "";

  const newFrontmatter = `---
id: ${id}
jira-key: ${issue.key}
jira-status: "${issue.status}"
jira-type: "${issue.issueType}"
jira-assignee: "${issue.assignee}"
jira-priority: "${issue.priority}"
jira-sprint: "${issue.sprint}"
jira-story-points: ${issue.storyPoints}
jira-parent: "${issue.parentKey}"
jira-labels:${labelsYaml || " []"}
jira-url: "${issue.url}"
jira-updated: "${issue.updated}"
jira-rank: ${issue.rank}
title: ${safeTitle}
state: ${effectiveColumn}
_pending-transition: ${isPending ? "true" : "false"}
created: ${created}
updated: ${now}
---`;

  return newFrontmatter + body;
}

/**
 * Get the cache file path for a Jira issue.
 */
export function getCacheFilePath(
  basePath: string,
  column: KanbanColumn,
  issueKey: string
): string {
  return `${basePath}/${column}/${issueKey}.md`;
}
