# SharedCopilotContext - Implementation Notes

**Date:** February 4, 2026  
**Status:** Phase 1 & 2 Complete

## Overview

This document tracks the implementation of the SharedCopilotContext project, a multi-platform tool for sharing conversation history between GitHub Copilot in VS Code and GitHub Copilot CLI.

## Environment Validation

Before implementation, the following was validated:

| Component | Version | Status |
|-----------|---------|--------|
| GitHub CLI | v2.82.1 | ✅ Installed |
| Copilot CLI | v0.0.402 | ✅ Installed (standalone agentic version) |
| Node.js | 18+ | ✅ Required |
| VS Code Chat Storage | Located | ✅ `~/Library/Application Support/Code/User/workspaceStorage/*/chatSessions/*.json` |

### Copilot CLI Discovery

The new standalone Copilot CLI (different from `gh copilot` extension):
- Installed at: `/Users/merlin/Library/Application Support/Code/User/globalStorage/github.copilot-chat/copilotCli/copilot`
- Launched with `copilot` command
- Supports slash commands: `/login`, `/model`, `/lsp`, `/feedback`, `/experimental`
- Uses Claude Sonnet 4.5 by default (can switch to Claude Sonnet 4, GPT-5)
- Supports MCP servers for extensibility

## Phase 1: Shared Text File System ✅

**Goal:** Enable context sharing via `context.md` in workspace root

### Implemented: `shared-context.js`

A Node.js CLI tool with the following commands:

```bash
shared-context init              # Create context.md with template
shared-context read              # Output context contents
shared-context read --raw        # Raw output for piping
shared-context append "content"  # Add timestamped entry
shared-context summary           # Show file statistics
shared-context help              # Display usage
```

### Features
- Cross-platform path handling (macOS, Windows, Linux)
- ANSI color output for terminal
- Timestamp-based session entries
- Workspace path override via `--workspace` flag

### Template Structure

The generated `context.md` includes:
- Header with usage instructions for AI agents
- Project overview section (user-editable)
- Session history section (auto-appended)

## Phase 2: Terminal Menu with ASCII Art ✅

**Goal:** Parse VS Code Copilot JSON files and display conversation history

### Implemented: `copilot-menu.js`

An interactive terminal browser with:

```
╔══════════════════════════════════════════════════════════════╗
║     ██████╗ ██████╗ ██████╗ ██╗██╗      ██████╗ ████████╗   ║
║    ██╔════╝██╔═══██╗██╔══██╗██║██║     ██╔═══██╗╚══██╔══╝   ║
║    ╚██████╗╚██████╔╝██║     ██║███████╗╚██████╔╝   ██║      ║
║            Conversation History Browser                      ║
╚══════════════════════════════════════════════════════════════╝
```

### Features
- Paginated conversation list (10 per page)
- View full conversation with formatted output
- Export selected conversation to `context.md`
- Navigation: `n`/`p` for pages, number to select, `e` to export, `q` to quit

### VS Code Chat Session JSON Structure

Discovered structure at `~/Library/Application Support/Code/User/workspaceStorage/*/chatSessions/*.json`:

```json
{
  "version": 3,
  "responderUsername": "GitHub Copilot",
  "requests": [{
    "requestId": "...",
    "message": { "text": "user prompt", "parts": [...] },
    "response": [
      { "kind": "markdownContent", "content": {...} },
      { "kind": "toolInvocationSerialized", ... }
    ]
  }]
}
```

## Utility Modules

### `src/utils/paths.js`
- `getVSCodeUserDataPath()` - Platform-specific VS Code path
- `getWorkspaceStoragePath()` - Chat session storage location
- `getChatSessionsGlobPattern()` - Glob pattern for finding JSONs
- `getContextFilePath()` - Resolve context.md path
- `isWindows()`, `isMacOS()`, `getLineEnding()`, `normalizePath()`

### `src/utils/parser.js`
- `parseChatSession(filePath)` - Parse JSON to structured object
- `generateTitle(conversation)` - Extract title from first message
- `formatForExport(conversation)` - Convert to markdown
- `summarizeConversation(conversation)` - Quick summary for menu

## Testing Results

| Test | Result |
|------|--------|
| `shared-context init` | ✅ Created context.md |
| `shared-context append` | ✅ Added timestamped entry |
| `shared-context summary` | ✅ Shows stats (2 sessions, 27 lines, 0.74 KB) |
| `copilot-menu` | ✅ Found 9 conversations in VS Code history |
| Global CLI link | ✅ `npm link` successful |

## Dependencies

```json
{
  "chalk": "^5.3.0",
  "chokidar": "^3.5.3",
  "express": "^4.18.2",
  "glob": "^10.3.10",
  "socket.io": "^4.7.2"
}
```

## Phase 3: WebSockets (Pending)

Planned implementation:
- Express + Socket.io server on localhost:3000
- `chokidar` file watcher for chat session changes
- Real-time broadcast of context updates
- Client script for CLI integration
- Fallback to file-based system when server offline

## Phase 4: Polish (Pending)

- Comprehensive error handling
- Setup scripts (`setup.sh`, `setup.ps1`)
- Unit tests with mock data
- MCP server integration hook

## File Structure

```
SharedCopilotContext/
├── README.md
├── IMPLEMENTATION_NOTES.md      # This file
├── package.json
├── context.md                   # Generated context file
├── src/
│   ├── shared-context.js        # Phase 1 CLI
│   ├── copilot-menu.js          # Phase 2 menu
│   └── utils/
│       ├── paths.js             # Cross-platform paths
│       └── parser.js            # JSON parser
├── templates/
│   └── instructions.md          # Agent guidance
├── config/
│   └── platforms.json           # Platform config
├── bin/                         # Symlinks (npm link)
├── tests/mock-data/             # Test fixtures
└── public/                      # Web dashboard (Phase 3)
```

## Usage Integration

### With Copilot CLI
```bash
copilot
# Prompt: "Read context.md and continue from where we left off"
```

### With VS Code Copilot Chat
- Reference `@workspace` for workspace context
- Explicitly mention `context.md` for history
- Prompt prefix: "Read context.md first, then..."

---

*Implementation by GitHub Copilot (Claude Opus 4.5) - February 4, 2026*
