# MCP Server Design Specification for SharedCopilotContext

**Version:** 1.0  
**Date:** February 4, 2026  
**Designed by:** Architect Agent  
**Status:** Design Phase

---

## 1. Executive Summary

This specification defines an MCP (Model Context Protocol) server that enables AI agents to access SharedCopilotContext features as structured tools and resources. The server will:

- Expose `context.md` as a readable/writable resource
- Provide VS Code Copilot chat history as searchable resources
- Offer tools for context management and conversation export
- Integrate with VS Code 1.109+ and Copilot CLI via MCP protocol

### Use Cases

1. **Cross-agent context sharing** - Multiple AI agents can read/write shared context
2. **Conversation export** - Export VS Code chat sessions to context.md programmatically
3. **Context search** - Query conversation history for relevant prior discussions
4. **Automated workflows** - CI/CD pipelines can manage context files

---

## 2. MCP Server API Specification

### 2.1 Resources

Resources are data sources exposed by the MCP server. They represent readable (and sometimes writable) content.

#### Resource 1: Current Context File

**URI:** `context://current`

**MIME Type:** `text/markdown`

**Description:** The current workspace's `context.md` file content.

**Schema:**
```json
{
  "uri": "context://current",
  "name": "Current Context",
  "mimeType": "text/markdown",
  "content": "<markdown content>"
}
```

**Operations:** Read, Append

**Implementation Notes:**
- Use `getContextFilePath(workspaceRoot)` from `paths.js`
- Check if file exists; if not, return empty resource with initialization instructions
- Monitor file for changes using `chokidar` and emit updates

---

#### Resource 2: Chat Session List

**URI:** `context://sessions`

**MIME Type:** `application/json`

**Description:** Metadata about all available VS Code Copilot chat sessions.

**Schema:**
```json
{
  "uri": "context://sessions",
  "name": "Chat Sessions",
  "mimeType": "application/json",
  "content": {
    "sessions": [
      {
        "id": "session-hash",
        "title": "First user message...",
        "date": "2026-02-04",
        "messageCount": 12,
        "filePath": "/path/to/session.json"
      }
    ]
  }
}
```

**Operations:** Read, List

**Implementation Notes:**
- Use `getChatSessionsGlobPattern()` from `paths.js`
- Parse all JSON files with `parseChatSession()` from `parser.js`
- Cache results and refresh on file system changes

---

#### Resource 3: Individual Chat Session

**URI:** `context://sessions/{sessionId}`

**MIME Type:** `application/json`

**Description:** Full content of a specific chat session.

**Schema:**
```json
{
  "uri": "context://sessions/{sessionId}",
  "name": "Session: {title}",
  "mimeType": "application/json",
  "content": {
    "id": "session-hash",
    "title": "Generated title",
    "date": "2026-02-04",
    "requests": [
      {
        "userMessage": "User prompt",
        "response": "Copilot response"
      }
    ]
  }
}
```

**Operations:** Read

**Implementation Notes:**
- Parse session with `parseChatSession(filePath)`
- Generate session ID from file hash or path
- Convert to markdown format on request

---

### 2.2 Tools

Tools are actions that agents can invoke. They accept parameters and return results.

#### Tool 1: Read Context

**Name:** `read_context`

**Description:** Read the current workspace's `context.md` file.

**Parameters:**
```json
{
  "type": "object",
  "properties": {
    "workspace": {
      "type": "string",
      "description": "Optional workspace root path. Defaults to CWD."
    },
    "format": {
      "type": "string",
      "enum": ["markdown", "plain"],
      "default": "markdown",
      "description": "Output format"
    }
  }
}
```

**Returns:**
```json
{
  "content": "<context.md content>",
  "metadata": {
    "path": "/path/to/context.md",
    "size": 1024,
    "lastModified": "2026-02-04T20:00:00Z",
    "sessionCount": 5
  }
}
```

**Error Cases:**
- `FILE_NOT_FOUND` - context.md doesn't exist
- `READ_ERROR` - Permission denied or I/O error

---

#### Tool 2: Append to Context

**Name:** `append_context`

**Description:** Append a new entry to the context.md file with timestamp.

**Parameters:**
```json
{
  "type": "object",
  "properties": {
    "content": {
      "type": "string",
      "description": "Content to append"
    },
    "workspace": {
      "type": "string",
      "description": "Optional workspace root path"
    },
    "title": {
      "type": "string",
      "description": "Optional session title (defaults to timestamp)"
    }
  },
  "required": ["content"]
}
```

**Returns:**
```json
{
  "success": true,
  "timestamp": "2026-02-04 20:00",
  "path": "/path/to/context.md"
}
```

**Error Cases:**
- `FILE_NOT_FOUND` - context.md doesn't exist (suggest init first)
- `WRITE_ERROR` - Permission denied or I/O error

---

