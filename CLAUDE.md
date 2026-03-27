# obsidian-jira-terminal

Jira board terminal - Obsidian plugin that displays a Jira Kanban board with per-ticket tabbed terminals. Built on the work-terminal adapter framework.

## Architecture

Based on obsidian-work-terminal's three-layer design with a Jira-specific adapter:

```
src/
  core/           # Terminal infrastructure + Claude CLI integration (from work-terminal)
  framework/      # Obsidian plugin scaffolding (from work-terminal)

  adapters/
    jira/         # Jira adapter
      index.ts             # JiraAdapter extending BaseAdapter
      types.ts             # JiraIssue, JiraStatus, KanbanColumn, mappings
      JiraConfig.ts        # PluginConfig: 5 columns (New/In Progress/Ready for Test/Testing/Done)
      JiraClient.ts        # HTTP client using requestUrl + Keychain auth
      JiraSync.ts          # Fetch from Jira API, sync to vault cache files, polling
      JiraCacheFile.ts     # Cache file generation and frontmatter updates
      JiraParser.ts        # Parse cached markdown files into WorkItems
      JiraMover.ts         # Two-phase move: Jira transition API + cache file move
      JiraCard.ts          # Issue type/priority/assignee badges, Jira context menu
      JiraPromptBuilder.ts # Rich Claude context with all Jira metadata

  main.ts         # Entry point: imports JiraAdapter
```

### How it works

1. JiraSync fetches issues from the Jira REST API via JQL
2. Issues are cached as markdown files in the vault (one file per issue, organized by status folder)
3. The framework reads these cache files via vault events and renders the kanban board
4. Moving a card triggers a Jira transition API call, then moves the cache file
5. Polling keeps the cache in sync with Jira

### Credentials

Jira API token is stored in macOS Keychain:
```bash
security add-generic-password -s "Atlassian API Token" -a "<email>" -w "<token>"
```

The email is configured in plugin settings as "Jira username".

## Development workflow

- **Build**: `npm run build` (production) or `npm run dev` (watch mode with CDP hot-reload)
- **Test**: `npx vitest run`
- **Output**: esbuild outputs `main.js` to repo root
- **Vault link**: `.obsidian/plugins/jira-terminal` should be a symlink to this repo directory
- **Hot reload**: Requires Obsidian with `open -a Obsidian --args --remote-debugging-port=9222`

**IMPORTANT**: Never reload via raw `app.plugins.disablePlugin/enablePlugin` or Cmd+R - these destroy terminal sessions. Always use:
- `npm run dev` watch mode (preferred)
- Command palette: "Jira Terminal: Reload Plugin (preserve terminals)"
- CDP: `node cdp.js`

## Commits
Commit each discrete change individually. Do not batch unrelated changes.

## Issue tracking
Use GitHub Issues for TODOs and bugs. Framework-level issues should be logged against tomcorke/obsidian-work-terminal.

## Known constraints

- **PTY**: Electron sandbox blocks pty.spawn. Python `pty.fork()` via `pty-wrapper.py` is the workaround.
- **xterm.js CSS**: Full CSS embedded inline at runtime via `XtermCss.ts`.
- **Node builtins**: Use `window.require` for `child_process`, `fs`, `path`, `os` in Electron.
- **Cache files required**: The framework requires TFile objects for parsing and moving. API-sourced data must be cached as vault files first.

## Security

- **No credentials in code**: API tokens are read from macOS Keychain at runtime
- **No PII in committed files**: Settings with usernames are stored in data.json (gitignored)
- **Cache files**: Jira issue cache files contain ticket data - do not commit vault content
