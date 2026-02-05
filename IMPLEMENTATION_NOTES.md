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
- **Session Resume**: Sessions persist with UUID, resumable via `copilot --resume=<session-id>`
  - Example: `copilot --resume=0cffe71b-515d-4fed-afe5-827931cd74e0`
  - Future enhancement: Track session IDs in context.md, provide `get_resume_command` tool

### Copilot CLI Session Storage (Discovered 2026-02-05)

**Location:** `~/.copilot/`

| Path | Purpose |
|------|---------|
| `~/.copilot/config.json` | CLI preferences (banner, markdown rendering, terminal setup) |
| `~/.copilot/command-history-state.json` | Recent prompts (array of last ~10 commands) |
| `~/.copilot/session-state/<uuid>/` | Individual session directories |
| `~/.copilot/logs/` | Debug logs |
| `~/.copilot/pkg/` | Package data |

**Session Directory Structure:**
```
~/.copilot/session-state/<session-id>/
├── workspace.yaml     # Metadata: id, cwd, git_root, repository, branch, timestamps
├── checkpoints/       # Conversation history
│   └── index.md       # Checkpoint manifest (table of titled checkpoints)
└── files/             # Modified files during session (if any)
```

**workspace.yaml Example:**
```yaml
id: 1d44caae-6d97-4e1b-bc6a-54ba9886b0de
cwd: /Users/merlin/Workspace/localdev/SharedCopilotContext
summary_count: 0
created_at: 2026-02-05T01:11:09.387Z
updated_at: 2026-02-05T01:11:09.414Z
git_root: /Users/merlin/Workspace/localdev/SharedCopilotContext
repository: palmettobugz/SharedCopilotContext
branch: main
```

**Integration Opportunities:**
- `get_cli_sessions` resource: Parse `~/.copilot/session-state/*/workspace.yaml` for all sessions
- `get_resume_command` tool: Return `copilot --resume=<id>` for specific workspace
- Link CLI sessions to VS Code sessions via workspace path/git repo matching

**Multi-Machine Note:**  
The AI Lab Constellation (see `ai-lab-constellation/docs/HARDWARE_INVENTORY.md`) has nodes:
- 🚀 **star-force-one** (sf1): 192.168.4.3 - Production server
- 🌉 **star-force-two** (sf2): 192.168.4.4 - Desktop/Bridge (Copilot CLI installed here)
- 🛸 **star-force-three** (sf3): 192.168.4.5 - Agent sandbox

SSH alias `sf2` connects to star-force-two. CLI session data on remote machines would be at `~/.copilot/session-state/` on each host.

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

## VS Code 1.109 Feature Analysis (February 4, 2026)

Following the release of VS Code 1.109 (January 2026), a comprehensive analysis was conducted to compare the SharedCopilotContext design with new native VS Code capabilities.

### Native Features That Overlap With Our Design

| Our Feature | VS Code 1.109 Native Feature | Impact |
|-------------|------------------------------|--------|
| `context.md` for memory | **Copilot Memory (Preview)** - Server-side memory via `github.copilot.chat.copilotMemory.enabled` | Major overlap |
| Agent instructions file | **`/init` command** + `copilot-instructions.md` + `AGENTS.md` | Built-in |
| Cross-session context | **Agent Sessions View** + Welcome Page | Native UI |
| Conversation history browser | **Agent Sessions view** with filters, multi-select | Replaced |

### Key VS Code 1.109 Features Relevant to Context Sharing

1. **Copilot Memory (Preview)**
   - Setting: `github.copilot.chat.copilotMemory.enabled`
   - Stores and recalls information across sessions
   - Memory tool recognizes when to store/retrieve context
   - Managed via GitHub's Copilot settings

2. **Agent Skills (GA)**
   - Locations: `.github/skills/`, `.claude/skills/`, `~/.copilot/skills/`
   - Package domain expertise into reusable workflows
   - Setting: `chat.agentSkillsLocations`

3. **Custom Agents**
   - File: `.agent.md` with frontmatter configuration
   - Location: `.github/agents/` (configurable via `chat.agentFilesLocations`)
   - Supports subagent orchestration, model selection

4. **`/init` Command**
   - Auto-generates workspace instructions from codebase analysis
   - Creates/updates `copilot-instructions.md` or `AGENTS.md`

5. **Organization-wide Instructions**
   - Setting: `github.copilot.chat.organizationInstructions.enabled`
   - Team-wide consistent AI guidance

6. **MCP Apps**
   - Rich interactive UI in chat responses
   - Server-side visualizations

