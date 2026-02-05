# Copilot Bridge Agent Design

> Enables @copilot mentions in COMMS to query VS Code Copilot conversation history

## Overview

The Copilot Bridge Agent connects the COMMS Console to SharedCopilotContext's MCP tools, allowing users to query their Copilot conversation history directly from the Star Force chat interface.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  COMMS Console  │────▶│ Copilot Bridge   │────▶│  MCP Tools      │
│  (sf1:5052)     │◀────│  Agent           │◀────│  (tools.js)     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                       │                        │
        │  @copilot recent      │  handleTool()          │
        │  @copilot search X    │  formatResponse()      │
        │  @copilot context     │                        │
        ▼                       ▼                        ▼
   User sees response    Polls every 2s         list_sessions
   in chat              Parses commands          search_context
                        Sends formatted          read_context
                        results back             export_conversation
```

## Pattern Reference

Based on existing Star Force agent architecture:

| Component | Artoo/Astra | Copilot Bridge |
|-----------|-------------|----------------|
| **Trigger** | `@artoo`, `@astra`, `@all` | `@copilot` |
| **LLM Required** | Ollama/xAI | None (deterministic) |
| **Actions** | Tools, GitHub issues | MCP tools |
| **Response** | AI-generated text | Formatted session data |
| **Runtime** | Python | Node.js (ES Modules) |

## Supported Commands

| Command | Description | MCP Tool |
|---------|-------------|----------|
| `@copilot recent` | Last 30 chat sessions | list_sessions |
| `@copilot recent 10` | Last N sessions | list_sessions |
| `@copilot search <query>` | Search sessions by keyword | search_context |
| `@copilot context` | Current context.md content | read_context |
| `@copilot export <id>` | Export specific session | export_conversation |
| `@copilot status` | Bridge health check | N/A |
| `@copilot help` | List available commands | N/A |

## Implementation

### File Structure

```
src/bridge/
├── copilot-responder.js   # Main responder (polls COMMS, responds)
├── command-parser.js      # Parse @copilot commands
└── response-formatter.js  # Format MCP results for chat
```

### Core Components

#### 1. CopilotResponder (copilot-responder.js)

```javascript
class CopilotResponder {
  constructor(commsUrl, agentId = 'copilot-bridge') { }
  
  async start() { }           // Begin polling
  async stop() { }            // Stop gracefully
  async pollMessages() { }    // Fetch new messages
  shouldRespond(message) { }  // Check for @copilot
  async processMessage(msg) { } // Parse, execute, respond
  async sendResponse(text) { } // Post to COMMS
}
```

#### 2. CommandParser (command-parser.js)

```javascript
const COMMAND_PATTERNS = [
  { pattern: /recent(?:\s+(\d+))?/i, command: 'list_sessions' },
  { pattern: /search\s+(.+)/i, command: 'search_context' },
  { pattern: /context/i, command: 'read_context' },
  { pattern: /export\s+(.+)/i, command: 'export_conversation' },
  { pattern: /status/i, command: 'status' },
  { pattern: /help/i, command: 'help' },
];

function parseCommand(content) { }
```

#### 3. ResponseFormatter (response-formatter.js)

```javascript
function formatSessionList(sessions, limit) { }
function formatSearchResults(results) { }
function formatContext(content) { }
function formatHelp() { }
```

### Message Flow

1. **Poll**: Fetch recent messages from COMMS every 2 seconds
2. **Filter**: Check each message for `@copilot` mention
3. **Dedupe**: Track seen message IDs to avoid double-processing
4. **Parse**: Extract command and arguments
5. **Execute**: Call corresponding MCP tool handler
6. **Format**: Convert result to chat-friendly format
7. **Send**: POST response back to COMMS

### COMMS API Integration

```javascript
// Fetch messages
GET http://star-force-one.local:5052/api/messages?limit=20

// Send response
POST http://star-force-one.local:5052/api/send
{
  "sender_id": "copilot-bridge",
  "sender_name": "🌐 Copilot (SharedContext)",
  "sender_type": "agent",
  "content": "...",
  "message_type": "response"
}
```

### Configuration

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `COMMS_URL` | `http://star-force-one.local:5052` | COMMS API base URL |
| `POLL_INTERVAL` | `2000` | Polling interval in ms |
| `MAX_SESSIONS` | `30` | Default session limit |

## Usage

### Start the Bridge

```bash
# Direct
node src/bridge/copilot-responder.js

# Via npm script
npm run bridge

# With custom COMMS URL
COMMS_URL=http://192.168.4.3:5052 node src/bridge/copilot-responder.js
```

### Example Interactions

```
starfool: @copilot recent 5
copilot:  📋 Last 5 Chat Sessions
          1. SharedCopilotContext MCP Setup (2026-02-05, 47 msgs)
          2. Agent Architecture Review (2026-02-05, 23 msgs)
          3. COMMS Integration (2026-02-04, 156 msgs)
          4. Phase 3 Testing (2026-02-04, 89 msgs)
          5. Terminal Menu Polish (2026-02-04, 34 msgs)

starfool: @copilot search MCP server
copilot:  🔍 Found 3 sessions matching "MCP server":
          1. SharedCopilotContext MCP Setup (2026-02-05)
          2. COMMS Integration (2026-02-04)
          3. Phase 3 Testing (2026-02-04)

starfool: @copilot status
copilot:  ✅ Copilot Bridge Status
          Agent ID: copilot-bridge
          COMMS: Connected (star-force-one.local:5052)
          MCP Server: Available
          Sessions indexed: 47
```

## Deployment

### Local Development

```bash
cd SharedCopilotContext
npm run bridge
```

### Star Force Deployment (Phase 6)

Deploy as systemd service on sf1 or sf3:

```ini
[Unit]
Description=Copilot Bridge Agent
After=network.target

[Service]
Type=simple
User=starfool
WorkingDirectory=/home/starfool/SharedCopilotContext
ExecStart=/usr/bin/node src/bridge/copilot-responder.js
Restart=always
Environment=COMMS_URL=http://localhost:5052

[Install]
WantedBy=multi-user.target
```

## Implementation Checklist

- [ ] Create `src/bridge/` directory
- [ ] Implement `command-parser.js`
- [ ] Implement `response-formatter.js`
- [ ] Implement `copilot-responder.js`
- [ ] Add `npm run bridge` script
- [ ] Test with local COMMS
- [ ] Update context.md with Phase 5.5

## Related Files

- [comms.js](../src/mcp/comms.js) - COMMS API client (sendMessage, getMessages)
- [tools.js](../src/mcp/tools.js) - MCP tool implementations
- [resources.js](../src/mcp/resources.js) - MCP resource handlers
- [agent_responder.py](../../ai-lab-constellation/agents/intercom/agent_responder.py) - Reference implementation (Artoo/Astra)
