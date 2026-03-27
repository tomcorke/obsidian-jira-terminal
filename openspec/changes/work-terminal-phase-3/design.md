## Context

Phases 0-2 built the core layer: terminal infrastructure (TerminalTab, TabManager, KeyboardCapture, XtermCss, ScrollButton), Claude integration (ClaudeLauncher, ClaudeStateDetector, ClaudeSessionRename, HeadlessClaude), session persistence (SessionStore, SessionPersistence), and all adapter interfaces (WorkItem, AdapterBundle, BaseAdapter, PluginConfig, etc.). The current `main.ts` is a Phase 0 smoke test with an inline ItemView and single terminal.

Phase 3 replaces this with the framework layer - the Obsidian plugin scaffolding that composes core modules into a working UI and delegates work-item-specific behaviour to adapters via the interfaces defined in Phase 1.

The original `obsidian-task-terminal` plugin serves as a working reference. Its patterns are battle-tested but tightly coupled. Phase 3 extracts the framework concerns into clean, adapter-agnostic modules.

## Goals / Non-Goals

**Goals:**
- Compose core modules (TabManager, ClaudeLauncher, SessionPersistence, etc.) into a working Obsidian plugin
- Build adapter-agnostic framework that renders any AdapterBundle implementation
- Replicate all framework-level UI behaviours from the original plugin (split layout, drag-drop, state indicators, session resume, etc.)
- Verify with a stub adapter that the framework renders and functions before Phase 4 builds the real adapter

