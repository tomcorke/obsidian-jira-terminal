## ADDED Requirements

### Requirement: Inline creation UI with column selector
PromptBox SHALL render a title input and column selector dropdown populated from `adapter.config.creationColumns`. The default column SHALL be pre-selected.

#### Scenario: PromptBox renders with adapter columns
- **WHEN** the prompt box is shown
- **THEN** it displays a title input and a column selector with options from the adapter's creationColumns config

### Requirement: Enter to submit, Shift+Enter for newline
Pressing Enter in the PromptBox SHALL submit the new item. Pressing Shift+Enter SHALL insert a newline.

#### Scenario: Enter submits
- **WHEN** user types a title and presses Enter
- **THEN** the item creation flow begins

#### Scenario: Shift+Enter inserts newline
- **WHEN** user presses Shift+Enter in the title input
- **THEN** a newline is inserted in the input without triggering submission

### Requirement: Input cleared before callback
PromptBox SHALL clear the input field before calling the adapter's `onItemCreated` hook, so the user can type the next item while the current one is being processed.

#### Scenario: Input cleared immediately
- **WHEN** user submits a new item
- **THEN** the input field clears immediately, before the adapter callback completes

### Requirement: Adapter onItemCreated hook called after creation
After creating the item file, PromptBox SHALL call `adapter.onItemCreated(path, settings)` if the adapter provides it. This enables background enrichment (e.g., Claude-based enrichment in the task-agent adapter).

#### Scenario: Adapter hook called
- **WHEN** a new item is created successfully
- **THEN** the adapter's onItemCreated hook is called with the file path and current settings

### Requirement: Background enrichment placeholder lifecycle
PromptBox SHALL coordinate with ListPanel to show a placeholder card during background enrichment. The placeholder SHALL show an "ingesting" shimmer. It SHALL auto-dismiss after 5s on failure or resolve with a checkmark on success.

#### Scenario: Placeholder shown during enrichment
- **WHEN** adapter.onItemCreated triggers background processing
- **THEN** a placeholder card with shimmer animation appears in the appropriate list section

#### Scenario: Placeholder auto-dismisses on failure
- **WHEN** background enrichment fails or times out after 5s
- **THEN** the placeholder card is removed from the list
