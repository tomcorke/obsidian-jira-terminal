## ADDED Requirements

### Requirement: Core settings section
SettingsTab SHALL render a "Core" section with the following settings: claudeCommand (text), claudeExtraArgs (text, split on whitespace at runtime), additionalAgentContext (text), defaultShell (text), defaultTerminalCwd (text).

#### Scenario: Core settings rendered
- **WHEN** user opens the Work Terminal settings tab
- **THEN** five core settings are displayed with text inputs and descriptions

### Requirement: Adapter settings section
SettingsTab SHALL render an "Adapter" section with settings defined by `adapter.config.settingsSchema`. Each setting SHALL be rendered according to its type (text, toggle, dropdown).

#### Scenario: Adapter settings rendered from schema
- **WHEN** the adapter provides a settingsSchema with 3 fields
- **THEN** the settings tab shows 3 additional settings in the adapter section

### Requirement: Namespaced setting keys
All settings SHALL be stored in plugin data.json under a flat `settings` object with dot-namespaced keys: `core.*` for framework settings, `adapter.*` for adapter settings.

#### Scenario: Settings persisted with namespaces
- **WHEN** user changes the claudeCommand setting
- **THEN** the value is stored at `settings["core.claudeCommand"]` in plugin data.json

### Requirement: Default values from config
Settings SHALL use default values from `adapter.config.defaultSettings` (for adapter keys) and hardcoded defaults (for core keys) when no saved value exists.

#### Scenario: Default values applied
- **WHEN** the plugin loads for the first time with no saved settings
- **THEN** all settings display their default values
