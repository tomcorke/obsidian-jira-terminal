/**
 * JiraMover - transitions Jira issues via API and moves cache files.
 *
 * Settings are provided by the framework via createMover(app, basePath, settings).
 */
import type { App, TFile } from "obsidian";
import { Notice } from "obsidian";
import type { WorkItemMover } from "../../core/interfaces";
import {
  type KanbanColumn,
  COLUMN_TO_STATUS,
  COLUMN_FOLDERS,
} from "./types";
import type { JiraSync } from "./JiraSync";

export class JiraMover implements WorkItemMover {
  private basePath: string;

  constructor(
    private app: App,
    _basePath: string,
    private settings: Record<string, any>,
    private jiraSync: JiraSync
  ) {
    this.basePath = this.settings["adapter.jiraCachePath"] || "Jira/Castle Greenflag";
  }

  async move(file: TFile, targetColumnId: string): Promise<void> {
    const newColumn = targetColumnId as KanbanColumn;
    const targetStatus = COLUMN_TO_STATUS[newColumn];
    if (!targetStatus) {
      new Notice(`Unknown target column: ${targetColumnId}`);
      return;
    }

    // Read current file to get Jira key
    const content = await this.app.vault.read(file);
    const keyMatch = content.match(/^jira-key:\s*(.+)$/m);
    const jiraKey = keyMatch ? keyMatch[1].trim() : "";

    if (!jiraKey) {
      new Notice("Cannot move: no Jira key found in file");
      return;
    }

    // Check current status
    const statusMatch = content.match(/^jira-status:\s*"?(.+?)"?\s*$/m);
    const currentStatus = statusMatch ? statusMatch[1] : "";

    if (currentStatus === targetStatus) return;

    // Set pending transition flag
    let updated = content;
    updated = updated.replace(
      /^_pending-transition:\s*.+$/m,
      `_pending-transition: true`
    );
    updated = updated.replace(
      /^state:\s*.+$/m,
      `state: ${newColumn}`
    );
    await this.app.vault.modify(file, updated);

    // Find the right transition
    const client = this.jiraSync.getClient();
    try {
      const transitions = await client.getTransitions(jiraKey);
      const transition = transitions.find(
        (t: any) => t.to.name === targetStatus
      );

      if (!transition) {
        // Revert
        let reverted = updated;
        reverted = reverted.replace(
          /^_pending-transition:\s*.+$/m,
          `_pending-transition: false`
        );
        reverted = reverted.replace(
          /^state:\s*.+$/m,
          `state: ${this.columnFromPath(file.path)}`
        );
        await this.app.vault.modify(file, reverted);

        const available = transitions.map((t: any) => t.to.name).join(", ");
        new Notice(
          `Cannot transition ${jiraKey} to "${targetStatus}". ` +
          `Available: ${available || "none"}`
        );
        return;
      }

      // Execute Jira transition
      await client.transitionIssue(jiraKey, transition.id);
      console.log("[jira-terminal] Transitioned", jiraKey, "->", targetStatus);

      // Update cache file with new status
      let transitioned = await this.app.vault.read(file);
      transitioned = transitioned.replace(
        /^jira-status:\s*.+$/m,
        `jira-status: "${targetStatus}"`
      );
      transitioned = transitioned.replace(
        /^_pending-transition:\s*.+$/m,
        `_pending-transition: false`
      );
      const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
      transitioned = transitioned.replace(
        /^updated:\s*.+$/m,
        `updated: ${now}`
      );
      await this.app.vault.modify(file, transitioned);

      // Move file to target column folder
      const targetFolder = COLUMN_FOLDERS[newColumn];
      const newPath = `${this.basePath}/${targetFolder}/${file.name}`;

      if (file.path !== newPath) {
        const folder = this.app.vault.getAbstractFileByPath(
          `${this.basePath}/${targetFolder}`
        );
        if (!folder) {
          await this.app.vault.createFolder(`${this.basePath}/${targetFolder}`);
        }
        await this.app.vault.rename(file, newPath);
      }

      new Notice(`${jiraKey} -> ${targetStatus}`);
    } catch (err: any) {
      console.error("[jira-terminal] Transition failed:", err);

      // Revert pending flag
      try {
        const current = await this.app.vault.read(file);
        const reverted = current
          .replace(/^_pending-transition:\s*.+$/m, `_pending-transition: false`)
          .replace(/^state:\s*.+$/m, `state: ${this.columnFromPath(file.path)}`);
        await this.app.vault.modify(file, reverted);
      } catch {
        // Best effort revert
      }

      new Notice(`Failed to transition ${jiraKey}: ${err.message || err}`);
    }
  }

  private columnFromPath(path: string): string {
    // Extract column from path: basePath/column/FILE.md
    const relative = path.replace(this.basePath + "/", "");
    const folder = relative.split("/")[0];
    return folder || "new";
  }
}
