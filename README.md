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

### Phase 1 & 2: CLI Tools

#### Phase 1: Shared Context File

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

#### Integration with Copilot CLI

In the standalone Copilot CLI (`copilot` command):

```
# Start a session referencing previous context
You: Read context.md and continue from where we left off

# At session end, summarize
You: Summarize this session and append it to context.md
```

#### Integration with VS Code Copilot

In VS Code Copilot Chat:
- Use `@workspace` to include workspace context
- Explicitly reference `context.md` for historical context
- Prompt: "Read context.md first, then help me with..."

### Phase 3: MCP Server

The MCP (Model Context Protocol) server enables AI agents to access SharedCopilotContext features programmatically.

#### Starting the MCP Server

```bash
# Start the server (stdio transport)
node src/mcp-server.js

# or with npm script:
npm run mcp
```

The server communicates via stdio (standard input/output) using JSON-RPC protocol.

#### Configuration

##### VS Code Setup

Add to your workspace or user `settings.json`:

```json
{
  "mcp.servers": {
    "shared-copilot-context": {
      "command": "node",
      "args": [
        "/absolute/path/to/SharedCopilotContext/src/mcp-server.js"
      ],
      "env": {
        "WORKSPACE": "${workspaceFolder}"
      }
    }
  }
}
```

**Steps:**
1. Open VS Code settings (Cmd+, or Ctrl+,)
2. Search for "MCP Servers"
3. Edit `settings.json` and add the above configuration
4. Replace `/absolute/path/to/SharedCopilotContext` with your actual path
5. Reload VS Code

##### Copilot CLI Setup

Add to `~/.copilot/mcp.json`:

```json
{
  "mcpServers": {
    "shared-copilot-context": {
      "command": "node",
      "args": [
        "/absolute/path/to/SharedCopilotContext/src/mcp-server.js"
      ],
      "env": {
        "WORKSPACE": "${PWD}"
      }
    }
  }
}
```

**Steps:**
1. Create `~/.copilot/` directory if it doesn't exist: `mkdir -p ~/.copilot`
2. Create or edit `mcp.json` file
3. Add the above configuration
4. Replace `/absolute/path/to/SharedCopilotContext` with your actual path
5. Start Copilot CLI: `copilot`

**Verification:**
```bash
copilot
# In the session:
/tools list
# Should show: read_context, append_context, init_context, export_conversation, search_conversations, get_context_summary
```

#### Available Capabilities

##### Tools (6)

| Tool | Description | Parameters |
|------|-------------|------------|
| `read_context` | Read context.md from workspace | `workspace` (optional) |
| `append_context` | Append timestamped entry to context.md | `content` (required), `title`, `workspace` |
| `init_context` | Create new context.md with template | `workspace`, `projectName`, `projectDescription` |
| `get_context_summary` | Get statistics about context.md | `workspace` |
| `export_conversation` | Export VS Code chat session to context | `sessionId` (required), `workspace`, `format` |
| `search_conversations` | Search VS Code chat history | `query` (required), `limit`, `dateFrom`, `dateTo` |

##### Resources (3)

| Resource | MIME Type | Description |
|----------|-----------|-------------|
| `context://current` | `text/markdown` | Current workspace's context.md content |
| `context://sessions` | `application/json` | List of all VS Code Copilot chat sessions |
| `context://sessions/{id}` | `application/json` | Full content of a specific chat session |

##### Prompts (2)

| Prompt | Description | Arguments |
|--------|-------------|-----------|
| `read_and_continue` | Read context and continue previous work | `workspace` (optional) |
| `summarize_and_save` | Generate session summary and append to context | `message_count` (required), `workspace` |

#### Usage Examples

##### Using Tools in VS Code

```
You: Use the read_context tool to show me the current context

[Agent uses MCP tool read_context, displays content]

You: Append a summary of what we've done today
```

##### Using Resources

