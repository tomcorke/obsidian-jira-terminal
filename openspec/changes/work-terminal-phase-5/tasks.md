## 1. Create Regression Test Document

- [x] 1.1 Create `docs/regression-tests.md` with test case structure (ID, description, preconditions, steps, expected result, status, notes) grouped by feature inventory sections
- [x] 1.2 Write Terminal Core test cases (items 1-10: PTY wrapper, keyboard interception, resize protocol, xterm CSS, tilde expansion, resolveCommand, double-rAF, screen reading, scroll button, 3s keep-alive)
- [x] 1.3 Write Tab Management test cases (items 11-15: tab bar, drag-drop reorder, context menu, remember active tab, inline rename)
- [x] 1.4 Write Session Persistence test cases (items 16-19: window-global stash, disk persistence, session resume, hot-reload command)
- [x] 1.5 Write Task List test cases (items 20-28: collapsible sections, drag reorder, move-to-top, session badges, Claude state indicators, suppress waiting on visible, resume badge, filter, context menu)
- [x] 1.6 Write Layout & Detail test cases (items 29-31: 2-panel split, detail panel via createLeafBySplit, rename detection)
- [x] 1.7 Write Task Operations test cases (items 32-34: task creation, context prompt, session rename detection)
- [x] 1.8 Write Undocumented Implementation Details test cases (spawn delay, state detection internals, ANSI processing, session persistence details, task list internals, parser/mover details, pty-wrapper details, CSS details, view/event details)

## 2. Build and Load Plugin

- [x] 2.1 Run `npm run build` and verify clean compilation with no errors
- [x] 2.2 Load the new plugin in Obsidian via CDP, confirm it registers and opens without errors
- [x] 2.3 Verify task cards render from the vault (baseline: 51 cards from Phase 4 verification)

## 3. Terminal Core Integration Testing

- [x] 3.1 Test PTY spawning: open Shell tab, verify interactive shell with correct cwd
- [ ] 3.2 Test keyboard interception: verify Option+Arrow, Shift+Enter, Option+Backspace in terminal
- [ ] 3.3 Test resize protocol: resize panel, verify terminal dimensions update via OSC sequence
- [x] 3.4 Test xterm CSS injection and rendering
- [ ] 3.5 Test scroll-to-bottom button appearance on scroll-up
- [ ] 3.6 Test 3s keep-alive on early process exit
- [x] 3.7 Test Claude spawning: open Claude tab, verify binary resolution and PATH augmentation

## 4. Tab Management Integration Testing

- [x] 4.1 Test tab bar layout: max-width tabs, ellipsis, action buttons pinned right
- [ ] 4.2 Test tab drag-and-drop reordering with accent border indicator
- [ ] 4.3 Test tab context menu (Rename, Restart Task Agent, Move to Task)
- [ ] 4.4 Test active tab memory per work item (switch items, verify tab restored)
- [ ] 4.5 Test tab inline rename with armed-blur focus pattern

## 5. Session Persistence Integration Testing

- [ ] 5.1 Test window-global stash: hot-reload plugin, verify terminals survive
- [ ] 5.2 Test disk persistence: spawn Claude session, verify data.json entry with version: 1
- [ ] 5.3 Test session resume: reload Obsidian (not hot-reload), verify `--resume` with UUID
- [ ] 5.4 Test 7-day retention pruning of old sessions

## 6. Task List Integration Testing

- [x] 6.1 Test collapsible sections render (Priority, Active, To Do, Done - Done collapsed)
- [ ] 6.2 Test within-section drag reordering with blue indicator and UUID-keyed persistence
- [ ] 6.3 Test cross-section drag for state changes with position respect
- [x] 6.4 Test session count badges on cards
- [ ] 6.5 Test Claude state indicators (active: green spinner, waiting: amber glow, idle: depleting arc with --idle-offset continuity)
- [ ] 6.6 Test suppress-waiting-on-visible-tabs behaviour
- [x] 6.7 Test filter input with case-insensitive 100ms debounce
- [ ] 6.8 Test move-to-top button (hover reveal, moves to top, selects task)
- [ ] 6.9 Test resume badge on cards with resumable sessions
- [ ] 6.10 Test task card context menu (Move to column, Move to Top, Copy Name/Path/Prompt, Done & Close Sessions with danger confirm)

## 7. Layout & Detail Integration Testing

- [x] 7.1 Test 2-panel resizable split with draggable divider
- [x] 7.2 Test detail panel: select task, verify MarkdownView via createLeafBySplit with live preview
- [ ] 7.3 Test rename detection: rename task file via shell, verify 2s UUID-matching window updates state

## 8. Task Operations Integration Testing

- [ ] 8.1 Test task creation via PromptBox: title input, column selector, file creation with UUID/YAML/slug
- [ ] 8.2 Test Claude context prompt content (title, state, path, conditional deadline/blocker)
- [ ] 8.3 Test Claude session rename detection and tab label update

## 9. Bug Fixes

- [x] 9.1 Fix integration bugs discovered during testing:
  - [x] 9.1a Fix detail panel creating duplicate leaves (TaskDetailView survival check used getLeavesOfType("markdown") but freshly-split leaf starts as "empty" type; changed to parent-based check + re-entrancy guard)
  - [x] 9.1b Fix Claude spawn not including binary in commandArgs (buildClaudeArgs returned only flags like --session-id, pty-wrapper received args without the claude command; prepended resolved command path to args array in spawnClaude, spawnClaudeWithContext, and resumeSession)
- [ ] 9.2 Re-run failed test cases after fixes to verify resolution
- [ ] 9.3 Final pass: run through complete regression test document, mark all statuses
