# Shared Context MCP Usage Skill

**Version:** 1.0.0

## Overview

This skill teaches proper usage patterns for the SharedCopilotContext MCP server.

## MCP Server Configuration

Add to VS Code settings (`.vscode/settings.json` or user settings):

```json
{
  "mcp": {
    "servers": {
      "shared-context": {
        "command": "node",
        "args": ["./src/mcp-server.js"],
        "cwd": "${workspaceFolder}"
      }
    }
  }
}
```

## Tool Usage Patterns

### Starting a Session

1. Read current context to understand project state
2. Check for any pending tasks or blockers
3. Update context with your session start

```javascript
// 1. Read current state
await tools.read_context({});

// 2. Append session start
await tools.append_context({
  content: `## Session Started: ${new Date().toISOString()}\nObjective: [task description]`,
  section: "sessions"
});
```

### During Work

Update context at major milestones:

```javascript
await tools.append_context({
  content: `- [${new Date().toISOString()}] Completed: [milestone description]`,
  section: "progress"
});
```

### Ending a Session

Summarize what was accomplished:

```javascript
await tools.append_context({
  content: `## Session Ended: ${new Date().toISOString()}
### Completed
- Item 1
- Item 2

### Next Steps
- Task 1
- Task 2`,
  section: "sessions"
});
```

## Accessing Copilot History

### List Available Sessions

```javascript
// Use the sessions resource
const sessions = await resources.read("context://sessions");
```

### Export a Session

```javascript
await tools.export_conversation({
  sessionId: "session-uuid-here",
  format: "markdown"
});
```

### Search History

```javascript
const results = await tools.search_conversations({
  query: "implementation of feature X"
});
```

## Integration with COMMS

When working in the Star Force constellation, combine context updates with COMMS:

```javascript
// Update local context
await tools.append_context({ content: "Deployed service X" });

// Broadcast to COMMS
await tools.send_message({
  content: "✅ Deployed service X, context updated",
  message_type: "status"
});
```

## Prompt Templates

### read_and_continue

Use when resuming work on a project:
- Reads current context
- Summarizes recent activity
- Identifies next logical steps

### summarize_and_save

Use when context is getting long:
- Summarizes current state
- Archives old details
- Saves condensed version
