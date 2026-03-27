## ADDED Requirements

### Requirement: Regression test document exists
The project SHALL contain a formal regression test document at `docs/regression-tests.md` covering all 34 feature inventory items and key undocumented implementation details from the task file.

#### Scenario: Document covers all feature inventory groups
- **WHEN** the regression test document is reviewed
- **THEN** it SHALL contain test sections for: Terminal Core (items 1-10), Tab Management (items 11-15), Session Persistence (items 16-19), Task List (items 20-28), Layout & Detail (items 29-31), Task Operations (items 32-34)

#### Scenario: Each test case has pass/fail tracking
- **WHEN** a tester uses the regression document
- **THEN** each test case SHALL have fields for: test ID, description, preconditions, steps, expected result, status (pass/fail/skip), and notes

### Requirement: Terminal core feature parity
The new plugin SHALL replicate all 10 terminal core features from the original plugin.

#### Scenario: Python PTY wrapper spawns shell
- **WHEN** a user opens a new Shell tab
- **THEN** pty-wrapper.py SHALL spawn a login interactive shell with tilde-expanded cwd

#### Scenario: Keyboard interception captures Obsidian shortcuts
- **WHEN** a terminal tab is focused and the user presses Option+Arrow, Shift+Enter, or Option+Backspace
- **THEN** the terminal SHALL receive the correct escape sequences instead of Obsidian handling them

#### Scenario: Terminal resize protocol works
- **WHEN** the terminal panel is resized
- **THEN** the custom OSC resize sequence SHALL be sent to pty-wrapper.py and the terminal dimensions SHALL update

#### Scenario: Scroll-to-bottom button appears
- **WHEN** the terminal output exceeds visible area and the user scrolls up
- **THEN** a scroll-to-bottom overlay button SHALL appear

#### Scenario: Early exit tab keep-alive
- **WHEN** a spawned process exits within 3 seconds
- **THEN** the tab SHALL remain open for 3 seconds so error messages are visible

### Requirement: Tab management feature parity
The new plugin SHALL replicate all 5 tab management features from the original plugin.

#### Scenario: Tab bar renders with action buttons
- **WHEN** a work item is selected
- **THEN** the tab bar SHALL show existing tabs with max-width 200px ellipsis and action buttons (+ Shell, + Claude, + Claude with context) pinned top-right

#### Scenario: Tab drag-and-drop reorders tabs
- **WHEN** a user drags a tab to a new position
- **THEN** the tab order SHALL update with an accent border drop indicator and the new order SHALL persist

#### Scenario: Tab context menu provides expected actions
- **WHEN** a user right-clicks a tab
- **THEN** the context menu SHALL offer: Rename, Restart Task Agent (for Claude sessions), Move to Task (grouped by state headers)

#### Scenario: Active tab remembered per item
- **WHEN** a user switches between work items
- **THEN** the previously active tab for each item SHALL be restored on re-selection

#### Scenario: Tab inline rename works
- **WHEN** a user triggers tab rename
- **THEN** an inline edit field SHALL appear with the armed-blur focus pattern (handling Obsidian/xterm focus competition)

### Requirement: Session persistence feature parity
The new plugin SHALL replicate all 4 session persistence features.

#### Scenario: Window-global stash survives hot-reload
- **WHEN** the plugin is hot-reloaded via "Reload Plugin (preserve terminals)"
- **THEN** all terminal sessions (PTY processes, xterm instances, DOM state) SHALL survive via window.__workTerminalStore

#### Scenario: Disk persistence stores session metadata
- **WHEN** a Claude session is spawned
- **THEN** session metadata (task path, session ID, label, type) SHALL be persisted to data.json with version: 1 schema

#### Scenario: Session resume works with UUID
- **WHEN** a persisted Claude session exists and the plugin is reloaded (without hot-reload)
- **THEN** the session SHALL resume via `claude --resume <session-id>` with preserved tab label

#### Scenario: 7-day session retention
- **WHEN** persisted sessions are loaded
- **THEN** sessions older than 7 days SHALL be pruned

### Requirement: Task list feature parity
The new plugin SHALL replicate all 9 task list features from the original plugin.

#### Scenario: Collapsible column sections render
- **WHEN** the list panel loads
- **THEN** sections for Priority, Active, To Do, Done SHALL render with Done collapsed by default