#### Tool 3: Initialize Context File

**Name:** `init_context`

**Description:** Create a new context.md file with template.

**Parameters:**
```json
{
  "type": "object",
  "properties": {
    "workspace": {
      "type": "string",
      "description": "Optional workspace root path"
    },
    "projectName": {
      "type": "string",
      "description": "Optional project name for template"
    },
    "projectDescription": {
      "type": "string",
      "description": "Optional project description"
    }
  }
}
```

**Returns:**
```json
{
  "success": true,
  "path": "/path/to/context.md",
  "template": "standard"
}
```

**Error Cases:**
- `FILE_EXISTS` - context.md already exists
- `WRITE_ERROR` - Permission denied or I/O error

---

#### Tool 4: Export Conversation to Context

**Name:** `export_conversation`

**Description:** Export a VS Code chat session to context.md.

**Parameters:**
```json
{
  "type": "object",
  "properties": {
    "sessionId": {
      "type": "string",
      "description": "Chat session ID or file path"
    },
    "workspace": {
      "type": "string",
      "description": "Optional workspace root path"
    },
    "format": {
      "type": "string",
      "enum": ["full", "summary"],
      "default": "summary",
      "description": "Export full conversation or summary"
    }
  },
  "required": ["sessionId"]
}
```

**Returns:**
```json
{
  "success": true,
  "exported": {
    "title": "Conversation title",
    "messageCount": 12,
    "timestamp": "2026-02-04 20:00"
  }
}
```

**Error Cases:**
- `SESSION_NOT_FOUND` - Invalid session ID
- `CONTEXT_NOT_FOUND` - context.md doesn't exist
- `EXPORT_ERROR` - I/O error during export

---

#### Tool 5: Search Conversation History

**Name:** `search_conversations`

**Description:** Search VS Code Copilot chat history for keywords or phrases.

**Parameters:**
```json
{
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "description": "Search query (keywords or phrase)"
    },
    "limit": {
      "type": "integer",
      "default": 10,
      "description": "Maximum results to return"
    },
    "dateFrom": {
      "type": "string",
      "format": "date",
      "description": "Filter conversations after this date"
    },
    "dateTo": {
      "type": "string",
      "format": "date",
      "description": "Filter conversations before this date"
    }
  },
  "required": ["query"]
}
```

**Returns:**
```json
{
  "results": [
    {
      "sessionId": "session-hash",
      "title": "Conversation title",
      "date": "2026-02-04",
      "relevance": 0.85,
      "snippets": [
        {
          "text": "...matching text...",
          "type": "user" // or "assistant"
        }
      ]
    }
  ],
  "totalFound": 5
}
```

**Error Cases:**
- `INVALID_QUERY` - Empty or malformed query
- `NO_SESSIONS` - No chat sessions found

---

#### Tool 6: Get Context Summary

**Name:** `get_context_summary`

**Description:** Get statistics and metadata about the context file.

**Parameters:**
```json
{
  "type": "object",
  "properties": {
    "workspace": {
      "type": "string",
      "description": "Optional workspace root path"
    }
  }
}
```

**Returns:**
```json
{
  "path": "/path/to/context.md",
  "exists": true,
  "stats": {
    "size": 2048,
    "lines": 87,
    "words": 412,
    "sessions": 5
  },
  "lastModified": "2026-02-04T20:00:00Z",
  "recentSessions": [
    {
      "timestamp": "2026-02-04 20:00",
      "preview": "First 100 chars..."
    }
  ]
}
```

**Error Cases:**
- `FILE_NOT_FOUND` - context.md doesn't exist

---

### 2.3 Prompts

Prompts are pre-configured prompt templates with slot variables that agents can use.

#### Prompt 1: Read and Continue

**Name:** `read_and_continue`

**Description:** Instruct agent to read context and continue previous work.

**Template:**
```
Read the project context from context.md, understand the current state, and continue working on the task. Pay attention to:
- Recent sessions and decisions
- Open items and unfinished work
- Project conventions and patterns

Here's the context:

{{context}}

What would you like me to help with?
```

**Variables:**
- `context` (auto-filled from `context://current` resource)

---

#### Prompt 2: Summarize and Save

**Name:** `summarize_and_save`

**Description:** Generate a session summary and append to context.

**Template:**
```
Summarize the current conversation session and append it to context.md. Include:
- What was accomplished
- Any decisions made
- Files modified
- Next steps or open items

Current session has {{message_count}} messages.
```

**Variables:**
- `message_count` (provided by caller)
- `workspace` (optional)

---

## 3. Architecture Diagram (Text-Based)

