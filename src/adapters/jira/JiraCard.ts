/**
 * JiraCard - renders Jira issue cards with type/priority/assignee badges.
 *
 * Jira-specific styles are injected by the adapter via getStyles().
 * Card elements use CSS classes (e.g. jira-type-bug, jira-priority-high)
 * instead of inline styles.
 */
import type { MenuItem } from "obsidian";
import type { WorkItem, CardRenderer, CardActionContext } from "../../core/interfaces";
import { KANBAN_COLUMNS, COLUMN_LABELS } from "./types";

/** Map issue type names to CSS class suffixes */
const TYPE_CSS_CLASS: Record<string, string> = {
  Bug: "jira-type-bug",
  Story: "jira-type-story",
  Task: "jira-type-task",
  Epic: "jira-type-epic",
  Deliverable: "jira-type-deliverable",
  "Sub-task": "jira-type-sub-task",
};

/** Map priority names to CSS class suffixes */
const PRIORITY_CSS_CLASS: Record<string, string> = {
  Highest: "jira-priority-highest",
  High: "jira-priority-high",
  Medium: "jira-priority-medium",
  Low: "jira-priority-low",
  Lowest: "jira-priority-lowest",
};

export class JiraCard implements CardRenderer {
  render(item: WorkItem, ctx: CardActionContext): HTMLElement {
    const meta = (item.metadata || {}) as Record<string, any>;

    const card = document.createElement("div");
    card.addClass("wt-card");
    card.dataset.path = item.path;
    card.draggable = true;

    // Title row
    const titleRow = card.createDiv({ cls: "wt-card-title-row" });
    const titleEl = titleRow.createDiv({ cls: "wt-card-title" });
    titleEl.textContent = item.title;

    // Actions container (session badge + move-to-top added by framework)
    titleRow.createDiv({ cls: "wt-card-actions" });

    // Meta row
    const metaRow = card.createDiv({ cls: "wt-card-meta" });

    // Jira key badge (clickable)
    const keyBadge = metaRow.createSpan({ cls: "wt-card-source" });
    keyBadge.textContent = meta.jiraKey || "";
    keyBadge.style.cursor = "pointer";
    keyBadge.addEventListener("click", (e) => {
      e.stopPropagation();
      if (meta.jiraUrl) {
        window.open(meta.jiraUrl, "_blank");
      }
    });

    // Issue type badge
    const typeStr = meta.jiraType || "Task";
    const typeCls = TYPE_CSS_CLASS[typeStr] || "";
    const typeBadge = metaRow.createSpan({
      cls: `wt-card-source ${typeCls}`.trim(),
    });
    typeBadge.textContent = typeStr;

    // Priority badge (only shown for Highest/High)
    const priorityStr = meta.priority || "Medium";
    if (priorityStr === "Highest" || priorityStr === "High") {
      const priCls = PRIORITY_CSS_CLASS[priorityStr] || "";
      const priBadge = metaRow.createSpan({
        cls: `wt-card-source ${priCls}`.trim(),
      });
      priBadge.textContent = priorityStr;
    }

    // Assignee
    if (meta.assignee) {
      const assigneeBadge = metaRow.createSpan({ cls: "wt-card-goal" });
      assigneeBadge.textContent = this.abbreviateName(meta.assignee);
      assigneeBadge.title = meta.assignee;
    }

    // Sprint
    if (meta.sprint) {
      const sprintBadge = metaRow.createSpan({ cls: "wt-card-goal" });
      sprintBadge.textContent = meta.sprint;
      sprintBadge.title = `Sprint: ${meta.sprint}`;
    }

    // Story points
    if (meta.storyPoints && meta.storyPoints > 0) {
      const spBadge = metaRow.createSpan({ cls: "wt-card-score" });
      spBadge.textContent = String(meta.storyPoints);
      spBadge.title = "Story Points";
    }

    // Pending transition indicator
    if (meta.pendingTransition) {
      const pendBadge = metaRow.createSpan({ cls: "wt-card-ingesting" });
      pendBadge.textContent = "transitioning...";
    }

    // Click to select
    card.addEventListener("click", (e) => {
      e.stopPropagation();
      ctx.onSelect();
    });

    // Drag events
    card.addEventListener("dragstart", (e) => {
      card.addClass("dragging");
      e.dataTransfer?.setData("text/plain", item.path);
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = "move";
      }
    });

    card.addEventListener("dragend", () => {
      card.removeClass("dragging");
    });

    return card;
  }

  getContextMenuItems(item: WorkItem, ctx: CardActionContext): MenuItem[] {
    const items: MenuItem[] = [];
    const meta = (item.metadata || {}) as Record<string, any>;

    // Open in Jira
    if (meta.jiraUrl) {
      (items as any[]).push({
        title: "Open in Jira",
        callback: () => window.open(meta.jiraUrl, "_blank"),
      });
    }

    (items as any[]).push({ separator: true });

    // Move to other columns
    for (const col of KANBAN_COLUMNS) {
      if (col === item.state) continue;
      (items as any[]).push({
        title: `Move to ${COLUMN_LABELS[col]}`,
        callback: () => ctx.onMoveToColumn(col),
      });
      // Done & Close Sessions
      if (col === "done") {
        (items as any[]).push({
          title: "Done & Close Sessions",
          callback: () => {
            ctx.onMoveToColumn("done");
            try {
              ctx.onCloseSessions();
            } catch (err) {
              console.error("[jira-terminal] Failed to close sessions:", err);
            }
          },
        });
      }
    }

    (items as any[]).push({ separator: true });

    // Copy actions
    (items as any[]).push({
      title: "Copy Jira Key",
      callback: () => navigator.clipboard.writeText(meta.jiraKey || ""),
    });
    (items as any[]).push({
      title: "Copy Title",
      callback: () => navigator.clipboard.writeText(item.title),
    });
    (items as any[]).push({
      title: "Copy Context Prompt",
      callback: () => {
        navigator.clipboard.writeText(this.buildQuickPrompt(item));
      },
    });

    (items as any[]).push({ separator: true });

    // Refresh from Jira
    (items as any[]).push({
      title: "Refresh from Jira",
      callback: () => {
        // This will be handled by the adapter via a custom event
        // For now, just re-sync - the adapter stores the sync instance
        document.dispatchEvent(
          new CustomEvent("jira-terminal:refresh-issue", {
            detail: { key: meta.jiraKey },
          }),
        );
      },
    });

    // Remove from board (delete cache file, NOT the Jira issue)
    // Framework coupling issue: onDelete() calls vault.trash() directly
    // with no adapter hook to intercept. We use it here because removing
    // the cache file is acceptable, but the framework should have an
    // onDelete hook to allow adapters to customize deletion behavior.
    (items as any[]).push({
      title: "Remove from Board",
      callback: () => ctx.onDelete(),
    });

    return items;
  }

  private abbreviateName(name: string): string {
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0]} ${parts[parts.length - 1][0]}.`;
    }
    return name;
  }

  private buildQuickPrompt(item: WorkItem): string {
    const meta = (item.metadata || {}) as Record<string, any>;
    let prompt = `Jira: ${meta.jiraKey} - ${item.title}`;
    prompt += `\nStatus: ${meta.jiraStatus}`;
    prompt += `\nType: ${meta.jiraType}`;
    if (meta.assignee) prompt += `\nAssignee: ${meta.assignee}`;
    if (meta.sprint) prompt += `\nSprint: ${meta.sprint}`;
    if (meta.parentKey) prompt += `\nParent: ${meta.parentKey}`;
    prompt += `\nURL: ${meta.jiraUrl}`;
    return prompt;
  }
}