**Non-Goals:**
- Building the task-agent adapter (Phase 4)
- Adding tests for DOM-heavy components (design decision #8: pure logic only)
- CSS modules or scoped CSS (design decision #9: `wt-` prefix approach)
- Plugin marketplace submission or documentation (Phase 6)
- Multiple adapter support at runtime (design decision #10: hardcoded import)

## Decisions

### D1: PluginBase as abstract class extending Plugin

PluginBase extends Obsidian's `Plugin` class and accepts an AdapterBundle. It handles `registerView`, ribbon icon, commands (open view, reload plugin), and settings tab registration. Concrete entry point (`main.ts`) instantiates the adapter and passes it to PluginBase.

**Why not a factory function?** Obsidian requires a Plugin subclass as the default export. An abstract class lets the concrete class call `super()` with the adapter while keeping the framework logic reusable.

### D2: MainView owns the 3-column split layout

MainView extends `ItemView` and creates three panels: ListPanel (left), detail panel (centre), TerminalPanelView (right). Two draggable dividers separate them. Min-width constraints prevent panels from collapsing (200px list, 300px detail, 300px terminal).

The detail panel is an adapter-injectable slot. If the adapter provides `createDetailView()`, it's called with the container. Otherwise, the framework shows a 2-column layout (list + terminals only). For the task-agent adapter (Phase 4), this will be an Obsidian MarkdownView via `createLeafBySplit`.

### D3: Vault events with buffered rename detection

MainView registers four vault events: `create`, `delete`, `rename`, and `metadataCache.changed`. All trigger a debounced refresh (150ms). Delete events buffer the task path + UUID for 2s, and subsequent create events match by UUID first, then folder heuristic. This handles shell `mv` operations that Obsidian sees as delete+create.

Only tasks with active terminal sessions are buffered on delete (avoids polluting the pending renames map). UUID is captured from MetadataCache immediately on delete since the cache is about to be cleared.

### D4: ListPanel renders adapter CardRenderer output

ListPanel creates collapsible sections from `adapter.config.columns`. Each section contains cards rendered by `adapter.createCardRenderer().render(item, ctx)`. The framework provides the `CardActionContext` (select, moveToTop, moveToColumn, insertAfter, delete, closeSessions) and the adapter's renderer uses these callbacks.

Custom sort order is stored per-column using item UUIDs as keys. Ordered items sort first; unordered items fall through to default sort (metadata-based, delegated to adapter). This is persisted in plugin data.json under a `customOrder` key.

### D5: Drag-drop uses HTML5 API with visual indicators

Both ListPanel (card reorder + cross-section moves) and TabManager (tab reorder) use HTML5 drag-and-drop. Drop indicators are 2px accent-coloured lines positioned via DOM insertion. Cross-section drag triggers a state change via the adapter's WorkItemMover, with a 200ms delay after move for metadata cache to update before re-render.

Auto-expand collapsed sections on drag-over (both header and cards area).

### D6: TerminalPanelView wraps TabManager with Claude launch buttons

TerminalPanelView creates the tab bar container and three pinned action buttons: "+ Shell", "+ Claude", "+ Claude (with context)". Shell spawns a plain terminal via TabManager. Claude buttons use ClaudeLauncher to build the command and args, then spawn via TabManager with the appropriate session type.

"Claude (with context)" additionally calls `adapter.createPromptBuilder().buildPrompt()` to get the work-item-specific prompt, which is written to a temp file and passed as `--prompt-file` to Claude CLI.

State aggregation follows priority: waiting > active > idle > inactive. TerminalPanelView polls tab states and emits aggregate state changes to MainView, which forwards them to ListPanel for badge updates.

### D7: Claude state indicators use CSS custom properties

Idle badges use `--idle-arc` (syntax: `<angle>`) for animatable conic-gradient depletion over 300s. `--idle-offset` CSS variable provides negative `animation-delay` for re-render continuity (existing idle sessions resume at correct depletion point rather than restarting).

Active state shows a green arc spinner. Waiting state shows amber pulsing glow. These are CSS-only animations driven by class names on the card element.

Pre-seeded `idleSince` on reload: recovered Claude sessions get `idleSince = Date.now() - 300_000` so idle animations start fully stale (depleted arc, desaturated badge).

### D8: PromptBox uses adapter config for column selector

PromptBox renders a title input and column selector dropdown populated from `adapter.config.creationColumns`. On submit, it calls the adapter's `onItemCreated` hook and shows a placeholder card with "ingesting" shimmer animation. The placeholder auto-dismisses after 5s on failure or resolves with a checkmark on success.

Enter sends, Shift+Enter for newline. Input cleared before onSubmit callback fires so user can type while processing.

### D9: SettingsTab combines core and adapter settings

Single `PluginSettingTab` with two sections. Core settings are hardcoded: claudeCommand (text), claudeExtraArgs (text, split on whitespace), additionalAgentContext (text), defaultShell (text), defaultTerminalCwd (text). Adapter settings are rendered from `adapter.config.settingsSchema` with namespaced keys (`adapter.*`).

All settings stored in plugin data.json under a flat `settings` key with dot-namespaced keys.

### D10: DangerConfirm wraps Obsidian's Menu API

Context menus use Obsidian's built-in `Menu` class for native look. Dangerous actions (delete, close all sessions, done & close) get a two-phase confirmation: first click arms the item (text changes to "{label} - click to confirm", red styling), second click executes. This avoids a separate modal for every dangerous action while preventing accidental clicks.

## Risks / Trade-offs

- **Detail panel Obsidian API coupling** - `createLeafBySplit` for the MarkdownView detail panel has complex lifecycle (leaf survival checks, grandparent flex sizing). This is tightly coupled to Obsidian internals that could change. Mitigation: the adapter-injectable slot means this complexity lives in the adapter, not the framework. If the API changes, only the adapter needs updating.

- **CSS animation performance** - Idle badge animations (300s conic-gradient depletion) run per-card. With many idle cards, this could impact performance. Mitigation: CSS animations are GPU-accelerated; the original plugin runs fine with 20+ cards. Monitor if issues arise.

- **State detection timing** - The 2s active suppression after reload (`_suppressActiveUntil`) prevents false positives from stale buffer content but could mask genuine activity. Mitigation: clears early if screen genuinely updates; fresh spawns unaffected.

- **Drag-drop cross-browser** - HTML5 drag-and-drop has quirks across platforms. Mitigation: Obsidian only runs on Electron (Chromium), so cross-browser isn't a concern. The original plugin's approach works reliably.