```
┌─────────────────────────────────────────────────────────────────┐
│                         MCP Client Layer                         │
├──────────────────────────┬──────────────────────────────────────┤
│   VS Code Copilot        │     Copilot CLI                      │
│   (MCP settings)         │     (MCP config)                     │
└───────────┬──────────────┴────────────────┬─────────────────────┘
            │                               │
            │  MCP Protocol (stdio/SSE)     │
            │                               │
┌───────────▼───────────────────────────────▼─────────────────────┐
│                      MCP Server (mcp-server.js)                  │
├─────────────────────────────────────────────────────────────────┤
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────────┐  │
│  │   Resources    │  │     Tools      │  │    Prompts       │  │
│  │                │  │                │  │                  │  │
│  │ • context://   │  │ • read_context │  │ • read_and_      │  │
│  │   current      │  │ • append_      │  │   continue       │  │
│  │ • context://   │  │   context      │  │ • summarize_     │  │
│  │   sessions     │  │ • init_context │  │   and_save       │  │
│  │ • context://   │  │ • export_      │  │                  │  │
│  │   sessions/:id │  │   conversation │  │                  │  │
│  │                │  │ • search_      │  │                  │  │
│  │                │  │   conversations│  │                  │  │
│  │                │  │ • get_context_ │  │                  │  │
│  │                │  │   summary      │  │                  │  │
│  └────────┬───────┘  └───────┬────────┘  └──────────────────┘  │
│           │                  │                                  │
│           └──────────────────┼──────────────────────────────────┤
│                              │                                  │
│  ┌──────────────────────────▼──────────────────────────────┐   │
│  │              MCP Protocol Handler                        │   │
│  │  (stdio transport, JSON-RPC, resource/tool dispatch)    │   │
│  └──────────────────────────┬──────────────────────────────┘   │
└─────────────────────────────┼──────────────────────────────────┘
                              │
┌─────────────────────────────▼──────────────────────────────────┐
│                    Utility Layer (existing)                     │
├─────────────────────────────────────────────────────────────────┤
│  ┌────────────────────┐           ┌────────────────────────┐   │
│  │   paths.js         │           │   parser.js            │   │
│  │                    │           │                        │   │
│  │ • getContextFile   │           │ • parseChatSession     │   │
│  │   Path()           │           │ • generateTitle        │   │
│  │ • getChatSessions  │           │ • formatForExport      │   │
│  │   GlobPattern()    │           │ • summarize            │   │
│  │ • getVSCodeUser    │           │   Conversation         │   │
│  │   DataPath()       │           │                        │   │
│  └────────────────────┘           └────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────▼──────────────────────────────────┐
│                      File System Layer                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────┐    │
│  │ • context.md (workspace root)                          │    │
│  │ • VS Code chat sessions (workspaceStorage/*/           │    │
│  │   chatSessions/*.json)                                 │    │
│  │ • Watched for changes (chokidar)                       │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

#### Example: Read Context via MCP

```
1. User invokes @agent "Read context and help me"
2. Agent calls MCP tool: `read_context({})`
3. MCP server receives JSON-RPC request
4. Server calls getContextFilePath() from paths.js
5. Server reads file from filesystem
6. Server returns JSON-RPC response with content
7. Agent receives context and responds to user
```

#### Example: Export Conversation via MCP

```
1. User: "Export this conversation to context.md"
2. Agent calls MCP tool: `export_conversation({sessionId: "current"})`
3. MCP server locates session JSON via getChatSessionsGlobPattern()
4. Server parses session with parseChatSession()
5. Server formats with formatForExport()
6. Server appends to context.md
7. Server returns success confirmation
8. Agent confirms to user
```

---

## 4. File Structure

### 4.1 New Files to Create

```
src/
├── mcp-server.js              # Main MCP server entry point
└── mcp/
    ├── protocol.js            # MCP protocol handler (JSON-RPC, stdio)
    ├── resources.js           # Resource definitions and handlers
    ├── tools.js               # Tool implementations
    ├── prompts.js             # Prompt templates
    └── manager.js             # Context and session management logic
