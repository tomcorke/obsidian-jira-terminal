/**
 * JiraCard - renders Jira issue cards with type/priority/assignee badges.
 *
 * Framework coupling issue: no mechanism for adapter-contributed CSS.
 * All Jira-specific styles must be inlined or added to the shared styles.css.
 */
import type { MenuItem } from "obsidian";
import type { WorkItem, CardRenderer, CardActionContext } from "../../core/interfaces";
import { KANBAN_COLUMNS, COLUMN_LABELS } from "./types";

const TYPE_COLORS: Record<string, string> = {
  Bug: "#e5484d",
  Story: "#30a46c",
  Task: "#3b82f6",
  Epic: "#8b5cf6",
  Deliverable: "#d946ef",
  "Sub-task": "#6b7280",
};

const PRIORITY_COLORS: Record<string, string> = {
  Highest: "#e5484d",
  High: "#f76b15",
  Medium: "#e5a100",
  Low: "#3b82f6",
  Lowest: "#6b7280",
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
    const typeBadge = metaRow.createSpan({ cls: "wt-card-source" });
    typeBadge.textContent = typeStr;
    const typeColor = TYPE_COLORS[typeStr];
    if (typeColor) {
      typeBadge.style.background = typeColor;
      typeBadge.style.color = "white";
    }

    // Priority badge
    const priorityStr = meta.priority || "Medium";
    if (priorityStr === "Highest" || priorityStr === "High") {
      const priBadge = metaRow.createSpan({ cls: "wt-card-source" });
      priBadge.textContent = priorityStr;
      priBadge.style.background = PRIORITY_COLORS[priorityStr] || "";
      priBadge.style.color = "white";
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
