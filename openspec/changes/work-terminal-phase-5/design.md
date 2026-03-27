## Context

The obsidian-work-terminal plugin has been built across phases 0-4: 42 source files implementing the full 3-layer architecture (core, framework, adapter) with 101 unit tests. The plugin compiles and loads in Obsidian, showing task cards from the vault. However, no systematic integration testing has been done - the unit tests cover pure logic only, and each phase was verified with minimal CDP smoke tests (plugin loads, commands register, layout renders).

The original plugin (`obsidian-task-terminal`, 40 commits, ~4,500 lines) serves as the reference implementation. It runs in the same Obsidian vault and can be loaded side-by-side for comparison.

## Goals / Non-Goals

**Goals:**
- Create a formal regression test document that can be used repeatedly for manual verification
- Achieve feature parity with the original plugin for all 34 inventory items
- Fix integration bugs found during testing
- Verify all critical cross-cutting behaviours work end-to-end

**Non-Goals:**
- Automated integration/E2E tests (too much Obsidian mocking for too little confidence - per design decision #8)
- Performance benchmarking against the original
- UI pixel-perfect matching (CSS will differ due to `wt-` prefix, but layout and behaviour must match)
- Testing adapter extensibility (fork-and-replace is Phase 6 documentation)

## Decisions

### 1. Test approach: CDP-driven manual testing with structured document

Manual testing via CDP remote debugging (port 9222), guided by a structured regression test document. Each feature inventory item becomes a test case with pass/fail/notes columns.

**Why not automated**: The plugin's UI is deeply integrated with Obsidian's workspace system (leaves, splits, vault events, MetadataCache). Automating would require mocking the entire Obsidian runtime for minimal additional confidence over careful manual testing.

**Why CDP**: Enables hot-reload during testing, console inspection, and DOM queries without leaving the terminal. The existing `cdp.js` helper supports this workflow.

### 2. Test document structure: grouped by component, ordered by dependency

Test cases grouped to match the feature inventory sections (Terminal Core, Tab Management, Session Persistence, Task List, Layout, Task Operations). Within each group, ordered so foundational features are tested first (e.g., terminal spawning before tab management).

**Why**: Catches cascading failures early. If terminal spawning is broken, there's no point testing tab drag-drop.

### 3. Bug fix approach: fix-in-place, no interface changes

Integration bugs SHALL be fixed directly in the existing source files. No interface or architectural changes - if a bug requires an interface change, it indicates a design issue that should be discussed separately.

**Why**: Phase 5 is about proving the existing architecture works, not redesigning it.

### 4. Side-by-side comparison method

For ambiguous behaviours, load the original plugin (`task-terminal`) alongside the new one (`work-terminal`) in the same Obsidian vault. Compare DOM structure, event handling, and visual output directly.

**Why**: The original is the reference. When the task file's feature inventory is ambiguous about exact behaviour, the original code is authoritative.

## Risks / Trade-offs

- **False confidence from manual testing** - Manual tests can miss edge cases and timing issues. Mitigation: the regression document includes the undocumented implementation details (timing workarounds, edge cases) as explicit test cases, not just the 34 high-level features.
- **Test environment state** - Vault state (task files, session data) affects test outcomes. Mitigation: document required preconditions for each test group. Reset state between groups when needed.
- **Scope creep from bug fixes** - Fixing integration bugs could snowball into architectural changes. Mitigation: strict rule - if a fix requires interface changes, log it as a Phase 6 item and work around it for now.
- **Original plugin version drift** - If the original plugin is modified during testing, the reference changes. Mitigation: the original plugin is explicitly marked "do not modify" in the task file.