```

### 4.2 File Responsibilities

#### `src/mcp-server.js`
- Main entry point, CLI argument parsing
- Initialize MCP server with stdio transport
- Register resources, tools, prompts from submodules
- Handle graceful shutdown

**Exports:** None (executable)

**Dependencies:**
- `@modelcontextprotocol/sdk` (MCP SDK)
- `./mcp/protocol.js`
- `./mcp/resources.js`
- `./mcp/tools.js`
- `./mcp/prompts.js`

---

#### `src/mcp/protocol.js`
- Implement MCP protocol layer (JSON-RPC over stdio)
- Handle connection lifecycle
- Route requests to appropriate handlers
- Implement error handling and logging

**Exports:**
```javascript
export class MCPServer {
  constructor(options);
  registerResource(resource);
  registerTool(tool);
  registerPrompt(prompt);
  start();
  stop();
}
```

**Dependencies:**
- `@modelcontextprotocol/sdk`

---

#### `src/mcp/resources.js`
- Define resource schemas and URIs
- Implement resource read handlers
- Watch filesystem for changes
- Emit resource updates

**Exports:**
```javascript
export const resources = [
  {
    uri: 'context://current',
    name: 'Current Context',
    handler: async (uri) => { ... }
  },
  // ... more resources
];
```

**Dependencies:**
- `chokidar` (file watching)
- `../utils/paths.js`
- `../utils/parser.js`

---

#### `src/mcp/tools.js`
- Implement tool functions (read, append, export, search, etc.)
- Parameter validation
- Error handling with MCP error types
- Reuse existing utilities

**Exports:**
```javascript
export const tools = [
  {
    name: 'read_context',
    description: '...',
    inputSchema: { ... },
    handler: async (params) => { ... }
  },
  // ... more tools
];
```

**Dependencies:**
- `../utils/paths.js`
- `../utils/parser.js`
- `glob`

---

#### `src/mcp/prompts.js`
- Define prompt templates
- Variable substitution logic
- Pre-filled prompt generation

**Exports:**
```javascript
export const prompts = [
  {
    name: 'read_and_continue',
    description: '...',
    template: '...',
    variables: ['context'],
    handler: async (variables) => { ... }
  },
  // ... more prompts
];
```

**Dependencies:**
- `./resources.js` (for auto-filling variables)

---

#### `src/mcp/manager.js`
- High-level context management logic
- Session discovery and caching
- Search indexing for conversations
- File system abstraction

**Exports:**
```javascript
export class ContextManager {
  async readContext(workspace);
  async appendContext(workspace, content, title);
  async initContext(workspace, projectInfo);
  async exportConversation(sessionId, workspace, format);
  async searchConversations(query, options);
  async getSummary(workspace);
}
```

**Dependencies:**
- `../utils/paths.js`
- `../utils/parser.js`
- `chokidar`
- `glob`

---

### 4.3 Existing Files to Modify

No modifications to existing files are required. The MCP server will reuse:
- `src/utils/paths.js` - As-is for path resolution
- `src/utils/parser.js` - As-is for session parsing
- Package dependencies already installed

---

## 5. Configuration

### 5.1 VS Code Configuration

**File:** Users configure MCP servers in VS Code settings.

**Path:** `~/.vscode/settings.json` or workspace `.vscode/settings.json`

**Configuration:**
```json
{
  "mcp.servers": {
    "shared-copilot-context": {
      "command": "node",
      "args": [
        "/path/to/SharedCopilotContext/src/mcp-server.js"
      ],
      "env": {
        "WORKSPACE": "${workspaceFolder}"
      }
    }
  }
}
```

**Alternative (Global Installation):**
```json
{
  "mcp.servers": {
    "shared-copilot-context": {
      "command": "mcp-shared-context",
      "env": {
        "WORKSPACE": "${workspaceFolder}"
      }
    }
  }
}
```

**Setup Instructions:**
1. Open VS Code settings (Cmd+,)
2. Search for "MCP Servers"
3. Edit `settings.json` and add the above configuration
4. Replace `/path/to/SharedCopilotContext` with actual path
5. Reload VS Code
6. MCP server will start automatically when Copilot is invoked

---

### 5.2 Copilot CLI Configuration

**File:** `~/.copilot/mcp.json`

**Configuration:**
```json
{
  "mcpServers": {
    "shared-copilot-context": {
      "command": "node",
      "args": [
        "/path/to/SharedCopilotContext/src/mcp-server.js"
      ],
      "env": {
        "WORKSPACE": "${PWD}"
      }
    }
  }
}
```

**Alternative (Global Installation):**
```json
{
  "mcpServers": {
    "shared-copilot-context": {
      "command": "mcp-shared-context"
    }
  }
}
```

**Setup Instructions:**
1. Create `~/.copilot/` directory if it doesn't exist
2. Create or edit `mcp.json` file
3. Add the above configuration
4. Replace `/path/to/SharedCopilotContext` with actual path
5. Run `copilot` to start a session
6. MCP tools will be available automatically

**Verification:**
```bash
# In Copilot CLI session
/tools list
# Should show: read_context, append_context, export_conversation, etc.
```

---

### 5.3 Environment Variables

The MCP server supports these environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `WORKSPACE` | Workspace root path | `process.cwd()` |
| `LOG_LEVEL` | Logging verbosity (error, warn, info, debug) | `info` |
| `MCP_PORT` | HTTP/SSE port (if not using stdio) | N/A (stdio default) |
| `CONTEXT_FILE_NAME` | Name of context file | `context.md` |

---

## 6. Dependencies

### 6.1 New Dependencies

#### Primary Dependency: MCP SDK

**Package:** `@modelcontextprotocol/sdk`

**Version:** `^1.0.0` (or latest stable)

**Purpose:** Official Model Context Protocol SDK for Node.js

**Features:**
- JSON-RPC handler for MCP protocol
- stdio/SSE transport layers
- Type definitions for resources, tools, prompts
- Standard error handling

**Why This Choice:**
- Official implementation ensures compatibility
- Handles protocol details we don't want to reimplement
- Active maintenance by Anthropic/MCP community
- TypeScript support (even though we use JS, types help)

**Installation:**
```bash
npm install @modelcontextprotocol/sdk
```

---

### 6.2 Existing Dependencies (Already Installed)

These dependencies are already in `package.json` and will be reused:

| Package | Version | Usage in MCP Server |
|---------|---------|---------------------|
| `glob` | ^10.3.10 | Find chat session JSON files |
| `chokidar` | ^3.5.3 | Watch filesystem for changes, emit resource updates |
| `chalk` | ^5.3.0 | Terminal output formatting (logging) |
| `express` | ^4.18.2 | *Optional* HTTP/SSE transport (stdio is default) |

---

### 6.3 Optional Dependencies

#### For Enhanced Search

**Package:** `fuse.js` (fuzzy search library)

**Version:** `^7.0.0`

**Purpose:** Improve search quality in `search_conversations` tool

**Why Add:**
- Fast fuzzy searching without indexing complexity
- Scoring and ranking for relevance
- Works client-side (no database needed)

**When to Add:** Phase 3 initial implementation probably doesn't need this. Consider for Phase 4 polish if search quality is insufficient.

---

### 6.4 Development Dependencies

No additional dev dependencies needed. Use existing Node.js test runner.

---

## 7. Implementation Notes

### 7.1 Key Technical Considerations

#### Transport: stdio vs HTTP/SSE

**Decision:** Use stdio as default transport.

**Rationale:**
- Simpler deployment (no port management)
- Native support in VS Code and Copilot CLI
- Lower latency (no HTTP overhead)
- Automatic process lifecycle management

**Future Enhancement:** Add HTTP/SSE option for remote MCP server scenarios.

---

#### File Watching and Caching

**Challenge:** VS Code creates/modifies chat session JSON files frequently. Parsing all files on every request is expensive.

**Solution:**
- Use `chokidar` to watch `workspaceStorage/*/chatSessions/` directory
- Maintain in-memory cache of parsed sessions
- Invalidate cache on file change events
- Emit MCP resource updates when relevant files change

**Implementation Pattern:**
```javascript
import chokidar from 'chokidar';

const sessionCache = new Map();

const watcher = chokidar.watch(globPattern, {
  ignoreInitial: false,
  awaitWriteFinish: { stabilityThreshold: 500 }
});

watcher.on('add', filepath => updateCache(filepath));
watcher.on('change', filepath => updateCache(filepath));
watcher.on('unlink', filepath => sessionCache.delete(filepath));
```

---

#### Search Implementation

**Challenge:** Searching across many large JSON files efficiently.

**Simple Solution (Phase 3):**
- Load all sessions into memory on startup
- Use simple string matching (`.includes()` or regex)
- Rank by number of matches
- Return top N results

**Advanced Solution (Future):**
- Index sessions with inverted index or `fuse.js`
- Support Boolean queries (`AND`, `OR`, `NOT`)
- Weight recent conversations higher
- Use embeddings for semantic search (via MCP tool call to LLM)

**Recommendation:** Start simple, optimize later. Most users have <100 sessions.

---

#### Error Handling

**MCP Error Types:**
- `InvalidRequest` - Malformed request
- `MethodNotFound` - Unknown tool/resource
- `InvalidParams` - Bad parameters
- `InternalError` - Server-side error

**Design Pattern:**
```javascript
try {
  const result = await handler(params);
  return { content: [{ type: 'text', text: JSON.stringify(result) }] };
} catch (error) {
  if (error.code === 'ENOENT') {
    throw new McpError('InvalidParams', `File not found: ${error.path}`);
  }
  throw new McpError('InternalError', error.message);
}
```

---

#### Workspace Detection

**Challenge:** Determine which workspace context.md to use when multiple projects are open.

**Solution Options:**
1. **Environment Variable:** `WORKSPACE` env var passed by VS Code/CLI
2. **Tool Parameter:** `workspace` parameter in every tool call
3. **Auto-detect:** Search upward from CWD for `.git` or `package.json`

**Recommendation:** Combine approaches:
- Default to `WORKSPACE` env var if set
- Fall back to `workspace` parameter if provided
- Fall back to `process.cwd()` otherwise
- Implementer can add auto-detect in Phase 4 if needed

---

#### Concurrency and Locking

**Challenge:** Multiple agents might try to append to context.md simultaneously.

**Solution:**
- Node.js is single-threaded, so file writes are serialized within one process
- For true multi-process safety, use file locking library (`proper-lockfile`)
- **Recommendation:** Phase 3 doesn't need locking (single MCP server instance)
- Add locking in Phase 4 if multi-instance deployment is needed

---

### 7.2 Potential Challenges

#### Challenge 1: VS Code Session File Format Changes

**Risk:** VS Code might change the JSON schema for chat sessions in future versions.

**Mitigation:**
- Abstract parsing behind `parseChatSession()` in `parser.js`
- Add version detection to parser
- Handle unknown fields gracefully
- Add logging for unexpected structure

---

#### Challenge 2: Large Context Files

**Risk:** context.md grows to megabytes, slow to parse/transmit.

**Mitigation:**
- Add truncation option to `read_context` tool (e.g., "last N sessions only")
- Implement context rotation (archive old sessions)
- Add `context://current?range=last-5-sessions` query parameters

---

#### Challenge 3: Cross-Platform Path Issues

**Risk:** Path separators, symlinks, case sensitivity differ across platforms.

**Mitigation:**
- Always use `path.join()`, `path.resolve()` from Node.js
- Reuse `paths.js` utilities which already handle platform differences
- Test on Windows (WSL) and macOS

---

#### Challenge 4: MCP Protocol Evolution

**Risk:** MCP spec might change, breaking compatibility.

**Mitigation:**
- Pin `@modelcontextprotocol/sdk` to specific major version
- Monitor MCP changelog and test against new versions
- Implement protocol version negotiation if SDK supports it

---

### 7.3 Integration Points with Existing Code

#### Integration Point 1: `src/shared-context.js`

**Current Functionality:**
- CLI for init, read, append, summary

**MCP Integration:**
- MCP tools (`init_context`, `read_context`, `append_context`, `get_context_summary`) replicate this functionality
- **Reuse Strategy:** Extract shared logic into `src/mcp/manager.js`, import from both CLI and MCP server
- **Benefit:** DRY principle, consistent behavior

**Refactor Plan (Implementer Phase):**
1. Create `ContextManager` class in `manager.js`
2. Move file operations from `shared-context.js` to manager
3. Update `shared-context.js` to call `ContextManager` methods
4. Use same `ContextManager` in MCP tools

---

#### Integration Point 2: `src/copilot-menu.js`

**Current Functionality:**
- Interactive terminal menu for browsing sessions
- Export to context.md

**MCP Integration:**
- `export_conversation` tool provides programmatic version
- `search_conversations` tool enables automated discovery

**Reuse Strategy:**
- `copilot-menu.js` remains as standalone TUI tool
- MCP server uses same `parser.js` and `paths.js` utilities
- No direct code sharing needed

**Note:** Users can choose CLI menu OR MCP tools based on use case.

---

#### Integration Point 3: `src/utils/paths.js`

**Current Functionality:**
- Cross-platform path resolution
- VS Code storage location
- Context file location

**MCP Integration:**
- MCP server imports and uses directly
- **No changes needed**

---

#### Integration Point 4: `src/utils/parser.js`

**Current Functionality:**
- Parse VS Code chat session JSON
- Generate titles, summaries, export formats

**MCP Integration:**
- MCP resources and tools import and use directly
- **Possible Enhancement:** Add caching layer in `manager.js`
- **No changes to parser.js needed**

---

## 8. Testing Strategy

### 8.1 Unit Tests (Node.js Test Runner)

**Test Files:**
- `tests/mcp/protocol.test.js` - Protocol handler
- `tests/mcp/tools.test.js` - Individual tool functions
- `tests/mcp/resources.test.js` - Resource handlers
- `tests/mcp/manager.test.js` - Context management logic

**Approach:**
- Mock filesystem with temporary directories
- Mock MCP client requests (JSON-RPC)
- Test error cases (missing files, invalid params)

---

### 8.2 Integration Tests

**Test Scenarios:**
1. **Full MCP Server Lifecycle:**
   - Start server with stdio transport
   - Send `initialize` request
   - Call each tool with valid/invalid params
   - Request each resource
   - Graceful shutdown

2. **File System Integration:**
   - Watch for chat session changes
   - Emit resource updates
   - Concurrent read/write operations

3. **Cross-Platform:**
   - Run tests on macOS (primary)
   - Run tests on Windows (GitHub Actions or WSL)

---

### 8.3 Manual Testing with VS Code

**Steps:**
1. Configure MCP server in VS Code settings
2. Open a workspace with context.md
3. Invoke Copilot agent
4. Use prompts: `@agent read context and help me`
5. Verify agent can read context
6. Use tools: ask agent to "append a summary to context"
7. Verify context.md updated correctly

---

### 8.4 Manual Testing with Copilot CLI

**Steps:**
1. Configure MCP server in `~/.copilot/mcp.json`
2. Start Copilot CLI: `copilot`
3. List tools: `/tools list`
4. Verify our tools appear
5. Use tool: "Use read_context tool to show me the current context"
6. Verify response contains context.md content

---

## 9. Documentation Requirements

### 9.1 README.md Updates

Add new section:

```markdown
## Phase 3: MCP Server

The MCP server enables AI agents to access SharedCopilotContext features programmatically.

### Starting the MCP Server

```bash
node src/mcp-server.js
```

### Configuration

#### VS Code
Add to `.vscode/settings.json`:
```json
{
  "mcp.servers": {
    "shared-copilot-context": {
      "command": "node",
      "args": ["/path/to/SharedCopilotContext/src/mcp-server.js"]
    }
  }
}
```

#### Copilot CLI
Add to `~/.copilot/mcp.json`:
```json
{
  "mcpServers": {
    "shared-copilot-context": {
      "command": "node",
      "args": ["/path/to/SharedCopilotContext/src/mcp-server.js"]
    }
  }
}
```

### Available Tools

- `read_context` - Read context.md
- `append_context` - Append to context.md
- `export_conversation` - Export VS Code chat to context
- `search_conversations` - Search chat history
- `init_context` - Initialize context file
- `get_context_summary` - Get context statistics
```

---

### 9.2 New Document: MCP_SERVER.md

Create detailed MCP server documentation:
- Architecture overview
- Resource schemas
- Tool reference (parameters, returns, errors)
- Prompt templates
- Configuration examples
- Troubleshooting guide

---

### 9.3 JSDoc Comments

All MCP server functions must have JSDoc:

```javascript
/**
 * Read the current workspace's context.md file.
 * 
 * @param {Object} params - Tool parameters
 * @param {string} [params.workspace] - Workspace root path
 * @param {string} [params.format='markdown'] - Output format
 * @returns {Promise<Object>} Context content and metadata
 * @throws {McpError} If file not found or read error
 */
