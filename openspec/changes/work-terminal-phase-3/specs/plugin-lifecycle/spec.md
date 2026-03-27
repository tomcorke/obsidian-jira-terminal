## ADDED Requirements

### Requirement: Plugin registers view and commands on load
The plugin SHALL register the work-terminal view type, a ribbon icon, an "Open Work Terminal" command, and a "Reload Plugin (preserve terminals)" command when loaded by Obsidian.

#### Scenario: Plugin load registers view
- **WHEN** Obsidian loads the plugin
- **THEN** the work-terminal view type is registered and available via command palette

#### Scenario: Ribbon icon opens view
- **WHEN** user clicks the ribbon icon
- **THEN** the work-terminal view opens in a new tab (or focuses existing)

### Requirement: PluginBase wires adapter to lifecycle
PluginBase SHALL accept an AdapterBundle and wire it to the plugin lifecycle. The adapter's parser, mover, card renderer, and prompt builder SHALL be instantiated during plugin load and passed to framework components.

#### Scenario: Adapter instantiation on load
- **WHEN** the plugin loads with a provided AdapterBundle
- **THEN** all adapter factory methods (createParser, createMover, createCardRenderer, createPromptBuilder) are called and their results wired to framework components

### Requirement: Hot-reload preserves terminal sessions
The "Reload Plugin (preserve terminals)" command SHALL stash all live terminal sessions to the window-global store before disabling the plugin, then restore them after re-enabling.

#### Scenario: Hot-reload preserves running terminals
- **WHEN** user triggers the reload command while terminals are running
- **THEN** terminal processes continue running and are restored in the new plugin instance with their existing output and state

### Requirement: Settings tab registered on load
The plugin SHALL register a PluginSettingTab that combines core framework settings with adapter-provided settings.

#### Scenario: Settings tab available
- **WHEN** user opens Obsidian settings
- **THEN** a "Work Terminal" settings tab is present with both core and adapter settings sections
