/**
 * MainView - ItemView with 3-column resizable split layout.
 *
 * Left: ListPanel (work items)
 * Centre: Detail panel (adapter-provided or hidden for 2-column)
 * Right: TerminalPanelView (terminals)
 *
 * Handles vault events (create/delete/rename) with debounced refresh and
 * delete-create rename detection for shell mv operations.
 */
import { ItemView, WorkspaceLeaf } from "obsidian";
import type { Plugin, EventRef } from "obsidian";
import type { AdapterBundle, WorkItem } from "../core/interfaces";
import { VIEW_TYPE } from "./PluginBase";
import { ListPanel } from "./ListPanel";
import { TerminalPanelView } from "./TerminalPanelView";
import { PromptBox } from "./PromptBox";
import { loadAllSettings } from "./SettingsTab";

interface PendingRename {
  uuid: string | null;
  path: string;
  timeout: ReturnType<typeof setTimeout>;
}

export class MainView extends ItemView {
  private adapter: AdapterBundle;
  private pluginRef: Plugin & { isReloading: boolean };

  // Panels
  private listPanel: ListPanel | null = null;
  private terminalPanel: TerminalPanelView | null = null;
  private promptBox: PromptBox | null = null;

  // Layout elements
  private leftPanelEl: HTMLElement | null = null;
  private centrePanelEl: HTMLElement | null = null;
  private rightPanelEl: HTMLElement | null = null;

  // Vault event handling
  private vaultEventRefs: EventRef[] = [];
  private refreshDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingRenames: Map<string, PendingRename> = new Map();

  // Resize observer for terminal refit on view switch
  private containerObserver: ResizeObserver | null = null;

  // Has detail panel?
  private hasDetailPanel = false;

  constructor(leaf: WorkspaceLeaf, adapter: AdapterBundle, plugin: Plugin & { isReloading: boolean }) {
    super(leaf);
    this.adapter = adapter;
    this.pluginRef = plugin;
  }

  getViewType(): string {
    return VIEW_TYPE;
  }

  getDisplayText(): string {
    return "Work Terminal";
  }

  getIcon(): string {
    return "terminal";
  }