async function readContext(params) { ... }
```

---

## 10. Phased Implementation Plan

### Phase 3.1: Core MCP Server (Week 1)

**Scope:**
- Implement `mcp-server.js` with stdio transport
- Implement `protocol.js` with basic JSON-RPC handling
- Implement `manager.js` with ContextManager class
- Implement 2 core tools: `read_context`, `append_context`
- Implement 1 resource: `context://current`

**Deliverables:**
- Working MCP server that can be invoked from VS Code
- Basic read/write functionality

**Testing:**
- Unit tests for tools
- Manual test with VS Code

---

### Phase 3.2: Full Tool Set (Week 2)

**Scope:**
- Implement remaining tools: `init_context`, `export_conversation`, `search_conversations`, `get_context_summary`
- Implement remaining resources: `context://sessions`, `context://sessions/{id}`
- Add file watching with chokidar

**Deliverables:**
- Complete tool catalog
- All resources available
- Resource updates on file changes

**Testing:**
- Integration tests for all tools
- Manual test with Copilot CLI

---

### Phase 3.3: Prompts and Polish (Week 3)

**Scope:**
- Implement `prompts.js` with template system
- Add error handling and logging
- Add configuration validation
- Documentation (README, MCP_SERVER.md)

**Deliverables:**
- Prompt templates working
- Production-ready error handling
- Complete documentation

