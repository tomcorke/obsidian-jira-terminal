## 1. Interface Changes

- [x] 1.1 Update `AdapterBundle.createDetailView` signature in `interfaces.ts` from `(item: WorkItem, containerEl: HTMLElement): void` to `(item: WorkItem, app: App, ownerLeaf: WorkspaceLeaf): void`
- [x] 1.2 Add `detachDetailView?(): void` optional method to `AdapterBundle` interface
- [x] 1.3 Update `BaseAdapter.createDetailView` default implementation to match new signature
- [x] 1.4 Add `BaseAdapter.detachDetailView` default no-op implementation

## 2. MainView Layout

- [x] 2.1 Remove `centrePanelEl` field, second divider, and `hasDetailPanel` flag from `MainView.ts`
- [x] 2.2 Simplify `buildLayout` to always render 2-column: left panel + divider + right panel
- [x] 2.3 Remove the `"right"` side divider branch from `createDivider` (only left-panel resize needed)
- [x] 2.4 Update `initPanels` onSelect callback: replace `centrePanelEl.empty() + createDetailView(item, el)` with `adapter.createDetailView(item, this.app, this.leaf)`

## 3. MainView Lifecycle

- [x] 3.1 Add `adapter.detachDetailView?.()` call in `onClose()` for both reload and full-close paths
- [x] 3.2 Update MainView JSDoc comment to reference 2-panel layout

## 4. Stub Adapter

- [x] 4.1 Update `StubAdapter` to match new `createDetailView` signature (optional no-op, inherited from BaseAdapter)

## 5. CSS Cleanup

- [x] 5.1 Remove `.wt-centre-panel` class from `styles.css`
- [x] 5.2 Update layout section comment from "3-column split" to "2-column split"

## 6. Verification

- [x] 6.1 Verify build compiles with no errors (`npm run build`)
- [x] 6.2 Verify all existing tests pass (`npx vitest run`)
- [x] 6.3 Verify plugin loads in Obsidian via CDP - shows 2-panel layout (list | terminals)
- [x] 6.4 Verify no orphan workspace leaves after hot-reload cycle
