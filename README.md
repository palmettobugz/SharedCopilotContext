# SharedCopilotContext

A multi-platform tool for sharing conversation history between GitHub Copilot in VS Code and GitHub Copilot CLI.

## Overview

SharedCopilotContext enables seamless context sharing across AI coding sessions by:
- Maintaining a shared `context.md` file for conversation history and project context
- Parsing VS Code Copilot chat session files for a terminal-based history viewer
- (In Progress) MCP Server for cross-agent context sharing

## Installation

### Prerequisites
- Node.js 18.0.0 or higher
- GitHub Copilot CLI (`copilot` command)
- VS Code with GitHub Copilot extension

### Quick Start

```bash
# Clone or navigate to the project
cd SharedCopilotContext

# Install dependencies
npm install

# Make scripts executable (macOS/Linux)
chmod +x src/shared-context.js src/copilot-menu.js

# Link globally (optional)
npm link
```

## Usage

### Phase 1: Shared Context File

The `shared-context` CLI manages a `context.md` file in your workspace:

```bash
# Initialize context.md in current directory
node src/shared-context.js init

# or if globally linked:
shared-context init

# Read context for review
shared-context read

# Append a session summary
shared-context append "Implemented user authentication. Modified auth.js and login.vue"

# Show context statistics
shared-context summary

# Output raw content (for piping)
shared-context read --raw | pbcopy  # macOS
```

### Phase 2: Conversation History Browser

Browse and export your VS Code Copilot conversation history:

```bash
# Launch the interactive menu
node src/copilot-menu.js

# or if globally linked:
copilot-menu
```

Features:
- ASCII art interface with paginated conversation list
- View full conversations with formatted output
- Export conversations to `context.md`

### Integration with Copilot CLI

In the standalone Copilot CLI (`copilot` command):

```
# Start a session referencing previous context
You: Read context.md and continue from where we left off

# At session end, summarize
You: Summarize this session and append it to context.md
```

### Integration with VS Code Copilot

In VS Code Copilot Chat:
- Use `@workspace` to include workspace context
- Explicitly reference `context.md` for historical context
- Prompt: "Read context.md first, then help me with..."

## Project Structure

```
SharedCopilotContext/
├── README.md                    # This file
├── package.json                 # Dependencies and scripts
├── src/
│   ├── shared-context.js        # Phase 1: Context file manager
│   ├── copilot-menu.js          # Phase 2: History browser
│   ├── mcp-server.js            # Phase 3: MCP Server (in progress)
│   └── utils/
│       ├── paths.js             # Cross-platform path utilities
│       └── parser.js            # Chat session JSON parser
├── templates/
│   └── instructions.md          # Agent guidance template
├── config/
│   └── platforms.json           # Platform-specific configuration
├── tests/
│   └── mock-data/               # Test fixtures
└── public/                      # Web dashboard (Phase 3)
```

## Platform Support

| Platform | Status | Notes |
|----------|--------|-------|
| macOS    | ✅ Full | Primary development platform |
| Windows  | ✅ Full | PowerShell recommended |
| Linux    | ✅ Full | Tested on Ubuntu |

### Path Resolution

The tools automatically detect your platform and resolve paths:

- **macOS**: `~/Library/Application Support/Code/User/workspaceStorage`
- **Windows**: `%APPDATA%\Code\User\workspaceStorage`
- **Linux**: `~/.config/Code/User/workspaceStorage`

## How It Works

### Context Sharing Flow

1. **Session Start**: AI agent reads `context.md` for prior context
2. **During Session**: Agent uses historical context for consistency
3. **Session End**: Agent appends summary to `context.md`

### Chat Session Parsing

VS Code stores Copilot conversations as JSON files:

```
~/Library/Application Support/Code/User/
└── workspaceStorage/
    └── <workspace-hash>/
        └── chatSessions/
            └── <session-id>.json
```

The `copilot-menu` tool parses these files to extract:
- User messages
- Copilot responses
- Tool invocations
- Timestamps

## Roadmap

- [x] **Phase 1**: Shared text file system (`context.md`)
- [x] **Phase 2**: Terminal menu with ASCII art
- [ ] **Phase 3**: MCP Server for cross-agent context sharing (design complete)
- [ ] **Phase 4**: Polish, testing, Agent Skills integration

> **Note**: Phase 3 was originally planned as WebSockets but pivoted to MCP after VS Code 1.109 introduced native MCP support. See [docs/MCP_SERVER_DESIGN.md](docs/MCP_SERVER_DESIGN.md) for the full specification.

## Multi-Agent Workflow

This project uses a coordinated multi-agent setup for development:

| Agent | Role |
|-------|------|
| `@Orchestrator` | Coordinates work, delegates to subagents |
| `@Architect` | Design decisions, API specs |
| `@Implementer` | Writes code, fixes bugs |
| `@Tester` | Validation and tests |
| `@Docs` | Documentation maintenance |

Agents are defined in `.github/agents/` and use Claude models exclusively.

## Contributing

Contributions welcome! Please open an issue or PR.

## License

MIT License