**Testing:**
- End-to-end tests
- Cross-platform validation

---

## 11. Success Criteria

The MCP server implementation is complete when:

- [ ] All 6 tools are implemented and tested
- [ ] All 3 resources are accessible
- [ ] Works with VS Code 1.109+ via MCP settings
- [ ] Works with Copilot CLI via MCP config
- [ ] File watching detects changes and emits updates
- [ ] Error cases handled gracefully with helpful messages
- [ ] Cross-platform (macOS, Windows, Linux)
- [ ] Documentation complete (README, MCP_SERVER.md, JSDoc)
- [ ] Unit tests for all tools/resources
- [ ] Integration tests pass
- [ ] Manual testing successful in both VS Code and CLI

---

## 12. Future Enhancements (Phase 4+)

### Copilot CLI Session Resume

The Copilot CLI provides session resume capability via `copilot --resume=<session-id>`. 

**Storage Location (Discovered 2026-02-05):**
```
~/.copilot/
├── config.json                          # CLI preferences
├── command-history-state.json           # Recent prompts
├── logs/                                 # Debug logs
└── session-state/
    └── <uuid>/
        ├── workspace.yaml               # Session metadata
        ├── checkpoints/index.md         # Conversation checkpoints
        └── files/                        # Modified files
```

**workspace.yaml Schema:**
```yaml
id: 1d44caae-6d97-4e1b-bc6a-54ba9886b0de
cwd: /path/to/workspace
summary: "Optional session summary"
summary_count: 0
created_at: 2026-02-05T01:11:09.387Z
updated_at: 2026-02-05T01:11:09.414Z
git_root: /path/to/workspace
repository: owner/repo
branch: main
```

