# Copilot Instructions for SharedCopilotContext

This file provides project-wide instructions for all AI agents working on this codebase.

## Project Overview

**SharedCopilotContext** is a multi-platform tool for sharing conversation history and context between:
- GitHub Copilot in VS Code
- GitHub Copilot CLI (standalone `copilot` command)
- Other AI coding agents via MCP (Model Context Protocol)

## Current Status

- **Phase 1** ✅ Complete - Shared text file system (`shared-context.js`)
- **Phase 2** ✅ Complete - Terminal menu with ASCII art (`copilot-menu.js`)
- **Phase 3** 🔄 In Progress - MCP Server (pivoted from WebSockets)
- **Phase 4** ⏳ Pending - Polish, testing, Agent Skills

## Multi-Agent Workflow

This project uses a multi-agent workflow with specialized agents:

| Agent | Role | When to Use |
|-------|------|-------------|
| **Orchestrator** | Coordinates work, delegates tasks | Complex multi-step tasks |
| **Architect** | Design decisions, API specs | New features, major changes |
| **Implementer** | Writes code, fixes bugs | Any code changes |
| **Tester** | Validates, writes tests | After implementation |
| **Docs** | Updates documentation | After features complete |

## Coding Conventions

### JavaScript Style

```javascript
// ES Modules (not CommonJS)
import { thing } from 'package';

// JSDoc for public functions
/**
 * Description
 * @param {Type} param - Description
 * @returns {Type} Description
 */

// Async/await over callbacks
async function doThing() {
  const result = await asyncOperation();
  return result;
}

// Descriptive error messages
throw new Error(`Failed to read file: ${filePath}`);
```

### File Organization

- `src/` - Main source code
- `src/utils/` - Shared utilities
- `tests/` - Test files
- `templates/` - Template files
- `.github/agents/` - Agent definitions
- `.github/skills/` - Agent skills

### Cross-Platform

Always use path utilities from `src/utils/paths.js`:
- `getVSCodeUserDataPath()` - Platform-specific VS Code path
- `getContextFilePath()` - Resolve context.md location
- `isWindows()`, `isMacOS()` - Platform detection

## Shared Context

### Reading Context

Always read `context.md` at session start to understand:
- Current project state
- Recent changes
- Active tasks
- Known issues

### Updating Context

After significant actions, append to `context.md`:
```markdown
## [YYYY-MM-DD HH:MM] [Agent Name] Update

### Action
[What was done]

### Changes
- [File changed]: [What changed]

### Status
[Current state, any blockers]

### Next Steps
[What should happen next]
```

## Dependencies

- chalk: Terminal colors
- chokidar: File watching
- express: HTTP server
- glob: File pattern matching
- socket.io: WebSocket support (Phase 3 alternative)

## Testing

Run tests with:
```bash
npm test                     # All tests
node --test tests/file.test.js  # Specific test
```

## Commits

Follow conventional commits:
```
type(scope): description

feat: New feature
fix: Bug fix
docs: Documentation
refactor: Code restructure
test: Add tests
chore: Maintenance
```

## Key Files to Know

| File | Purpose |
|------|---------|
| `src/shared-context.js` | Main CLI for context.md management |
| `src/copilot-menu.js` | Interactive history browser |
| `src/utils/paths.js` | Cross-platform path utilities |
| `src/utils/parser.js` | VS Code chat session parser |
| `context.md` | Shared project state |
| `IMPLEMENTATION_NOTES.md` | Technical decisions log |
