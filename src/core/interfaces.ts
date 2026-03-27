import type { TFile, App, MenuItem, WorkspaceLeaf } from "obsidian";

/** A work item that owns terminal tabs */
export interface WorkItem {
  id: string;
  path: string;
  title: string;
  state: string;
  metadata: Record<string, unknown>;
}

export interface ListColumn {
  id: string;
  label: string;
  folderName: string;
}

export interface CreationColumn {
  id: string;
  label: string;
  default?: boolean;
}

export interface SettingField {
  key: string;
  name: string;
  description: string;
  type: "text" | "toggle" | "dropdown";
  default: unknown;
}

export interface PluginConfig {
  columns: ListColumn[];
  creationColumns: CreationColumn[];
  settingsSchema: SettingField[];
  defaultSettings: Record<string, unknown>;
  itemName: string;
}

export interface WorkItemParser {
  basePath: string;
  parse(file: TFile): WorkItem | null;
  loadAll(): Promise<WorkItem[]>;
  groupByColumn(items: WorkItem[]): Record<string, WorkItem[]>;
  isItemFile(path: string): boolean;
}

export interface WorkItemMover {
  move(file: TFile, targetColumnId: string): Promise<void>;
}

export interface CardActionContext {
  onSelect(): void;
  onMoveToTop(): void;
  onMoveToColumn(columnId: string): void;
  onInsertAfter(existingId: string, newItem: WorkItem): void;
  onDelete(): void;
  onCloseSessions(): void;
}

export interface CardRenderer {
  render(item: WorkItem, ctx: CardActionContext): HTMLElement;
  getContextMenuItems(item: WorkItem, ctx: CardActionContext): MenuItem[];
}

export interface WorkItemPromptBuilder {
  buildPrompt(item: WorkItem, fullPath: string): string;
}

export interface AdapterBundle {
  config: PluginConfig;
  createParser(app: App, basePath: string): WorkItemParser;
  createMover(app: App, basePath: string): WorkItemMover;
  createCardRenderer(): CardRenderer;
  createPromptBuilder(): WorkItemPromptBuilder;
  createDetailView?(item: WorkItem, app: App, ownerLeaf: WorkspaceLeaf): void;
  detachDetailView?(): void;
  onItemCreated?(path: string, settings: Record<string, unknown>): Promise<void>;
  transformSessionLabel?(oldLabel: string, detectedLabel: string): string;
}

export abstract class BaseAdapter implements AdapterBundle {
  abstract config: PluginConfig;
  abstract createParser(app: App, basePath: string): WorkItemParser;
  abstract createMover(app: App, basePath: string): WorkItemMover;
  abstract createCardRenderer(): CardRenderer;
  abstract createPromptBuilder(): WorkItemPromptBuilder;

  createDetailView?(_item: WorkItem, _app: App, _ownerLeaf: WorkspaceLeaf): void {
    return undefined;
  }

  detachDetailView?(): void {
    // no-op by default
  }

  async onItemCreated(_path: string, _settings: Record<string, unknown>): Promise<void> {
    // no-op by default
  }

  transformSessionLabel(_oldLabel: string, detectedLabel: string): string {
    return detectedLabel;
  }
}
