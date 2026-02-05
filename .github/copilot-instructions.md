# SharedCopilotContext - Copilot Instructions

## Project Overview

SharedCopilotContext is a tool for sharing conversation history between GitHub Copilot sessions (VS Code and CLI) and other AI coding agents via the Model Context Protocol (MCP).

## Architecture

```
src/
├── shared-context.js    # CLI for context.md management
├── copilot-menu.js      # Terminal menu for history browsing
├── mcp-server.js        # MCP server entry point
└── mcp/
    ├── manager.js       # ContextManager class
    ├── tools.js         # MCP tool definitions
    ├── resources.js     # MCP resource definitions
    └── prompts.js       # MCP prompt templates
```

## Tech Stack

- **Runtime:** Node.js 18+ (ES Modules)
- **MCP SDK:** @modelcontextprotocol/sdk v1.26.0
- **Dependencies:** chalk, chokidar, glob
- **Testing:** Node.js built-in test runner

## Key Conventions

### Code Style
- ES Modules with `.js` extensions on all imports
- JSDoc comments on public functions
- async/await for all async operations
- Emoji prefixes in CLI output for visual clarity

### File Locations
- Copilot VS Code: `~/.config/Code/User/globalStorage/github.copilot-chat/`
- Copilot CLI: `~/.copilot/session-state/<uuid>/workspace.yaml`
- Context file: `./context.md` in project root

### MCP Protocol
- Use stdio transport for VS Code integration
- Tools for actions, Resources for data, Prompts for templates
- URI scheme: `context://` for this project

## Multi-Agent Architecture

This project uses the workspace-level agents defined in `localdev/.github/agents/`:

- **Orchestrator** - Coordinates all agents
- **Architect** - Design decisions (subagent)
- **Implementer** - Code implementation (subagent)
- **Tester** - Testing and validation (subagent)
- **Docs** - Documentation (subagent)
- **FleetOps** - Star Force deployment
- **ContextSync** - Cross-session context
- **Constellation** - COMMS integration

## Star Force Constellation

This project integrates with the ai-lab-constellation:

| Station | Hostname | Role |
|---------|----------|------|
| sf1 | star-force-one.local | Bridge - Strategic |
| sf3 | 192.168.4.5 | Engineering - Backend |

COMMS API: `http://star-force-one.local:5052`

## Phase Status

- ✅ Phase 1: shared-context.js CLI
- ✅ Phase 2: copilot-menu.js browser
- ✅ Phase 3: MCP Server (6 tools, 3 resources, 2 prompts)
- 🔄 Phase 4: Polish, testing, Agent Skills (in progress)
- ⏳ Phase 5: COMMS Integration
- ⏳ Phase 6: Star Force Deployment
