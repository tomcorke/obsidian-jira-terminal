## Why

Phase 3 implemented the detail panel as a custom CSS middle column in a 3-column flex layout, but the original plugin uses a fundamentally different approach: the ItemView is a **2-panel layout** (list | terminals), and the detail view is a **separate Obsidian workspace leaf** created via `workspace.createLeafBySplit()`. This gives users a native MarkdownView with live preview, frontmatter editing, and backlinks - something a custom `<div>` container can never provide.

## What Changes

- **MainView.ts**: Remove the custom `centrePanelEl` div and second divider. Become a 2-column layout (list | terminals) with one divider. Remove `hasDetailPanel` conditional logic.
- **AdapterBundle.createDetailView interface**: Change signature from `(item, containerEl)` to `(item, app, ownerLeaf)` so the adapter manages its own workspace leaf via `createLeafBySplit`. **BREAKING** for any existing adapter implementations.
- **AdapterBundle.detachDetailView**: Add new optional method for cleanup on plugin unload/hot-reload.
- **BaseAdapter**: Update default implementations to match new signatures.
- **StubAdapter**: Update to match new interface (no-op).
- **styles.css**: Remove `.wt-centre-panel` styles and simplify to 2-panel layout.
- **MainView lifecycle**: Add `detachDetailView` calls on close/stash to prevent orphan leaves.

## Capabilities

### New Capabilities

- `workspace-leaf-detail`: Adapter-managed detail panel via Obsidian workspace leaf (`createLeafBySplit`), replacing the custom CSS container approach. Covers the interface contract, lifecycle (create/reuse/detach), and hot-reload safety.

### Modified Capabilities

(none - no existing specs)

## Impact

- `src/core/interfaces.ts` - `AdapterBundle` and `BaseAdapter` signature changes
- `src/framework/MainView.ts` - Layout rebuild, lifecycle changes
- `src/adapters/stub.ts` - Interface compliance update
- `styles.css` - Layout simplification
- Future adapters (Phase 4 task-agent) will implement the new `createDetailView` signature
