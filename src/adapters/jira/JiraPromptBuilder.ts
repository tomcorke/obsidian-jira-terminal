import type { WorkItem, WorkItemPromptBuilder } from "../../core/interfaces";

export class JiraPromptBuilder implements WorkItemPromptBuilder {
  buildPrompt(item: WorkItem, fullPath: string): string {
    const meta = (item.metadata || {}) as Record<string, any>;

    let prompt = `Jira Ticket: ${meta.jiraKey} - ${item.title}`;
    prompt += `\nStatus: ${meta.jiraStatus}`;
    prompt += `\nType: ${meta.jiraType}`;
    prompt += `\nPriority: ${meta.priority}`;

    if (meta.assignee) {
      prompt += `\nAssignee: ${meta.assignee}`;
    }

    if (meta.sprint) {
      prompt += `\nSprint: ${meta.sprint}`;
    }

    if (meta.storyPoints > 0) {
      prompt += `\nStory Points: ${meta.storyPoints}`;
    }

    if (meta.parentKey) {
      prompt += `\nParent: ${meta.parentKey}`;
    }

    if (meta.labels?.length > 0) {
      prompt += `\nLabels: ${meta.labels.join(", ")}`;
    }

    prompt += `\nURL: ${meta.jiraUrl}`;
    prompt += `\nCache File: ${fullPath}`;
    prompt += `\n\nRead the cache file above for the full ticket description and any local notes.`;

    return prompt;
  }
}