7. **Agent Session Management**
   - Session type picker (local, background, cloud, Claude Agent)
   - Agent status indicator in command center
   - Subagents with parallel execution
   - Search subagent for isolated codebase searches

8. **Context Editing (Experimental)**
   - Setting: `github.copilot.chat.anthropic.contextEditing.enabled`
   - Clears tool results/thinking tokens from previous turns
   - Helps manage longer conversations

### Features That Remain Unique to SharedCopilotContext

| Feature | Value Proposition |
|---------|-------------------|
| **Export to Markdown** | VS Code doesn't export conversations to text files |
| **CLI-based context management** | Automation, scripting, CI/CD integration |
| **Cross-tool sharing** | Bridges VS Code ↔ Copilot CLI ↔ other tools |
| **Local-first approach** | No cloud dependency, works offline |
| **ASCII terminal interface** | Terminal-native experience |

### Recommended Design Amendments

#### Phase 3 Pivot: From WebSockets to MCP Server

Instead of building a WebSockets server, pivot to creating an **MCP (Model Context Protocol) server** that:
- Integrates with VS Code's native MCP support
- Provides context as a tool for any MCP-compatible agent
- Enables cross-agent context sharing

#### New Features to Add

1. **Copilot Memory Bridge**
   - Export Copilot Memory to local markdown
   - Import local context.md to Copilot Memory
   - Sync between local files and cloud memory

2. **Agent Skill Package**
   - Create a `SKILL.md` for context management
   - Package as reusable skill for `.github/skills/`

3. **Custom Agent Integration**
   - Create `.agent.md` that uses our context tools
   - Enable as subagent for orchestration flows

4. **Export Capabilities**
   - Export Agent Sessions to markdown archives
   - Create searchable conversation index
   - Generate project documentation from sessions

5. **CLI Enhancements**
   - `shared-context memory-export` - Export Copilot Memory
   - `shared-context init-agent` - Create .agent.md template
   - `shared-context init-skill` - Create SKILL.md template

#### Updated Project Structure

```
SharedCopilotContext/
├── src/
│   ├── shared-context.js        # Phase 1: Context file manager
│   ├── copilot-menu.js          # Phase 2: History browser
│   ├── mcp-server.js            # Phase 3 (Pivoted): MCP server
│   └── utils/
├── .github/
│   ├── agents/
│   │   └── context-manager.agent.md
│   └── skills/
│       └── context-sharing/
│           └── SKILL.md
├── templates/
│   ├── instructions.md
│   ├── agent.md.template
│   └── skill.md.template
└── ...
```

### Compatibility Matrix

| Component | VS Code 1.109 | Copilot CLI | Other Tools |
|-----------|---------------|-------------|-------------|
| context.md | ✅ Read via @workspace | ✅ Direct read | ✅ File-based |
| Copilot Memory | ✅ Native | ❓ Unknown | ❌ VS Code only |
| Agent Skills | ✅ Native | ❌ Not supported | ❌ VS Code only |
| MCP Server | ✅ Native | ✅ Supported | ✅ Standard protocol |
| Our CLI tools | ✅ Via terminal | ✅ Direct | ✅ Cross-platform |

### Conclusion

VS Code 1.109 introduces powerful native features for context sharing and agent customization. SharedCopilotContext should pivot from competing with these features to **complementing** them by:

1. Providing **export/import** capabilities VS Code lacks
2. Enabling **cross-tool interoperability** via MCP
3. Offering **CLI automation** for DevOps workflows
4. Supporting **offline/local-first** use cases
5. Creating **reusable Agent Skills** for the VS Code ecosystem

---

*Analysis by GitHub Copilot (Claude Opus 4.5) - February 4, 2026*

---

## Phase 5: COMMS Integration ⏳

**Goal:** Bridge SharedCopilotContext MCP server with AI Lab Constellation COMMS chat system.

### Overview

COMMS is the chat hub for the Star Force constellation agents (Artoo/Astra on sf1/sf3). Integration enables:
- VS Code Copilot reading COMMS chat history
- MCP tools posting to COMMS broadcasts
- Unified context across human Copilot sessions and agent conversations

### COMMS API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `http://sf1:5052/api/messages` | GET | Retrieve chat history |
| `http://sf1:5052/api/send` | POST | Post message to chat |
| `http://sf1:5052/api/online` | GET | List online agents |

See `ai-lab-constellation/docs/COMMS_CHEAT_SHEET.md` for full API details.

### Integration Points

**5.1 MCP Resource: `context://comms`**
```javascript
// src/mcp/comms.js
{
  uri: 'context://comms/recent',
  name: 'Recent COMMS Messages',
  mimeType: 'application/json',
  description: 'Last N messages from COMMS chat'
}
```

