## ADDED Requirements

### Requirement: Tab bar with spawn buttons
TerminalPanelView SHALL render a tab bar with tabs for the selected item's sessions and three pinned action buttons: "+ Shell", "+ Claude", "+ Claude (with context)".

#### Scenario: Tab bar renders with action buttons
- **WHEN** a work item is selected
- **THEN** the tab bar shows existing session tabs and the three spawn buttons pinned to the top-right

### Requirement: Shell spawn creates plain terminal
Clicking "+ Shell" SHALL spawn a new terminal tab using the default shell and working directory from settings.

#### Scenario: Shell spawn
- **WHEN** user clicks "+ Shell"
- **THEN** a new terminal tab opens with the configured shell in the configured working directory

### Requirement: Claude spawn creates Claude CLI session
Clicking "+ Claude" SHALL spawn a new terminal tab running Claude CLI with the configured command, extra args, and a generated session ID for persistence.

#### Scenario: Claude spawn
- **WHEN** user clicks "+ Claude"
- **THEN** a new terminal tab opens running Claude CLI with a unique session ID

### Requirement: Claude with context spawn includes adapter prompt
Clicking "+ Claude (with context)" SHALL call `adapter.createPromptBuilder().buildPrompt()` for the selected item, pass the prompt to Claude CLI, and spawn a new terminal tab.

#### Scenario: Claude with context spawn
- **WHEN** user clicks "+ Claude (with context)" for a selected work item
- **THEN** a new Claude terminal opens with the adapter-generated prompt as initial context

### Requirement: State aggregation across tabs
TerminalPanelView SHALL aggregate Claude states across all tabs for the selected item. Priority order: waiting > active > idle > inactive. The aggregate state SHALL be emitted to the parent view for card badge updates.

#### Scenario: State aggregation priority
- **WHEN** a work item has one "waiting" tab and two "active" tabs
- **THEN** the aggregate state reported is "waiting"

#### Scenario: Visible tab suppresses waiting
- **WHEN** a Claude tab is visible and in "waiting" state (user can see the prompt)
- **THEN** the tab reports "idle" instead of "waiting" for state aggregation

### Requirement: Session resume via --resume
TerminalPanelView SHALL resume persisted Claude sessions by spawning Claude CLI with `--resume <session-id>`. Failed resumes (process exits within 5s) SHALL keep the persisted entry for retry.

#### Scenario: Session resume
- **WHEN** a work item has a persisted Claude session ID
- **THEN** clicking the resume action spawns Claude with --resume and the stored session ID

#### Scenario: Failed resume preserves entry
- **WHEN** a resumed Claude session exits within 5s
- **THEN** the persisted session entry is kept for future retry

### Requirement: Remember active tab per item
TerminalPanelView SHALL store and restore the active tab index per work item, so switching between items remembers which tab was active.

#### Scenario: Active tab memory
- **WHEN** user selects tab 3 on item A, switches to item B, then back to item A
- **THEN** tab 3 is active on item A

### Requirement: Tab context menu
Right-clicking a tab SHALL show a context menu with: Rename (enters inline edit mode), Restart (for Claude sessions, using session type not label), Move to Item (grouped by state, excludes archived).

#### Scenario: Tab rename via context menu
- **WHEN** user selects "Rename" from tab context menu
- **THEN** the tab label enters inline edit mode with click-to-commit or blur-to-commit

#### Scenario: Tab move to different item
- **WHEN** user selects "Move to Item > Some Item" from tab context menu
- **THEN** the tab moves to the target item's session group and both items' badges update

### Requirement: Tab inline rename with armed blur
Tab inline rename SHALL use an "armed blur" focus pattern to prevent premature commit. The rename input SHALL stop keydown/mousedown propagation to prevent terminal focus stealing.

#### Scenario: Armed blur prevents premature commit
- **WHEN** the rename input opens
- **THEN** blur events are ignored until the input is "armed" (200ms delay), preventing focus competition with xterm

### Requirement: 3s keep-alive on early exit
If a terminal process exits within 3s of spawn, the tab SHALL remain open so error messages are visible.

#### Scenario: Early exit keeps tab open
- **WHEN** a terminal process exits within 3s of spawning
- **THEN** the tab remains visible showing the error output instead of closing immediately
