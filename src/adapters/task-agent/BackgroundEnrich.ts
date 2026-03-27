import type { App } from "obsidian";
import { spawnHeadlessClaude } from "../../core/claude/HeadlessClaude";
import { generateTaskContent, generatePendingFilename } from "./TaskFileTemplate";
import type { SplitSource } from "./TaskFileTemplate";
import { STATE_FOLDER_MAP, type KanbanColumn } from "./types";

const RENAME_INSTRUCTION =
  `After updating the task, rename the file to match the convention ` +
  `TASK-YYYYMMDD-HHMM-slugified-title.md (use the existing date prefix, ` +
  `replace the "pending-XXXXXXXX" segment with a slug of the final title).`;

export async function handleItemCreated(
  app: App,
  title: string,
  settings: Record<string, any>
): Promise<void> {
  const columnId = (settings._columnId || "todo") as KanbanColumn;
  const basePath = settings["adapter.taskBasePath"] || "2 - Areas/Tasks";
  const claudeCommand = settings["core.claudeCommand"] || "claude";

  // Generate file content with a pending filename (Claude will rename after enrichment)
  const content = generateTaskContent(title, columnId);
  const filename = generatePendingFilename();
  const folderName = STATE_FOLDER_MAP[columnId] || "todo";
  const folderPath = `${basePath}/${folderName}`;
  const filePath = `${folderPath}/${filename}`;

  // Ensure target folder exists
  const folder = app.vault.getAbstractFileByPath(folderPath);
  if (!folder) {
    await app.vault.createFolder(folderPath);
  }

  // Create the task file
  await app.vault.create(filePath, content);
  console.log(`[work-terminal] Task created: ${filePath}`);

  // Spawn background enrichment (fire and don't let failures propagate)
  try {
    const enrichPrompt =
      `/tc-tasks:task-agent --fast The task file at ${filePath} was just created with minimal data. ` +
      `Review it, run duplicate check, goal alignment, and related task detection. Update the file in place. ` +
      RENAME_INSTRUCTION;

    const home = process.env.HOME || "/";
    const result = await spawnHeadlessClaude(enrichPrompt, home, claudeCommand);

    if (result.exitCode === 0) {
      console.log(`[work-terminal] Background enrich completed: ${filePath}`);
    } else {
      console.error(
        `[work-terminal] Background enrich failed (exit ${result.exitCode}):`,
        result.stderr.slice(0, 500)
      );
    }
  } catch (err) {
    console.error("[work-terminal] Background enrich error:", err);
  }
}

export async function handleSplitTaskCreated(
  app: App,
  title: string,
  columnId: KanbanColumn,
  basePath: string,
  splitFrom: SplitSource
): Promise<{ path: string; id: string }> {
  const id = crypto.randomUUID();
  const content = generateTaskContent(title, columnId, splitFrom, id);
  const filename = generatePendingFilename();
  const folderName = STATE_FOLDER_MAP[columnId] || "todo";
  const folderPath = `${basePath}/${folderName}`;
  const filePath = `${folderPath}/${filename}`;

  const folder = app.vault.getAbstractFileByPath(folderPath);
  if (!folder) {
    await app.vault.createFolder(folderPath);
  }

  await app.vault.create(filePath, content);
  console.log(`[work-terminal] Split task created: ${filePath} (from ${splitFrom.filename})`);

  return { path: filePath, id };
}

export { RENAME_INSTRUCTION };
