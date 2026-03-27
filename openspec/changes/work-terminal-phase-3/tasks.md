## 1. PluginBase and Entry Point

- [x] 1.1 Create `src/framework/PluginBase.ts` - abstract Plugin subclass that accepts AdapterBundle, registers view type, ribbon icon, open/reload commands, wires adapter factories to framework components
- [x] 1.2 Rewrite `src/main.ts` - concrete class extending PluginBase with hardcoded stub adapter (minimal AdapterBundle that returns placeholder cards and no-op mover/parser)
- [x] 1.3 Create `src/framework/SettingsTab.ts` - PluginSettingTab with core settings section (claudeCommand, claudeExtraArgs, additionalAgentContext, defaultShell, defaultTerminalCwd) and adapter settings section rendered from settingsSchema. Namespaced keys (core.*, adapter.*) stored in plugin data.json
- [x] 1.4 Verify build compiles and plugin loads in Obsidian with stub adapter

## 2. MainView and Split Layout

- [x] 2.1 Create `src/framework/MainView.ts` - ItemView with 3-column flex layout (list, detail, terminal), two draggable dividers with min-width constraints (200/300/300px), ResizeObserver for terminal refit on view switch
- [x] 2.2 Wire detail panel adapter slot - call adapter.createDetailView() if provided, otherwise collapse to 2-column layout
- [x] 2.3 Wire vault event handlers (create, delete, rename, metadataCache.changed) with 150ms debounce, triggering list panel refresh

## 3. ListPanel

- [x] 3.1 Create `src/framework/ListPanel.ts` - column-based list with collapsible sections from adapter.config.columns. Section headers with label, count, collapse toggle. Last section collapsed by default
- [x] 3.2 Card rendering via adapter CardRenderer with framework-provided CardActionContext (select, moveToTop, moveToColumn, insertAfter, delete, closeSessions)
- [x] 3.3 Selection state - click to select card, highlight visually, notify MainView to switch terminal panel and detail panel
- [x] 3.4 Within-section drag-drop reordering with 2px accent drop indicator, custom sort order persisted by UUID keys in plugin data.json
- [x] 3.5 Cross-section drag for state changes via adapter WorkItemMover, 200ms delay before re-render, respect drop position. Auto-expand collapsed sections on drag-over
- [x] 3.6 Filter input with 100ms debounce, case-insensitive matching on title/path, hide empty sections
- [x] 3.7 Move-to-top button (hover-revealed, accent-coloured) that moves item to top of section order and selects it
- [x] 3.8 Session count badges on cards, Claude state indicator classes (active/waiting/idle with CSS animations), resume badges. Idle animation continuity via --idle-offset CSS variable with idleSince timestamps
- [x] 3.9 Placeholder card lifecycle for background enrichment - ingesting shimmer, 5s failure timeout, success checkmark

## 4. Vault Event Handling

- [x] 4.1 Delete-create rename detection - buffer deletes with active sessions for 2s, capture UUID from MetadataCache before clear, match creates by UUID first then folder heuristic
- [x] 4.2 Rekey terminal sessions and custom sort order on successful rename match
- [x] 4.3 MetadataCache "changed" event as fallback for vault "create" - only update list after frontmatter is parsed

## 5. TerminalPanelView

- [x] 5.1 Create `src/framework/TerminalPanelView.ts` - wraps TabManager, renders tab bar container with tabs for selected item's sessions
- [x] 5.2 Three pinned spawn buttons: "+ Shell" (plain terminal via TabManager), "+ Claude" (ClaudeLauncher + session ID), "+ Claude (with context)" (adapter prompt builder + ClaudeLauncher)
- [x] 5.3 State aggregation across tabs (waiting > active > idle > inactive), emit aggregate state to MainView for card badge updates. Suppress waiting on visible tabs
- [x] 5.4 Session resume via --resume for persisted Claude sessions, 5s grace period on failed resume to keep entry for retry
- [x] 5.5 Remember active tab per item - store/restore active tab index per work item path
- [x] 5.6 Tab context menu (Rename, Restart Claude sessions, Move to Item grouped by state). Tab inline rename with armed blur pattern (200ms delay, propagation stopping)
- [x] 5.7 3s keep-alive on early exit - keep tab open if process exits within 3s

## 6. DangerConfirm and Context Menus

- [x] 6.1 Create `src/framework/DangerConfirm.ts` - two-phase confirmation wrapper for Obsidian Menu API. First click arms (text + red style), second click executes. Dismiss on outside click/Escape
- [x] 6.2 Wire card context menus through adapter's getContextMenuItems + framework actions (Move to column, Move to Top, Delete, Close Sessions)

## 7. PromptBox

- [x] 7.1 Create `src/framework/PromptBox.ts` - title input + column selector from adapter.config.creationColumns, Enter to submit, Shift+Enter for newline, input cleared before callback
- [x] 7.2 Wire adapter.onItemCreated hook, coordinate with ListPanel for placeholder card lifecycle

## 8. CSS

- [x] 8.1 Write `styles.css` with full wt-prefixed CSS: layout (3-column, dividers, min-widths), list (sections, cards, badges, drop indicators), terminal (tab bar, tab states), prompt box, filter input
- [x] 8.2 CSS animations: idle badge depletion (300s conic-gradient with --idle-arc custom property), active spinner, waiting glow, ingesting shimmer. Section header border colours per state
- [x] 8.3 xterm overflow fixes (!important on width/overflow-y), inactive tabs visibility:hidden with z-index:-1

## 9. Integration and Verification

- [x] 9.1 Wire all framework components together in MainView - ListPanel, TerminalPanelView, PromptBox, vault events, state propagation
- [x] 9.2 Verify with stub adapter: plugin loads, split layout renders, terminal spawns, tabs work, settings save/load
- [x] 9.3 Test hot-reload: terminals survive reload command, session state restored, no orphan processes
- [x] 9.4 Test session persistence: close and reopen Obsidian, verify persisted sessions appear with resume badges
