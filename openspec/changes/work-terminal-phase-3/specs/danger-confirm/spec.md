## ADDED Requirements

### Requirement: Two-phase danger confirmation
DangerConfirm SHALL wrap dangerous context menu actions with a two-phase confirmation: first click arms the item (text changes to "{label} - click to confirm" with red styling), second click executes the action.

#### Scenario: First click arms action
- **WHEN** user clicks a danger-flagged menu item for the first time
- **THEN** the item text changes to "{label} - click to confirm" with danger styling, without executing the action

#### Scenario: Second click executes action
- **WHEN** user clicks the armed danger item a second time
- **THEN** the action executes and the menu dismisses

### Requirement: Context menus use Obsidian Menu API
All context menus (card and tab) SHALL use Obsidian's built-in `Menu` class for native look and feel. Dangerous items SHALL be rendered with danger styling.

#### Scenario: Native menu rendering
- **WHEN** user right-clicks a card
- **THEN** an Obsidian-native context menu appears with the adapter's menu items plus framework actions

### Requirement: Compound actions via adapter composition
Adapter-specific compound actions (e.g., "Done & Close Sessions") SHALL compose framework primitives from CardActionContext (e.g., `ctx.onMoveToColumn("done")` then `ctx.onCloseSessions()`). Compound dangerous actions SHALL route through DangerConfirm.

#### Scenario: Compound action executes both steps
- **WHEN** user confirms a "Done & Close Sessions" compound action
- **THEN** the item moves to the done column AND all its terminal sessions are closed
