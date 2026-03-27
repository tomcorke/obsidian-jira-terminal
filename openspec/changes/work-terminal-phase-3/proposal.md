## Why

Phases 0-2 built the core terminal infrastructure (PTY, xterm, keyboard capture, resize), Claude CLI integration (launcher, state detection, session rename, headless), and session persistence (window-global stash, disk persistence). These are standalone modules with no Obsidian plugin wiring. Phase 3 composes them into a working Obsidian plugin with the adapter-driven UI framework - the split layout, item list, terminal panel, settings, and item creation flow that adapters plug into.

## What Changes

- Replace the Phase 0 smoke-test `main.ts` with a proper abstract `PluginBase` that wires adapter lifecycle
- Add `MainView` (ItemView): 3-column split layout with resizable dividers, vault event handling (create/delete/rename with UUID-matching), adapter detail panel slot
- Add `ListPanel`: column-based item list with collapsible sections, drag-drop reordering (within-section and cross-section for state changes), custom sort order (UUID-keyed), filtering, selection, session count badges, Claude state indicators (active/waiting/idle animations), move-to-top, resume badges
- Add `TerminalPanelView`: wraps TabManager + Claude integration, tab bar with Shell/Claude/Claude-with-context buttons, state aggregation across tabs, session resume
- Add `PromptBox`: inline item creation UI with adapter-provided column selector, calls adapter `onItemCreated` hook, background enrichment placeholder lifecycle
- Add `SettingsTab`: single settings UI with core settings (claudeCommand, claudeExtraArgs, additionalAgentContext, defaultShell, defaultTerminalCwd) + adapter-provided settings via namespaced keys
- Add `DangerConfirm`: modal wrapper for destructive context menu actions using Obsidian's `Menu` API
- Add `styles.css`: full `wt-` prefixed CSS for all framework components (idle badge animations, ingesting shine, section colours, xterm overflow fixes, layout constraints)

## Capabilities

### New Capabilities
- `plugin-lifecycle`: Plugin registration, view management, hot-reload with terminal preservation, adapter wiring
- `split-layout`: 3-column resizable layout with item list, detail panel, and terminal panel
- `item-list`: Column-based list with collapsible sections, drag-drop reordering, filtering, selection, badges, and state indicators
- `terminal-panel`: Tab bar with Shell/Claude/Claude-with-context spawn buttons, state aggregation, session resume integration
- `item-creation`: Inline creation UI with column selector and background enrichment placeholder lifecycle
- `settings-ui`: Unified settings tab with core + adapter namespaced settings
- `danger-confirm`: Modal confirmation wrapper for destructive actions
- `vault-events`: File create/delete/rename handling with 2s UUID-matching window for shell mv operations

### Modified Capabilities
<!-- No existing specs to modify -->

## Impact

- `src/main.ts` - Complete rewrite from smoke test to adapter-wired plugin entry point
- `src/framework/` - 7 new files (PluginBase, MainView, ListPanel, TerminalPanelView, PromptBox, SettingsTab, DangerConfirm)
- `styles.css` - Full CSS from empty placeholder to complete framework styles
- Core modules consumed: TabManager, ClaudeLauncher, ClaudeStateDetector, SessionStore, SessionPersistence, all interfaces
- No external dependency changes (xterm.js already installed)
