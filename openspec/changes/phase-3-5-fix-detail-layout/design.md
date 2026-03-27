## Context

Phase 3 built MainView as a 3-column flex layout where the centre column is a custom `<div>` that receives adapter-rendered content via `createDetailView(item, containerEl)`. The original plugin instead uses a 2-panel ItemView where the detail is a native Obsidian `WorkspaceLeaf` created via `workspace.createLeafBySplit()`. This gives users live preview, frontmatter editing, backlinks, and all native editor features - capabilities that a raw `<div>` container cannot replicate.

The current code has:
- `MainView.ts`: 3-column flex with `centrePanelEl`, two dividers, and `hasDetailPanel` conditional branching
- `interfaces.ts`: `createDetailView?(item: WorkItem, containerEl: HTMLElement): void`
- `stub.ts`: inherits no-op from `BaseAdapter`
- `styles.css`: `.wt-centre-panel` styles

## Goals / Non-Goals

**Goals:**
- MainView becomes a 2-panel layout (list | terminals) with a single divider
- Adapter manages its own detail workspace leaf via `createLeafBySplit(ownerLeaf)`
- Clean lifecycle: detail leaf detached on plugin unload, stashed on hot-reload
- No orphan workspace leaves after hot-reload or plugin disable

**Non-Goals:**
- Implementing the actual task-agent detail view (Phase 4)
- Persisting detail panel width across sessions
- Making the detail panel optional at runtime (it's always available if the adapter provides it)

## Decisions

### 1. Adapter receives `ownerLeaf` reference

The adapter's `createDetailView` receives `(item, app, ownerLeaf)` where `ownerLeaf` is the MainView's own workspace leaf. The adapter calls `app.workspace.createLeafBySplit(ownerLeaf, "vertical", false)` to create the editor leaf.

**Why not have the framework create the leaf?** The adapter needs full control over the leaf lifecycle - when to create, when to reuse, what min-width to set. The original plugin's `TaskDetailPanel` manages all of this internally. Pushing leaf management to the framework would either over-constrain adapters or require a complex callback API.

### 2. Framework calls `detachDetailView` for cleanup

New optional method `detachDetailView?(): void` on `AdapterBundle`. The framework calls it:
- On `onClose()` when NOT reloading (full close)
- On `onClose()` when reloading (stash) - adapter should detach to avoid orphan leaves

**Why not on every item deselect?** The original plugin deliberately leaves the last file showing on deselect. Detaching and recreating leaves on every selection change would cause visual flicker and lose scroll position.

### 3. MainView removes all centre-panel code

The `centrePanelEl`, second divider, and `hasDetailPanel` branching are all removed. MainView always renders 2 columns. The visual "3 columns" effect comes from Obsidian's workspace leaf system, not from CSS.

**Why not keep the conditional?** The `hasDetailPanel` branch handling adds complexity for a layout that was incorrect. The 2-panel layout is the correct base - the adapter's `createLeafBySplit` call naturally produces the visual third column.

### 4. MainView passes `this.leaf` to adapter

When the user selects an item, MainView calls `adapter.createDetailView(item, this.app, this.leaf)`. The `this.leaf` is the ItemView's own WorkspaceLeaf - the adapter splits off this to create its editor leaf.

## Risks / Trade-offs

- **Orphan leaves on crash**: If the plugin crashes without calling `detachDetailView`, the editor leaf persists as an orphan in the workspace. Mitigation: adapters should check for and clean up stale leaves on initialization.
- **Adapter complexity**: Moving leaf management to the adapter makes adapter implementation more complex than a simple "render into container" approach. Mitigation: the `BaseAdapter` default is a no-op, and the reference implementation (Phase 4 TaskDetailView) demonstrates the pattern clearly.
- **Focus stealing**: `createLeafBySplit` may steal focus from the terminal panel. Mitigation: the adapter should avoid calling `setActiveLeaf` unless explicitly needed.
