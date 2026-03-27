## ADDED Requirements

### Requirement: Column-based collapsible sections
ListPanel SHALL render one collapsible section per column defined in `adapter.config.columns`. Each section header SHALL show the column label and item count. The "done" column (last column) SHALL be collapsed by default.

#### Scenario: Sections rendered from adapter config
- **WHEN** the list panel renders with adapter columns [priority, active, todo, done]
- **THEN** four collapsible sections appear with headers showing column labels and counts

#### Scenario: Done section collapsed by default
- **WHEN** the list panel renders for the first time
- **THEN** the last column section is collapsed and others are expanded

### Requirement: Cards rendered by adapter CardRenderer
ListPanel SHALL call `adapter.createCardRenderer().render(item, ctx)` for each item, where `ctx` is a framework-provided CardActionContext with callbacks for select, moveToTop, moveToColumn, insertAfter, delete, and closeSessions.

#### Scenario: Adapter card rendering
- **WHEN** a work item is displayed in the list
- **THEN** the adapter's CardRenderer produces the card HTML element with framework action callbacks wired

### Requirement: Within-section drag-drop reordering
Items within a section SHALL be reorderable via HTML5 drag-and-drop. A 2px accent-coloured drop indicator SHALL show the insertion point. The custom order SHALL persist to plugin data.json.

#### Scenario: Drag reorder within section
- **WHEN** user drags a card within the same section
- **THEN** the card moves to the drop position and the new order persists across sessions

#### Scenario: Drop indicator shown during drag
- **WHEN** user drags a card over other cards in the same section
- **THEN** a 2px accent-coloured line shows the insertion point

### Requirement: Cross-section drag for state changes
Dragging a card to a different section SHALL trigger `adapter.createMover().move()` to change the item's state, with a 200ms delay before re-render to allow metadata cache updates. The drop position within the target section SHALL be respected.

#### Scenario: Cross-section drag changes state
- **WHEN** user drags a card from "active" section to "done" section
- **THEN** the adapter's mover is called to transition the item state, and the card appears in the target section

### Requirement: Auto-expand collapsed sections on drag-over
Collapsed sections SHALL expand when a card is dragged over their header or cards area.

#### Scenario: Collapsed section expands on drag-over
- **WHEN** user drags a card over a collapsed section header
- **THEN** the section expands to show its cards and accept the drop

### Requirement: Custom sort order with UUID keys
Custom sort order SHALL be keyed by item UUID (not file path) to survive renames. Ordered items sort first within their section; unordered items fall through to default sort.

#### Scenario: Sort order survives rename
- **WHEN** an item file is renamed but keeps its UUID
- **THEN** the item retains its custom sort position

### Requirement: Filter input
A case-insensitive text filter SHALL show/hide cards and collapse empty sections. The filter SHALL debounce at 100ms.

#### Scenario: Filter hides non-matching cards
- **WHEN** user types a filter term
- **THEN** only cards with matching title/path are visible, and empty sections are hidden

### Requirement: Session count badges on cards
Cards SHALL display a badge showing the count of open terminal sessions for that item.

#### Scenario: Session badge shows count
- **WHEN** a work item has 3 open terminal sessions
- **THEN** the card displays a badge showing "3"

### Requirement: Claude state indicators on cards
Cards SHALL show CSS-animated state indicators: green arc spinner (active), amber pulsing glow (waiting), desaturating badge with 300s depletion arc (idle). The `--idle-offset` CSS variable SHALL provide animation continuity across re-renders.

#### Scenario: Active state shows green spinner
- **WHEN** any Claude session for an item is in the "active" state
- **THEN** the card badge shows a green spinning arc animation

#### Scenario: Idle animation resumes at correct position
- **WHEN** a card with an idle Claude session (120s elapsed) is re-rendered
- **THEN** the idle depletion animation resumes at the 120s mark, not from the start

### Requirement: Move-to-top button
Cards SHALL show a hover-revealed "move to top" button that moves the item to the top of its section's custom order and selects it.

#### Scenario: Move to top
- **WHEN** user clicks the move-to-top button on a card
- **THEN** the card moves to the first position in its section and becomes selected

### Requirement: Resume badge on cards
Cards with resumable Claude sessions (persisted but not running) SHALL show a resume badge.

#### Scenario: Resume badge displayed
- **WHEN** a work item has persisted Claude sessions that are not currently running
- **THEN** the card displays a resume badge indicator

### Requirement: Selection state
Clicking a card SHALL select it, highlighting it visually and switching the terminal panel and detail panel to show that item's content.

#### Scenario: Card selection
- **WHEN** user clicks a card
- **THEN** the card is highlighted, the terminal panel shows that item's sessions, and the detail panel shows that item's detail view

### Requirement: Placeholder cards for enrichment
ListPanel SHALL support placeholder cards that show an "ingesting" shimmer animation during background enrichment. Placeholders SHALL auto-dismiss after 5s on failure or resolve with a checkmark on success.

#### Scenario: Placeholder during enrichment
- **WHEN** a new item is being enriched by Claude in the background
- **THEN** a placeholder card with shimmer animation appears in the list

#### Scenario: Placeholder resolves on success
- **WHEN** background enrichment completes successfully
- **THEN** the placeholder is replaced by the real card with a brief checkmark indicator