Resources are automatically available to agents when configured. The agent can read `context://current` to access your context.md file without explicitly calling a tool.

##### Using Prompts

Prompts provide pre-configured workflows:

```
You: Use the read_and_continue prompt

[Agent reads context and asks how to help]

You: We worked on X, Y, Z. Use summarize_and_save with message_count=25
```

#### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------||
| `WORKSPACE` | Workspace root path for context.md | `process.cwd()` |
| `LOG_LEVEL` | Logging verbosity (error, warn, info, debug) | `info` |

#### Troubleshooting

**Server won't start:**
- Check Node.js version (18+ required): `node --version`
- Verify file path is absolute
- Check logs in stderr

**Tools not appearing:**
- Verify MCP configuration syntax (valid JSON)
- Restart VS Code or Copilot CLI
- Check server logs for errors

**Context.md not found:**
- Ensure WORKSPACE env variable is set correctly
- Run `init_context` tool to create context.md
- Verify file permissions

See [docs/MCP_SERVER_DESIGN.md](docs/MCP_SERVER_DESIGN.md) for complete API specification.

## Project Structure

```
SharedCopilotContext/
├── README.md                    # This file
├── package.json                 # Dependencies and scripts
├── context.md                   # Shared context file (generated)
├── src/
│   ├── shared-context.js        # Phase 1: Context file manager
│   ├── copilot-menu.js          # Phase 2: History browser
│   ├── mcp-server.js            # Phase 3: MCP server entry point
│   ├── mcp/
│   │   ├── manager.js           # Context management business logic
│   │   ├── tools.js             # MCP tool implementations
│   │   ├── resources.js         # MCP resource handlers
│   │   └── prompts.js           # MCP prompt templates
│   └── utils/
│       ├── paths.js             # Cross-platform path utilities
│       └── parser.js            # Chat session JSON parser
├── tests/
│   ├── mcp-server.test.js       # Comprehensive test suite (39 tests)
│   └── fixtures/                # Test data
├── templates/
│   └── instructions.md          # Agent guidance template
├── config/
│   └── platforms.json           # Platform-specific configuration
├── docs/
│   └── MCP_SERVER_DESIGN.md     # Complete MCP server specification
└── .github/
    ├── agents/                  # Multi-agent definitions
    │   ├── orchestrator.agent.md
    │   ├── architect.agent.md
    │   ├── implementer.agent.md
    │   ├── tester.agent.md
    │   └── docs.agent.md
    └── skills/                  # Reusable agent skills
        └── coordination/
            └── SKILL.md
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

## Testing

A comprehensive test suite validates all MCP server functionality:

```bash
# Run all tests
npm test

# Run with verbose output
node --test --test-reporter=spec tests/mcp-server.test.js
```

**Test Coverage:** 39/39 tests passing
- 6 ContextManager methods
- 6 MCP tools
- 3 MCP resources
- 2 MCP prompts
- Integration scenarios
- Error handling

Tests use Node.js built-in test runner (no external dependencies).

## Roadmap

- [x] **Phase 1**: Shared text file system (`context.md`)
- [x] **Phase 2**: Terminal menu with ASCII art
- [x] **Phase 3**: MCP Server for cross-agent context sharing
  - [x] 3.1: Core server (2 tools, 1 resource)
  - [x] 3.2: Extended capabilities (6 tools, 3 resources)
  - [x] 3.3: Prompt templates
- [x] **Phase 4**: Polish, testing, Agent Skills (in progress)
  - [x] 4.1: Comprehensive test suite (39 tests)
  - [ ] 4.2: Documentation updates
  - [ ] 4.3: Agent Skill package
  - [ ] 4.4: Optional enhancements

> **Note**: Phase 3 originally planned WebSockets but pivoted to MCP after VS Code 1.109 introduced native MCP support. See [IMPLEMENTATION_NOTES.md](IMPLEMENTATION_NOTES.md) for details.

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