#### Scenario: Within-section drag reordering works
- **WHEN** a user drags a task card within a section
- **THEN** the card SHALL move to the drop position with a blue indicator, and the custom order SHALL persist (UUID-keyed)

#### Scenario: Cross-section drag changes state
- **WHEN** a user drags a task card to a different section
- **THEN** the task's state SHALL change and the drop position within the target section SHALL be respected

#### Scenario: Session count badges display
- **WHEN** a task has open terminal sessions
- **THEN** a session count badge SHALL appear on the task card

#### Scenario: Claude state indicators animate correctly
- **WHEN** Claude is active in a task's terminal
- **THEN** the card SHALL show a green arc spinner; WHEN waiting, amber pulsing glow; WHEN idle, desaturating badge with depleting arc over 300s with animation continuity via --idle-offset CSS variable

#### Scenario: Filter input searches tasks
- **WHEN** a user types in the filter input
- **THEN** task cards SHALL be filtered case-insensitively with 100ms debounce

#### Scenario: Move-to-top button works
- **WHEN** a user hovers over a task card and clicks the move-to-top button
- **THEN** the task SHALL move to the top of its section and become selected

#### Scenario: Resume badge shows for resumable sessions
- **WHEN** a task has persisted Claude sessions that can be resumed
- **THEN** a resume badge SHALL appear on the task card

#### Scenario: Task card context menu provides expected actions
- **WHEN** a user right-clicks a task card
- **THEN** the context menu SHALL offer: Move to column, Move to Top, Copy Name, Copy Path, Copy Context Prompt, Done & Close Sessions (with danger confirmation)

### Requirement: Layout and detail panel feature parity
The new plugin SHALL replicate all 3 layout features.

#### Scenario: 2-panel split layout renders
- **WHEN** the plugin view opens
- **THEN** a 2-panel resizable layout SHALL render (task list | terminals) with a draggable divider

#### Scenario: Detail panel opens as workspace leaf
- **WHEN** a task is selected and the adapter provides createDetailView
- **THEN** a native Obsidian MarkdownView SHALL open via createLeafBySplit with live preview, frontmatter editing, and backlinks

#### Scenario: Rename detection handles delete+create
- **WHEN** a task file is renamed via shell mv (delete + create within 2 seconds)
- **THEN** the plugin SHALL match by UUID from MetadataCache and update task order, terminal session keys, and selection

### Requirement: Task operations feature parity
The new plugin SHALL replicate all 3 task operation features.

#### Scenario: Task creation via PromptBox
- **WHEN** a user enters a title in the PromptBox and selects a column
- **THEN** a task file SHALL be created with UUID, YAML frontmatter, and correct filename slug, followed by background Claude enrichment

#### Scenario: Claude context prompt includes task metadata
- **WHEN** a Claude (with context) session is spawned for a task
- **THEN** the prompt SHALL include the task's title, state, path, and conditionally deadline and blocker information

#### Scenario: Claude session rename detected
- **WHEN** Claude renames its session during a terminal session
- **THEN** the tab label SHALL update to reflect the new session name via output stream monitoring with ANSI stripping

### Requirement: Undocumented implementation details verified
Key undocumented behaviours from the code audit SHALL be verified during integration testing.

#### Scenario: 150ms spawn delay lets CSS layout complete
- **WHEN** a new terminal tab is created
- **THEN** there SHALL be a 150ms delay before spawning to allow CSS layout to complete for correct initial terminal dimensions

#### Scenario: State detection reads xterm buffer not stdout
- **WHEN** Claude state is being detected
- **THEN** the detector SHALL read the xterm buffer (using baseY + cursorY) and only check the last 6 screen lines for active indicators

#### Scenario: 2s active suppression after reload
- **WHEN** sessions are restored from hot-reload stash
- **THEN** active state detections SHALL be suppressed for 2 seconds (downgraded to idle) to avoid false positives from stale buffer content

#### Scenario: Write-then-move pattern for task state changes
- **WHEN** a task is moved to a different column
- **THEN** the mover SHALL modify file content first (state, tags, timestamp, activity log) then rename the file to the new folder

#### Scenario: Metadata cache wait with timeout fallback
- **WHEN** task metadata is needed after a file operation
- **THEN** the system SHALL wait for MetadataCache with a 3-5 second timeout fallback to prevent UI hanging