**Integration opportunities:**
- **`context://cli-sessions` resource** - Parse `~/.copilot/session-state/*/workspace.yaml`
- **`get_resume_command` tool** - Return `copilot --resume=<id>` for workspace match
- **Cross-machine:** Sessions on remote hosts (e.g., star-force-two via SSH) at same path

Example workflow:
```bash
# CLI session ends with: "Resume this session with copilot --resume=0cffe71b-..."
# MCP tool reads ~/.copilot/session-state/0cffe71b.../workspace.yaml
# Later: get_resume_command returns the command for that workspace
```

### Copilot Memory Bridge

Export/import between local context.md and VS Code's cloud-based Copilot Memory:
- `export_to_memory` tool
- `import_from_memory` tool

### Semantic Search

Use embeddings for smarter conversation search:
- Generate embeddings for each session
- Store in local vector DB (e.g., better-sqlite3 + vectors)
- Search by semantic similarity

### Multi-Workspace Support

Manage context across multiple projects:
- `context://workspaces` resource listing all known workspaces
- `switch_workspace` tool
- Shared global context file

### HTTP/SSE Transport

Enable remote MCP server:
- Add HTTP/SSE transport option
- Secure with API keys or OAuth
- Deploy to cloud for team sharing

### Agent Skill Package

Create `.github/skills/context-sharing/SKILL.md`:
- Teach agents best practices for using context
- Include example workflows
- Package as reusable skill

