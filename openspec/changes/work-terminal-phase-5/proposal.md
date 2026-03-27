## Why

Phases 0-4 built the complete obsidian-work-terminal plugin (42 source files, 101 unit tests) but it has never been tested as an integrated whole inside Obsidian against the original plugin's behaviour. The unit tests cover pure logic (utils, state detector, parser, mover, template, prompt builder) but cannot catch integration issues - wiring mistakes, missing event handlers, incorrect lifecycle ordering, or regressions in ported battle-tested code. Before polish (Phase 6), we need confidence that the new plugin achieves feature parity with the original.

## What Changes

- Create a formal regression test document covering all 34 feature inventory items plus key undocumented implementation details
- Perform a systematic feature parity check: load the new plugin in Obsidian via CDP, exercise each feature against the regression test document, and fix any issues found
- Verify critical cross-cutting behaviours: hot-reload with terminal preservation, session persistence (window-global stash + disk), rename detection (2s UUID-matching window), Claude state detection and indicator animations
- Fix integration bugs discovered during testing (wiring, lifecycle, event handling)

## Capabilities

### New Capabilities
- `regression-testing`: Formal regression test document derived from the 34-item feature inventory and undocumented implementation details. Covers terminal core, tab management, session persistence, task list, layout, and task operations. Used as a manual test plan for feature parity verification.

### Modified Capabilities
<!-- No existing specs to modify - this is the first phase with specs -->

## Impact

- All source files under `src/` may receive bug fixes discovered during integration testing
- `styles.css` may need adjustments for visual parity
- No API or interface changes expected - fixes should be implementation-level
- No dependency changes
- Build output (`main.js`) will be rebuilt and tested in Obsidian
