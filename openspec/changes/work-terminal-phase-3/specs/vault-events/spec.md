## ADDED Requirements

### Requirement: Debounced vault event refresh
MainView SHALL register vault events (create, delete, rename) and metadataCache.changed event. All events SHALL trigger a debounced list refresh at 150ms to batch rapid changes.

#### Scenario: Rapid vault events batched
- **WHEN** multiple files are created in quick succession
- **THEN** the list refreshes once after the 150ms debounce window, not once per file

### Requirement: Delete-create rename detection with UUID matching
When a file is deleted that has active terminal sessions, MainView SHALL buffer the deletion with the item's UUID for 2s. If a new file is created within that window with the same UUID, MainView SHALL treat it as a rename rather than a delete+create.

#### Scenario: Shell mv detected as rename
- **WHEN** a work item file is moved via shell (appears as delete then create) and the item has terminal sessions
- **THEN** terminal sessions are rekeyed to the new path and custom sort order is preserved

#### Scenario: UUID captured before cache clear
- **WHEN** a file with active sessions is deleted
- **THEN** the UUID is captured from MetadataCache immediately (before Obsidian clears it)

### Requirement: Only buffer deletes with active sessions
Delete events SHALL only be buffered for rename detection if the deleted item has active terminal sessions. Items without sessions SHALL be treated as immediate deletes.

#### Scenario: Delete without sessions not buffered
- **WHEN** a file is deleted that has no terminal sessions
- **THEN** it is removed from the list immediately without entering the pending renames buffer

### Requirement: Two-pass rename matching
Rename matching SHALL first try UUID-based matching (confident, works cross-folder). If no UUID match, it SHALL fall back to same-folder heuristic (for items without UUIDs).

#### Scenario: UUID match cross-folder
- **WHEN** a file is moved to a different folder but keeps its UUID
- **THEN** rename detection matches by UUID and updates the session keys

#### Scenario: Folder heuristic fallback
- **WHEN** a file without a UUID is moved within the same folder tree
- **THEN** rename detection falls back to folder heuristic matching

### Requirement: MetadataCache changed as create fallback
MainView SHALL listen to metadataCache "changed" events as a fallback for vault "create" events, since frontmatter is not yet parsed when the create event fires.

#### Scenario: New file detected via metadata cache
- **WHEN** a new work item file is created
- **THEN** the list updates after the metadataCache "changed" event fires (when frontmatter is parsed), not on the raw create event