---

## 13. Open Questions for User/Orchestrator

1. **Workspace Detection:** Should we support auto-detecting workspace root (search for .git), or always require explicit configuration?

2. **Session IDs:** Should session IDs be hashes of file paths or something more user-friendly (e.g., "session-2026-02-04-001")?

3. **Search Complexity:** Start with simple string matching or invest in `fuse.js` from the beginning?

4. **Logging:** Should logs go to stderr (for stdio transport) or a log file?

5. **Global Installation:** Should we support `npm install -g` and add `mcp-shared-context` binary to package.json?

---

## Appendix A: MCP Protocol Primer

### What is MCP?

Model Context Protocol (MCP) is an open standard for connecting AI agents to external data and tools. It defines a JSON-RPC based protocol over stdio or HTTP/SSE.

### Key Concepts

- **Server:** Exposes resources and tools
- **Client:** AI agent (VS Code Copilot, Claude App, custom tools)
- **Resources:** Named data sources (like files or APIs)
- **Tools:** Actions the agent can invoke (like functions)
- **Prompts:** Pre-configured prompt templates

### Protocol Flow

```
Client                    Server
  |                         |
  |--- initialize --------->|
  |<--- initialized --------|
  |                         |
  |--- resources/list ----->|
  |<--- [resource list] ----|
  |                         |
  |--- tools/list --------->|
  |<--- [tool list] --------|
  |                         |
  |--- tools/call --------->|
  |    (with params)        |
  |<--- [result] -----------|
  |                         |
  |--- notifications ------>|
  |    (resource changed)   |
```

### Transport: stdio

- Server communicates via stdin/stdout
- Each message is a JSON line
- Client spawns server as subprocess
- Automatic lifecycle management

---

## Appendix B: Example MCP Tool Call

### Request (from AI agent to server)

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "read_context",
    "arguments": {
      "workspace": "/Users/merlin/Workspace/myproject"
    }
  }
}
```

### Response (from server to agent)

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"content\":\"# Shared Copilot Context\\n\\n...\",\"metadata\":{\"path\":\"/Users/merlin/Workspace/myproject/context.md\",\"size\":1024,\"lastModified\":\"2026-02-04T20:00:00Z\",\"sessionCount\":5}}"
      }
    ]
  }
}
```

---

## Appendix C: Reference Implementation Structure

### Minimal mcp-server.js

```javascript
#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { resources } from './mcp/resources.js';
import { tools } from './mcp/tools.js';
import { prompts } from './mcp/prompts.js';

async function main() {
  const server = new Server({
    name: 'shared-copilot-context',
    version: '1.0.0'
  }, {
    capabilities: {
      resources: {},
      tools: {},
      prompts: {}
    }
  });

  // Register resources
  for (const resource of resources) {
    server.setRequestHandler('resources/read', resource.handler);
  }

  // Register tools
  for (const tool of tools) {
    server.setRequestHandler('tools/call', tool.handler);
  }

  // Register prompts
  for (const prompt of prompts) {
    server.setRequestHandler('prompts/get', prompt.handler);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error('MCP server started'); // stderr for logging
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
```

---

**End of Design Specification**

---

## Document Metadata

- **Author:** Architect Agent (@Architect)
- **Date:** February 4, 2026
- **Version:** 1.0
- **Status:** Ready for Implementation
- **Next Step:** Hand off to Implementer (@Implementer) for Phase 3.1 implementation

---
