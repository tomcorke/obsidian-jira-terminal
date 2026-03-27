## ADDED Requirements

### Requirement: MainView uses 2-panel layout
MainView SHALL render exactly two panels (list and terminals) with a single resizable divider. There SHALL NOT be a custom CSS centre panel or a second divider element.

#### Scenario: Plugin opens with 2-panel layout
- **WHEN** the MainView opens
- **THEN** the contentEl contains a left panel (list), one divider, and a right panel (terminals)
- **AND** there is no `.wt-centre-panel` element in the DOM

#### Scenario: Divider resizes left panel
- **WHEN** the user drags the divider
- **THEN** the left panel width changes with a minimum of 200px
- **AND** the right panel fills the remaining space

### Requirement: AdapterBundle.createDetailView receives workspace leaf
The `createDetailView` method on `AdapterBundle` SHALL accept the signature `(item: WorkItem, app: App, ownerLeaf: WorkspaceLeaf): void`. The adapter SHALL use `ownerLeaf` to create its own workspace leaf via `app.workspace.createLeafBySplit()`.

#### Scenario: Adapter creates detail leaf on item selection
- **WHEN** the user selects a work item and the adapter implements `createDetailView`
- **THEN** the framework calls `adapter.createDetailView(item, app, this.leaf)`
- **AND** the adapter creates or reuses a workspace leaf split from the owner leaf

#### Scenario: Adapter without createDetailView
- **WHEN** the adapter does not implement `createDetailView`
- **THEN** the MainView renders as a 2-column layout with no detail panel
- **AND** no workspace leaf split is created

### Requirement: AdapterBundle.detachDetailView for cleanup
The `AdapterBundle` SHALL support an optional `detachDetailView?(): void` method. The framework SHALL call this method during plugin unload and hot-reload to prevent orphan workspace leaves.

#### Scenario: Plugin unload calls detachDetailView
- **WHEN** the plugin is disabled or Obsidian closes
- **THEN** the framework calls `adapter.detachDetailView()` if implemented
- **AND** the adapter detaches its managed workspace leaf

#### Scenario: Hot-reload calls detachDetailView
- **WHEN** the plugin hot-reloads (stash path)
- **THEN** the framework calls `adapter.detachDetailView()` before stashing terminals
- **AND** no orphan editor leaves remain in the workspace after reload

#### Scenario: BaseAdapter default is no-op
- **WHEN** an adapter extends `BaseAdapter` without overriding `detachDetailView`
- **THEN** the default implementation does nothing and does not throw

### Requirement: No orphan leaves after lifecycle transitions
After any lifecycle transition (close, hot-reload, item deselect), the workspace SHALL NOT contain orphan leaves created by the detail panel system.

#### Scenario: Deselect leaves last file showing
- **WHEN** the user deselects a work item (selects null)
- **THEN** the adapter's detail leaf remains showing the last viewed file
- **AND** the leaf is NOT detached

#### Scenario: Reload preserves no orphans
- **WHEN** the plugin performs a hot-reload cycle (stash then restore)
- **THEN** zero orphan markdown leaves from the detail panel exist after reload completes

### Requirement: CSS removes centre panel styles
The `styles.css` file SHALL NOT contain `.wt-centre-panel` class definitions. The layout comment SHALL reference "2-column split" (not "3-column").

#### Scenario: Clean CSS after change
- **WHEN** the styles.css file is inspected
- **THEN** there are no `.wt-centre-panel` rules
- **AND** the layout section header references 2-column layout