**5.2 MCP Tool: `comms_broadcast`**
```javascript
{
  name: 'comms_broadcast',
  description: 'Post a message to COMMS chat',
  inputSchema: {
    properties: {
      content: { type: 'string', description: 'Message content' },
      sender_name: { type: 'string', default: 'Copilot' }
    },
    required: ['content']
  }
}
```

**5.3 Context Sync**
Auto-append COMMS workflow completions to context.md:
- 7-step site creation workflows
- Agent task completions
- Important broadcasts

### Success Criteria
- [ ] VS Code Copilot can read COMMS history via MCP
- [ ] Can post to COMMS from VS Code Copilot
- [ ] COMMS workflow summaries appear in context.md

---

## Phase 6: Star Force Deployment ⏳

**Goal:** Deploy SharedCopilotContext to sf1/sf2/sf3 for fleet-wide context sharing.

### Target Configuration

| Machine | Role | Copilot CLI | MCP Server | Context Sync |
|---------|------|-------------|------------|--------------|
| MacBook | Dev Hub | ✅ | ✅ Local | Git push |
| sf1 (Bridge) | COMMS Hub | ✅ | ✅ + COMMS | Authoritative |
| sf2 (Bridge) | Desktop | ✅ | ✅ Local | Git sync |
| sf3 (Engineering) | Agent Host | ✅ | ✅ Local | Git sync |

### Deployment Steps

**6.1 Clone Repository**
```bash
# On each star-force machine via SSH
ssh sf1 "cd ~ && git clone https://github.com/palmettobugz/SharedCopilotContext.git"
ssh sf3 "cd ~ && git clone https://github.com/palmettobugz/SharedCopilotContext.git"
```

**6.2 Install Dependencies**
```bash
ssh sf1 "cd ~/SharedCopilotContext && npm install"
ssh sf3 "cd ~/SharedCopilotContext && npm install"
```

**6.3 Initialize Context**
```bash
ssh sf1 "cd ~/SharedCopilotContext && node src/shared-context.js init"
ssh sf3 "cd ~/SharedCopilotContext && node src/shared-context.js init"
```

**6.4 Configure Copilot CLI MCP**
Create `~/.copilot/mcp.json` on each machine:
```json
{
  "servers": {
    "shared-context": {
      "command": "node",
      "args": ["/home/starfool/SharedCopilotContext/src/mcp-server.js"],
      "env": {
        "WORKSPACE": "/home/starfool/SharedCopilotContext"
      }
    }
  }
}
```

**6.5 Context Sync Cron (Optional)**
```bash
# Cron job to sync context.md via git
*/15 * * * * cd ~/SharedCopilotContext && git pull && git add context.md && git commit -m "sync: $(hostname) $(date +%H:%M)" && git push
```

### Federation Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                 SharedCopilotContext Federation                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  MacBook (Dev)     sf1 (Bridge)        sf3 (Engineering)        │
│  ┌────────────┐    ┌─────────────┐     ┌─────────────┐          │
│  │ VS Code    │    │ COMMS Hub   │     │ Artoo-sf3   │          │
│  │ MCP Server │    │ MCP Server  │     │ Astra-sf3   │          │
│  │ context.md │    │ context.md  │     │ MCP Server  │          │
│  └─────┬──────┘    │ + COMMS API │     │ context.md  │          │
│        │           └──────┬──────┘     └──────┬──────┘          │
│        │                  │                   │                  │
│        └────────┬─────────┴─────────┬─────────┘                  │
│                 │                   │                            │
│                 ▼                   ▼                            │
│        ┌────────────────────────────────────┐                   │
│        │     GitHub Repository (sync)       │                   │
│        │  palmettobugz/SharedCopilotContext │                   │
│        └────────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────────┘
```

### Success Criteria
- [ ] SharedCopilotContext running on sf1 and sf3
- [ ] Copilot CLI on star-force machines can use MCP tools
- [ ] Context.md syncs across machines via git
- [ ] COMMS integration functional on sf1

---

## Updated Phase Summary

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Shared text file system (`context.md`) | ✅ Complete |
| 2 | Terminal menu with ASCII art | ✅ Complete |
| 3 | MCP Server (6 tools, 3 resources, 2 prompts) | ✅ Complete |
| 4 | Polish, testing, Agent Skills | 🔄 In Progress |
| 5 | COMMS Integration (MCP ↔ COMMS bridge) | ⏳ Planned |
| 6 | Star Force Deployment (sf1/sf2/sf3) | ⏳ Planned |