  async onOpen(): Promise<void> {
    const container = this.contentEl;
    container.empty();
    container.addClass("wt-main-view");

    // Determine layout mode
    this.hasDetailPanel = typeof this.adapter.createDetailView === "function";

    // Build layout
    this.buildLayout(container);

    // Initialize framework components
    await this.initPanels();

    // Register vault events
    this.registerVaultEvents();

    // ResizeObserver for terminal refit on view show
    this.containerObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        this.terminalPanel?.refitActive();
      });
    });
    this.containerObserver.observe(container);

    // Initial data load
    await this.refreshList();
  }

  private buildLayout(container: HTMLElement): void {
    container.style.display = "flex";
    container.style.height = "100%";
    container.style.overflow = "hidden";

    // Left panel - list
    this.leftPanelEl = container.createDiv({ cls: "wt-left-panel" });
    this.leftPanelEl.style.cssText = "width: 280px; min-width: 200px; flex-shrink: 0; display: flex; flex-direction: column; overflow: hidden; border-right: 1px solid var(--background-modifier-border);";

    if (this.hasDetailPanel) {
      // 3-column layout: list | detail | terminal
      const divider1 = this.createDivider(container, "left");

      this.centrePanelEl = container.createDiv({ cls: "wt-centre-panel" });
      this.centrePanelEl.style.cssText = "flex: 1; min-width: 300px; overflow: hidden; border-right: 1px solid var(--background-modifier-border); position: relative;";

      const divider2 = this.createDivider(container, "right");

      this.rightPanelEl = container.createDiv({ cls: "wt-right-panel" });
      this.rightPanelEl.style.cssText = "flex: 1; min-width: 300px; overflow: hidden; position: relative; display: flex; flex-direction: column;";
    } else {
      // 2-column layout: list | terminal
      const divider = this.createDivider(container, "left");

      this.rightPanelEl = container.createDiv({ cls: "wt-right-panel" });
      this.rightPanelEl.style.cssText = "flex: 1; min-width: 300px; overflow: hidden; position: relative; display: flex; flex-direction: column;";
    }
  }

  private createDivider(container: HTMLElement, side: "left" | "right"): HTMLElement {
    const divider = container.createDiv({ cls: "wt-divider" });
    divider.style.cssText = "width: 5px; cursor: col-resize; flex-shrink: 0; background: transparent;";

    let startX = 0;
    let startWidth = 0;
    let targetEl: HTMLElement | null = null;

    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      startX = e.clientX;
      if (side === "left") {
        targetEl = this.leftPanelEl;
      } else {
        targetEl = this.centrePanelEl;
      }
      if (targetEl) {
        startWidth = targetEl.offsetWidth;
      }
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
      divider.addClass("wt-divider-active");
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!targetEl) return;
      const delta = e.clientX - startX;
      const newWidth = Math.max(
        side === "left" ? 200 : 300,
        startWidth + delta
      );
      targetEl.style.width = newWidth + "px";
      targetEl.style.flexBasis = newWidth + "px";
      targetEl.style.flexGrow = "0";
      targetEl.style.flexShrink = "0";
      // Trigger terminal refit
      this.terminalPanel?.refitActive();
    };

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      divider.removeClass("wt-divider-active");
    };

    divider.addEventListener("mousedown", onMouseDown);
    return divider;
  }

  private async initPanels(): Promise<void> {
    if (!this.leftPanelEl || !this.rightPanelEl) return;

    const settings = await loadAllSettings(this.pluginRef, this.adapter);
    const parser = this.adapter.createParser(this.app, "");
    const mover = this.adapter.createMover(this.app, "");
    const cardRenderer = this.adapter.createCardRenderer();
    const promptBuilder = this.adapter.createPromptBuilder();

    // PromptBox at top of left panel
    this.promptBox = new PromptBox(
      this.leftPanelEl,
      this.adapter,
      this.pluginRef,
      settings,
      (path: string) => {
        // Placeholder card callback
        this.listPanel?.addPlaceholder(path);
      },
      (path: string, success: boolean) => {
        // Placeholder resolution callback
        this.listPanel?.resolvePlaceholder(path, success);
      }
    );

    // Terminal wrapper for TabManager
    const terminalWrapperEl = this.rightPanelEl.createDiv({ cls: "wt-terminal-wrapper" });
    terminalWrapperEl.style.cssText = "flex: 1; overflow: hidden; position: relative;";

    // TerminalPanel
    this.terminalPanel = new TerminalPanelView(
      this.rightPanelEl,
      terminalWrapperEl,
      this.pluginRef,
      this.adapter,
      settings,
      promptBuilder,
      // onClaudeStateChange callback
      (itemId: string, state: string) => {
        this.listPanel?.updateClaudeState(itemId, state);
      },
      // onSessionChange callback
      () => {
        this.listPanel?.updateSessionBadges();
        // Persist sessions to disk
        this.terminalPanel?.persistSessions();
      }
    );

    // ListPanel
    this.listPanel = new ListPanel(
      this.leftPanelEl,
      this.adapter,
      cardRenderer,
      mover,
      this.pluginRef,
      this.terminalPanel,
      // onSelect callback
      (item: WorkItem | null) => {
        this.terminalPanel?.setActiveItem(item?.id ?? null);
        if (item && this.hasDetailPanel && this.centrePanelEl) {
          this.centrePanelEl.empty();
          this.adapter.createDetailView?.(item, this.centrePanelEl);
        }
      },
      // onCustomOrderChange callback
      async (order: Record<string, string[]>) => {
        const data = (await this.pluginRef.loadData()) || {};
        data.customOrder = order;
        await this.pluginRef.saveData(data);
      }
    );

    // Recover from hot-reload
    const recoveredId = this.terminalPanel.getRecoveredItemId();
    if (recoveredId) {
      this.listPanel.selectById(recoveredId);
    }
  }

  // ---------------------------------------------------------------------------
  // Vault events
  // ---------------------------------------------------------------------------

  private registerVaultEvents(): void {
    const vault = this.app.vault;
    const cache = this.app.metadataCache;

    this.vaultEventRefs.push(
      vault.on("create", (file) => {
        this.handleCreate(file.path);
        this.scheduleRefresh();
      })
    );

    this.vaultEventRefs.push(
      vault.on("delete", (file) => {
        this.handleDelete(file.path);
        this.scheduleRefresh();
      })
    );

    this.vaultEventRefs.push(
      vault.on("rename", (file, oldPath) => {
        this.handleRename(file.path, oldPath);
        this.scheduleRefresh();
      })
    );

    // MetadataCache "changed" as fallback for create - frontmatter
    // isn't parsed when the vault create event fires
    this.vaultEventRefs.push(
      cache.on("changed", (file) => {
        if (this.listPanel?.getParser()?.isItemFile(file.path)) {
          this.scheduleRefresh();
        }
      })
    );
  }

  private handleCreate(path: string): void {
    // Check if this resolves a pending rename
    for (const [oldPath, pending] of this.pendingRenames) {
      const file = this.app.vault.getAbstractFileByPath(path);
      if (!file) continue;

      // Try UUID match first
      if (pending.uuid) {
        const cache = this.app.metadataCache.getCache(path);
        const newUuid = cache?.frontmatter?.id;
        if (newUuid && newUuid === pending.uuid) {
          this.completeRename(oldPath, path);
          return;
        }
      }

      // Folder heuristic fallback: same parent folder
      const oldFolder = oldPath.substring(0, oldPath.lastIndexOf("/"));
      const newFolder = path.substring(0, path.lastIndexOf("/"));
      if (oldFolder === newFolder && !pending.uuid) {
        this.completeRename(oldPath, path);
        return;
      }
    }
  }

  private handleDelete(path: string): void {
    // Only buffer deletes for items with active terminal sessions
    if (!this.terminalPanel?.hasSessions(path)) return;

    // Capture UUID from MetadataCache before it's cleared
    const cache = this.app.metadataCache.getCache(path);
    const uuid = cache?.frontmatter?.id ?? null;

    const timeout = setTimeout(() => {
      // Rename window expired - treat as real delete
      this.pendingRenames.delete(path);
    }, 2000);

    this.pendingRenames.set(path, { uuid, path, timeout });
  }

  private handleRename(newPath: string, oldPath: string): void {
    // Obsidian's own rename event - update sessions directly
    this.terminalPanel?.rekeyItem(oldPath, newPath);
    this.listPanel?.rekeyCustomOrder(oldPath, newPath);
  }

  private completeRename(oldPath: string, newPath: string): void {
    const pending = this.pendingRenames.get(oldPath);
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingRenames.delete(oldPath);
    }
    this.terminalPanel?.rekeyItem(oldPath, newPath);
    this.listPanel?.rekeyCustomOrder(oldPath, newPath);
  }

  private scheduleRefresh(): void {
    if (this.refreshDebounceTimer) {
      clearTimeout(this.refreshDebounceTimer);
    }
    this.refreshDebounceTimer = setTimeout(() => {
      this.refreshList();
    }, 150);
  }

  private async refreshList(): Promise<void> {
    if (!this.listPanel) return;
    const parser = this.adapter.createParser(this.app, "");
    const items = await parser.loadAll();
    const groups = parser.groupByColumn(items);
    const data = (await this.pluginRef.loadData()) || {};
    const customOrder = data.customOrder || {};
    this.listPanel.render(groups, customOrder);
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  async onClose(): Promise<void> {
    // Clean up vault event refs
    for (const ref of this.vaultEventRefs) {
      this.app.vault.offref(ref);
    }
    this.vaultEventRefs = [];

    // Clean up pending renames
    for (const pending of this.pendingRenames.values()) {
      clearTimeout(pending.timeout);
    }
    this.pendingRenames.clear();

    // Clean up resize observer
    this.containerObserver?.disconnect();

    // Clean up debounce timer
    if (this.refreshDebounceTimer) {
      clearTimeout(this.refreshDebounceTimer);
    }

    if (this.pluginRef.isReloading) {
      // Stash terminal sessions for hot-reload recovery
      this.terminalPanel?.stashAll();
    } else {
      // Full close - dispose terminals
      this.terminalPanel?.disposeAll();
    }
  }
}
